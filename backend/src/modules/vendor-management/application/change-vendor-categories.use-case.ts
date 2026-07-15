// Use case — ChangeVendorCategories (US-042 / BE-003).
// Flujo (Tech Spec §7):
//  1. Recupera snapshot activo con categorías (deleted_at IS NULL). Si no existe → 404.
//  2. Bloquea con 409 PROFILE_HIDDEN cuando status='hidden'.
//  3. Compara set actual vs deseado — si son iguales, emite `vendor.category.noop` y retorna
//     `{ noop: true }` sin side-effects (D5).
//  4. Si `category_change_count >= 5` → 409 CATEGORY_CHANGE_LIMIT (D1) + log warn.
//  5. Valida catálogo con `ServiceCategoryLookup.findByIds`. Faltantes o inactivas →
//     400 INVALID_CATEGORY con `details.unknown_or_inactive[]` (EC-05).
//  6. Abre `prisma.$transaction`:
//     a. `SELECT ... FOR UPDATE` sobre la fila para evitar TOCTOU.
//     b. Revalida contador dentro del lock (defensa en profundidad).
//     c. `replaceCategoriesAndAdvanceCounter` (delete/insert diff + increment + flag + timestamp).
//     d. Si status ∈ {approved, rejected} → transición a pending (D3) y `repending=true`.
//     e. Insert `AdminAction(action='vendor_category_change')` — mismo tx, rollback en error.
//  7. Emite log `vendor.category.changed` con `before`/`after` (D2 / audit).
//  8. Retorna la vista completa + flags para el response.

import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { AdminActionWritePort } from '../ports/admin-action-write.port.js';
import type {
  ServiceCategoryLookup,
  VendorProfileRepository,
} from '../ports/vendor-profile.repository.js';
import type { VendorProfileEventLogger } from './vendor-profile-event-logger.js';
import type { VendorProfileStatus, VendorProfileView } from '../domain/vendor-profile.js';
import {
  CategoryChangeLimitError,
  InvalidCategoryError,
  VendorProfileHiddenError,
  VendorProfileNotFoundError,
} from '../domain/vendor-profile.errors.js';
import { setEquals } from '../domain/set-equals.js';

/** Acción canónica que emite este use case en `admin_actions.action`. */
export const CATEGORY_CHANGE_ADMIN_ACTION = 'vendor_category_change';
/** Entidad target consistente con US-041 (`vendor_pending_after_major_edit`). */
export const CATEGORY_CHANGE_TARGET_ENTITY = 'VendorProfile';
/** Tope acumulado de cambios de categorías por perfil (D1 / C-022b). */
export const CATEGORY_CHANGE_MAX = 5;

export interface ChangeVendorCategoriesCommand {
  vendorUserId: string;
  serviceCategoryIds: string[];
}

export interface ChangeVendorCategoriesContext {
  correlationId?: string;
}

export interface ChangeVendorCategoriesResult {
  profile: VendorProfileView;
  noop: boolean;
  repending: boolean;
  categoryChangeCount: number;
  requiresAdminReview: boolean;
  lastCategoryChangeAt: Date | null;
  previousStatus: VendorProfileStatus;
  newStatus: VendorProfileStatus;
}

