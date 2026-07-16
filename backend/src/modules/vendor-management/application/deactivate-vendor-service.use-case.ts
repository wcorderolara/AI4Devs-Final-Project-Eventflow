// Use case — Desactivar VendorService (US-044 / BE-006, AC-01c, EC-08/09).
// Idempotente: `204` incluso si el servicio ya está inactivo (D-EC-09). El log de transición
// (`vendor.service.deactivated`) SÓLO se emite cuando efectivamente hubo un cambio active→inactive.
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { VendorProfileRepository } from '../ports/vendor-profile.repository.js';
import type { VendorServiceRepository } from '../ports/vendor-service.repository.js';
import type { VendorServiceEventLogger } from './vendor-service-event-logger.js';
import { VendorServiceNotFoundError } from '../domain/vendor-service.errors.js';
import { ensureVendorServiceCrudAllowed } from './vendor-service-policy.js';

export interface DeactivateVendorServiceCommand {
  vendorUserId: string;
  serviceId: string;
}

export interface DeactivateVendorServiceContext {
  correlationId?: string;
}

export interface DeactivateVendorServiceResult {
  transitioned: boolean;
}

export class DeactivateVendorServiceUseCase {
  constructor(
    private readonly profileRepo: VendorProfileRepository,
    private readonly serviceRepo: VendorServiceRepository,
    private readonly clock: ClockPort,
    private readonly events: VendorServiceEventLogger,
  ) {}

  async execute(
    cmd: DeactivateVendorServiceCommand,
    ctx: DeactivateVendorServiceContext = {},
  ): Promise<DeactivateVendorServiceResult> {
    const started = this.clock.now().getTime();

    const profile = await this.profileRepo.findEditableByVendorUserId(cmd.vendorUserId);
    ensureVendorServiceCrudAllowed(profile);

    const result = await this.serviceRepo.softDeactivate(cmd.serviceId, profile.id);
    if (result === null) throw new VendorServiceNotFoundError();

    if (result.transitioned) {
      this.events.emitDeactivated({
        correlationId: ctx.correlationId,
        vendorProfileId: profile.id,
        vendorUserId: profile.vendorUserId,
        vendorServiceId: cmd.serviceId,
        durationMs: this.clock.now().getTime() - started,
      });
    }

    return { transitioned: result.transitioned };
  }
}
