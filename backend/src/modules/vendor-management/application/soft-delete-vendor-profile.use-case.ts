// Use case — SoftDeleteVendorProfile (US-041 / BE-005).
// AC-05 / D4. El DELETE es idempotente-friendly: si el perfil ya fue soft-deleted, se responde
// 409 `PROFILE_DELETED` (EC-05). En `hidden` se bloquea (D3, EC-04). En `pending/approved/rejected`
// se permite y setea `deleted_at`, `deleted_by`.
import type { VendorProfileRepository } from '../ports/vendor-profile.repository.js';
import type { VendorProfileEventLogger } from './vendor-profile-event-logger.js';
import {
  VendorProfileAlreadyDeletedError,
  VendorProfileHiddenError,
  VendorProfileNotFoundError,
} from '../domain/vendor-profile.errors.js';

export interface SoftDeleteVendorProfileCommand {
  vendorUserId: string;
}

export interface SoftDeleteVendorProfileContext {
  correlationId?: string;
}

export class SoftDeleteVendorProfileUseCase {
  constructor(
    private readonly repo: VendorProfileRepository,
    private readonly events: VendorProfileEventLogger,
  ) {}

  async execute(
    cmd: SoftDeleteVendorProfileCommand,
    ctx: SoftDeleteVendorProfileContext = {},
  ): Promise<void> {
    // `findAnyByVendorUserId` incluye perfiles soft-deleted; permite diferenciar 404 vs 409.
    const snapshot = await this.repo.findAnyByVendorUserId(cmd.vendorUserId);
    if (!snapshot) throw new VendorProfileNotFoundError();
    if (snapshot.deletedAt !== null) throw new VendorProfileAlreadyDeletedError();
    if (snapshot.status === 'hidden') throw new VendorProfileHiddenError();

    await this.repo.softDelete(snapshot.id, cmd.vendorUserId);

    this.events.emitProfileSoftDeleted(
      { vendorProfileId: snapshot.id, vendorUserId: snapshot.vendorUserId },
      {
        correlationId: ctx.correlationId,
        deletedBy: cmd.vendorUserId,
        previousStatus: snapshot.status,
      },
    );
  }
}
