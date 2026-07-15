// Use case — UpdateVendorProfile (US-041 / BE-004).
// Flujo (Tech Spec §7):
//  1. Recupera snapshot editable del vendor (deleted_at IS NULL). Si no existe → 404.
//  2. Bloquea PATCH cuando status ∈ {rejected, hidden} (409 tipado).
//  3. Si el body incluye `location_id`, verifica que la ubicación exista y esté activa.
//  4. Detecta si el body toca "campos mayores" (D1) — `business_name`, `location_id`.
//  5. Dentro de `prisma.$transaction`:
//     a. Aplica el patch.
//     b. Si major && status='approved' → status='pending' + AdminAction
//        `vendor_pending_after_major_edit` (D2). Marca `repending=true`.
//  6. Emite log `vendor.profile.updated` (siempre) + `vendor.profile.repending` (si aplica).
//  7. Retorna la vista actualizada + flag `repending`.
//
// La validación de shape (opcionalidad, `.strict`, `.refine` body no vacío) queda cubierta por Zod
// aguas arriba (US-041 / BE-001).
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { ValidationError } from '../../../shared/domain/errors/validation.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';
import type { LocationReader, VendorProfileRepository } from '../ports/vendor-profile.repository.js';
import type { AdminActionWritePort } from '../ports/admin-action-write.port.js';
import type { VendorProfileEventLogger } from './vendor-profile-event-logger.js';
import type { UpdateVendorProfileRequest } from '../interface/dto/update-vendor-profile.request.js';
import { hasMajorField, MAJOR_UPDATE_FIELDS } from '../interface/dto/update-vendor-profile.request.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type { PrismaClient } from '@prisma/client';
import {
  VendorProfileHiddenError,
  VendorProfileNotFoundError,
  VendorProfileRejectedError,
} from '../domain/vendor-profile.errors.js';
import type { VendorProfileStatus, VendorProfileView } from '../domain/vendor-profile.js';

export const REPENDING_ADMIN_ACTION = 'vendor_pending_after_major_edit';
export const ADMIN_ACTION_TARGET_ENTITY = 'VendorProfile';

export interface UpdateVendorProfileCommand {
  vendorUserId: string;
  body: UpdateVendorProfileRequest;
}

export interface UpdateVendorProfileContext {
  correlationId?: string;
}

export interface UpdateVendorProfileResult {
  profile: VendorProfileView;
  repending: boolean;
}

export class UpdateVendorProfileUseCase {
  constructor(
    private readonly repo: VendorProfileRepository,
    private readonly locations: LocationReader,
    private readonly adminActions: AdminActionWritePort,
    private readonly clock: ClockPort,
    private readonly events: VendorProfileEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    cmd: UpdateVendorProfileCommand,
    ctx: UpdateVendorProfileContext = {},
  ): Promise<UpdateVendorProfileResult> {
    const started = this.clock.now().getTime();
    const snapshot = await this.repo.findEditableByVendorUserId(cmd.vendorUserId);
    if (!snapshot) throw new VendorProfileNotFoundError();

    ensureEditable(snapshot.status);

    if (cmd.body.location_id !== undefined) {
      if (!(await this.locations.existsActive(cmd.body.location_id))) {
        throw new ValidationError('Location is not available', [
          { field: 'location_id', message: ErrorCodes.INVALID_VALUE },
        ]);
      }
    }

    const major = hasMajorField(cmd.body);
    const willRepend = major && snapshot.status === 'approved';
    const previousStatus = snapshot.status;

    await this.prisma.$transaction(async (tx) => {
      await this.repo.update(
        snapshot.id,
        {
          businessName: cmd.body.business_name,
          bio: cmd.body.bio,
          locationId: cmd.body.location_id,
          languagesSupported: cmd.body.languages_supported,
        },
        tx,
      );

      if (willRepend) {
        await this.repo.updateStatus(snapshot.id, 'pending', tx);
        await this.adminActions.create(
          {
            action: REPENDING_ADMIN_ACTION,
            targetEntity: ADMIN_ACTION_TARGET_ENTITY,
            targetId: snapshot.id,
            actorUserId: cmd.vendorUserId,
            actorRole: 'vendor',
            correlationId: ctx.correlationId ?? null,
            metadata: {
              previous_status: previousStatus,
              major_fields_present: MAJOR_UPDATE_FIELDS.filter((k) => k in cmd.body),
            },
          },
          tx,
        );
      }
    });

    const refreshed = await this.repo.findByIdWithCategories(snapshot.id);
    if (!refreshed) throw new VendorProfileNotFoundError();

    const fieldsUpdated = Object.keys(cmd.body);
    this.events.emitProfileUpdated(refreshed, {
      correlationId: ctx.correlationId,
      durationMs: this.clock.now().getTime() - started,
      fieldsUpdated,
      repending: willRepend,
    });
    if (willRepend) {
      this.events.emitProfileRepending(refreshed, {
        correlationId: ctx.correlationId,
        previousStatus,
      });
    }

    return { profile: refreshed, repending: willRepend };
  }
}

function ensureEditable(status: VendorProfileStatus): void {
  if (status === 'rejected') throw new VendorProfileRejectedError();
  if (status === 'hidden') throw new VendorProfileHiddenError();
}