export class ChangeVendorCategoriesUseCase {
  constructor(
    private readonly repo: VendorProfileRepository,
    private readonly serviceCategories: ServiceCategoryLookup,
    private readonly adminActions: AdminActionWritePort,
    private readonly clock: ClockPort,
    private readonly events: VendorProfileEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    cmd: ChangeVendorCategoriesCommand,
    ctx: ChangeVendorCategoriesContext = {},
  ): Promise<ChangeVendorCategoriesResult> {
    const started = this.clock.now().getTime();
    const snapshot = await this.repo.findActiveWithCategoriesByVendorUserId(cmd.vendorUserId);
    if (!snapshot) throw new VendorProfileNotFoundError();

    if (snapshot.status === 'hidden') throw new VendorProfileHiddenError();

    const desiredSet = new Set(cmd.serviceCategoryIds);
    const currentSet = new Set(snapshot.categoryIds);

    if (setEquals(desiredSet, currentSet)) {
      this.events.emitCategoryNoop({
        correlationId: ctx.correlationId,
        vendorProfileId: snapshot.id,
        vendorUserId: snapshot.vendorUserId,
        categoryIds: [...currentSet].sort(),
      });
      const view = await this.repo.findByIdWithCategories(snapshot.id);
      if (!view) throw new VendorProfileNotFoundError();
      return {
        profile: view,
        noop: true,
        repending: false,
        categoryChangeCount: snapshot.categoryChangeCount,
        requiresAdminReview: snapshot.requiresAdminReview,
        lastCategoryChangeAt: snapshot.lastCategoryChangeAt,
        previousStatus: snapshot.status,
        newStatus: snapshot.status,
      };
    }

    if (snapshot.categoryChangeCount >= CATEGORY_CHANGE_MAX) {
      this.events.emitCategoryLimitReached({
        correlationId: ctx.correlationId,
        vendorProfileId: snapshot.id,
        vendorUserId: snapshot.vendorUserId,
        categoryChangeCount: snapshot.categoryChangeCount,
      });
      throw new CategoryChangeLimitError();
    }

    const desiredIds = [...desiredSet];
    const catalog = await this.serviceCategories.findByIds(desiredIds);
    const foundById = new Map(catalog.map((c) => [c.id, c.isActive] as const));
    const unknownOrInactive = desiredIds.filter((id) => foundById.get(id) !== true);
    if (unknownOrInactive.length > 0) {
      throw new InvalidCategoryError(unknownOrInactive);
    }

    const previousStatus = snapshot.status;
    const willRepend = previousStatus === 'approved' || previousStatus === 'rejected';

    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await this.repo.lockAndRereadForCategoryChange(snapshot.id, tx);
      if (!locked) throw new VendorProfileNotFoundError();
      if (locked.status === 'hidden') throw new VendorProfileHiddenError();
      if (locked.categoryChangeCount >= CATEGORY_CHANGE_MAX) {
        throw new CategoryChangeLimitError();
      }

      const replacement = await this.repo.replaceCategoriesAndAdvanceCounter({
        vendorProfileId: locked.id,
        currentCategoryIds: locked.categoryIds,
        desiredCategoryIds: desiredIds,
        tx,
      });

      if (willRepend) {
        await this.repo.updateStatus(locked.id, 'pending', tx);
      }

      await this.adminActions.create(
        {
          action: CATEGORY_CHANGE_ADMIN_ACTION,
          targetEntity: CATEGORY_CHANGE_TARGET_ENTITY,
          targetId: locked.id,
          actorUserId: locked.vendorUserId,
          actorRole: 'vendor',
          correlationId: ctx.correlationId ?? null,
          metadata: {
            previous_status: locked.status,
            new_status: willRepend ? 'pending' : locked.status,
            categories_before: locked.categoryIds,
            categories_after: desiredIds.slice().sort(),
            category_change_count_after: replacement.categoryChangeCount,
          },
        },
        tx,
      );

      return replacement;
    });

    const refreshed = await this.repo.findByIdWithCategories(snapshot.id);
    if (!refreshed) throw new VendorProfileNotFoundError();

    const newStatus: VendorProfileStatus = willRepend ? 'pending' : previousStatus;

    this.events.emitCategoryChanged({
      correlationId: ctx.correlationId,
      vendorProfileId: snapshot.id,
      vendorUserId: snapshot.vendorUserId,
      before: [...currentSet].sort(),
      after: desiredIds.slice().sort(),
      categoryChangeCountAfter: result.categoryChangeCount,
      repending: willRepend,
      previousStatus,
      newStatus,
      durationMs: this.clock.now().getTime() - started,
    });

    return {
      profile: refreshed,
      noop: false,
      repending: willRepend,
      categoryChangeCount: result.categoryChangeCount,
      requiresAdminReview: result.requiresAdminReview,
      lastCategoryChangeAt: result.lastCategoryChangeAt,
      previousStatus,
      newStatus,
    };
  }
}
