// CreateServiceCategoryUseCase (US-075 / BE-004). Tech Spec §7. AC-01/AC-02 + EC-01/EC-05/EC-06.
//
// POST /api/v1/admin/service-categories → 201 con `{ category }` + AdminAction append-only.
// Toda la lógica en un `prisma.$transaction` (Decisión PO D7): validar → insertar categoría →
// insertar AdminAction. NO hay chain audit inverso en `service_categories` (no existe
// `admin_action_id` columna) porque el catálogo es "cold" — a diferencia de VendorProfile/
// Review, no requiere leer el último acto sin JOIN a `admin_actions`. Los admins consultan
// el historial vía `admin_actions.target_entity='service_category'`.
//
// Invariantes:
//   1. `es-LATAM` requerido en `name_i18n` → `INVALID_NAME_I18N` (VR-03 / EC-05).
//   2. Si `parent_id` provisto:
//        a. Debe existir (soft-deleted incluido no aplica: FK apunta a filas vivas por
//           `deleted_at IS NULL` implícito — el catálogo solo hace soft delete vía
//           `is_active=false`, no `deleted_at`).
//        b. Debe tener `parent_id === null` (Decisión PO D4). Si no, `INVALID_HIERARCHY_DEPTH`.
//   3. `code` único → detección eager con SELECT antes del INSERT para producir
//      `DUPLICATE_CODE` (patrón US-040) en lugar de exponer P2002 crudo.
//
// Denormalización de `label`: se puebla desde `name_i18n['es-LATAM']` para compat con
// callers legacy (VendorService, EventTask, Quote) que proyectan `label` directo. Sin esta
// denormalización, esos consumers necesitarían leer `name_i18n` y resolver locale — cambio
// de scope no autorizado. Idéntico criterio para `description` desde `description_i18n`.
import { Prisma, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  DuplicateCategoryCodeError,
  InvalidHierarchyDepthError,
  InvalidNameI18nError,
  InvalidParentIdError,
} from '../domain/us075.errors.js';
import type { CreateServiceCategoryBody as CreateBodyFromDto } from '../interface/service-category.dto.js';
import { toServiceCategoryView, type ServiceCategoryView } from './service-category.view.js';

/**
 * Tipo de entrada del UseCase. Deriva del DTO Zod pero re-declara `sort_order` como
 * opcional para que el `.default(0)` del schema no obligue a los callers (tests, seed,
 * fixtures) a pasarlo explícitamente. El UseCase aplica `?? 0` internamente.
 */
export type CreateServiceCategoryBody = Omit<CreateBodyFromDto, 'sort_order'> & {
  sort_order?: number;
};

export interface CreateServiceCategoryCtx {
  correlationId?: string;
}

export class CreateServiceCategoryUseCase {
  constructor(
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    body: CreateServiceCategoryBody,
    ctx: CreateServiceCategoryCtx = {},
  ): Promise<ServiceCategoryView> {
    assertNameI18nHasEsLatam(body.name_i18n);

    return this.prisma.$transaction(async (tx) => {
      // 1) Validación jerarquía + parent existente (Decisión PO D4).
      let depthLevel = 1;
      if (body.parent_id !== null && body.parent_id !== undefined) {
        const parent = await tx.serviceCategory.findUnique({
          where: { id: body.parent_id },
          select: { id: true, parentId: true },
        });
        if (!parent) throw new InvalidParentIdError();
        if (parent.parentId !== null) throw new InvalidHierarchyDepthError();
        depthLevel = 2;
      }

      // 2) Detección eager de código duplicado (EC-06 / VR-02). El UNIQUE de BD sigue
      // siendo la última línea de defensa (P2002 → mapping por `DuplicateCategoryCodeError`).
      const dup = await tx.serviceCategory.findUnique({
        where: { code: body.code },
        select: { id: true },
      });
      if (dup) throw new DuplicateCategoryCodeError();

      // 3) INSERT categoría — `label` y `description` denormalizados desde i18n['es-LATAM'].
      const esLatamName = (body.name_i18n as Record<string, string>)['es-LATAM']!;
      const esLatamDesc = (body.description_i18n as Record<string, string> | undefined)?.['es-LATAM'];
      const created = await tx.serviceCategory.create({
        data: {
          code: body.code,
          label: esLatamName,
          description: esLatamDesc ?? null,
          nameI18n: body.name_i18n as Prisma.InputJsonObject,
          descriptionI18n: body.description_i18n
            ? (body.description_i18n as Prisma.InputJsonObject)
            : undefined,
          parentId: body.parent_id ?? null,
          sortOrder: body.sort_order ?? 0,
          depthLevel,
          isActive: true,
        },
      });

      // 4) INSERT AdminAction append-only (Decisión PO D7; BR-ADMIN-011). `metadata` guarda
      // snapshot mínimo — sin FKs cross-domain a `service_categories.admin_action_id`.
      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: currentUserId,
          action: 'create',
          targetEntity: 'service_category',
          targetId: created.id,
          metadata: {
            correlationId: ctx.correlationId ?? null,
            reason: body.reason ?? null,
            snapshot: {
              code: created.code,
              parent_id: created.parentId,
              sort_order: created.sortOrder,
              depth_level: created.depthLevel,
              name_i18n: body.name_i18n,
              description_i18n: body.description_i18n ?? null,
            },
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      this.logger.emit('service_category.created', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        adminUserId: currentUserId,
        serviceCategoryId: created.id,
        code: created.code,
        parentId: created.parentId,
        adminActionId: adminAction.id,
      });

      return toServiceCategoryView(created);
    });
  }
}

/** Invariante D3/VR-03 — separado para reuso en `Update`. */
export function assertNameI18nHasEsLatam(nameI18n: Record<string, unknown> | undefined): void {
  if (!nameI18n || typeof nameI18n !== 'object') throw new InvalidNameI18nError();
  const val = (nameI18n as Record<string, unknown>)['es-LATAM'];
  if (typeof val !== 'string' || val.trim().length === 0) {
    throw new InvalidNameI18nError();
  }
}
