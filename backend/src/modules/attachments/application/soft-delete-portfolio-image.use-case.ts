// Use case — SoftDeletePortfolioImageUseCase (US-048 / PB-P1-026 / BE-003).
// Flujo autoritativo (Tech Spec §7):
//  1. Resuelve vendor_profile activo por vendor_user_id; null/deleted → 404 uniforme.
//  2. status='hidden' → 409 PROFILE_HIDDEN.
//  3. Repository resuelve attachment sólo si es del vendor y `status='active'`; caso contrario
//     → 404 ATTACHMENT_NOT_FOUND (D4: uniforme para ajeno/inexistente/ya-borrado).
//  4. UPDATE condicional `WHERE status='active'` (TOCTOU-safe). Si count=0 → 404 (carrera).
//  5. Emite log `vendor.portfolio.deleted` con `correlation_id`.
//
// La validación del path param (UUID) y del body (`deletion_reason`) vive aguas arriba
// (`validateRequestMiddleware`). El use case recibe input ya validado.
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import {
  AttachmentNotFoundError,
  PortfolioProfileHiddenError,
  PortfolioProfileNotFoundError,
} from '../domain/attachment.errors.js';
import type {
  AttachmentRepository,
  VendorProfileForPortfolioReader,
} from '../ports/attachment.repository.js';
import type { PortfolioEventLogger } from './portfolio-event-logger.js';

export interface SoftDeletePortfolioImageCommand {
  vendorUserId: string;
  imageId: string;
  deletionReason: string | null;
}

export interface SoftDeletePortfolioImageContext {
  correlationId?: string;
}

export class SoftDeletePortfolioImageUseCase {
  constructor(
    private readonly attachments: AttachmentRepository,
    private readonly vendors: VendorProfileForPortfolioReader,
    private readonly events: PortfolioEventLogger,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    cmd: SoftDeletePortfolioImageCommand,
    ctx: SoftDeletePortfolioImageContext = {},
  ): Promise<void> {
    const started = this.clock.now().getTime();

    const vendor = await this.vendors.findActiveByVendorUserId(cmd.vendorUserId);
    if (vendor === null) {
      throw new PortfolioProfileNotFoundError();
    }
    if (vendor.status === 'hidden') {
      throw new PortfolioProfileHiddenError();
    }

    const attachment = await this.attachments.findActiveOwnedByIdAndVendor(
      cmd.imageId,
      vendor.id,
    );
    if (attachment === null) {
      throw new AttachmentNotFoundError();
    }

    const applied = await this.attachments.softDeleteByIdOwned({
      id: attachment.id,
      ownerId: vendor.id,
      deletedBy: cmd.vendorUserId,
      deletionReason: cmd.deletionReason,
    });
    // `applied=false` sólo ocurre bajo carrera (otro request ya soft-deleted entre el find y
    // el update). Se preserva el 404 uniforme (D4) para no revelar el evento intermedio.
    if (!applied) {
      throw new AttachmentNotFoundError();
    }

    this.events.emitDeleted({
      correlationId: ctx.correlationId,
      vendorProfileId: vendor.id,
      vendorUserId: cmd.vendorUserId,
      attachmentId: attachment.id,
      workLabel: attachment.workLabel,
      deletionReason: cmd.deletionReason,
      durationMs: this.clock.now().getTime() - started,
    });
  }
}
