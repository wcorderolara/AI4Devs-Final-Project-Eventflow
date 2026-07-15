// Use case — Editar VendorService (US-044 / BE-005, AC-01b, EC-04/08).
// Flujo:
//  1. Snapshot activo del vendor → política D1.
//  2. `findOwnedById(id, vendorProfileId)` → si null, 404 SERVICE_NOT_FOUND.
//  3. Si el body cambia `service_category_id`, validar categoría activa (400 INVALID_CATEGORY).
//  4. Si body incluye `is_active=true` Y el servicio actual está inactivo → recheck tope (D5).
//  5. UPDATE campos provistos.
//  6. Log `vendor.service.updated` con `fields_updated[]` y `reactivated`.
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type {
  ServiceCategoryLookup,
  VendorProfileRepository,
} from '../ports/vendor-profile.repository.js';
import type { VendorServiceRepository } from '../ports/vendor-service.repository.js';
import type { VendorServiceEventLogger } from './vendor-service-event-logger.js';
import type { UpdateVendorServiceRequest } from '../interface/dto/update-vendor-service.request.js';
import { InvalidCategoryError } from '../domain/vendor-profile.errors.js';
import {
  VendorServiceLimitReachedError,
  VendorServiceNotFoundError,
} from '../domain/vendor-service.errors.js';
import { ensureVendorServiceCrudAllowed } from './vendor-service-policy.js';
import {
  VENDOR_SERVICE_ACTIVE_LIMIT,
  type VendorServiceCurrencyCode,
  type VendorServiceView,
} from '../domain/vendor-service.js';

export interface UpdateVendorServiceCommand {
  vendorUserId: string;
  serviceId: string;
  body: UpdateVendorServiceRequest;
}

export interface UpdateVendorServiceContext {
  correlationId?: string;
}

export interface UpdateVendorServiceResult {
  service: VendorServiceView;
  reactivated: boolean;
}

export class UpdateVendorServiceUseCase {
  constructor(
    private readonly profileRepo: VendorProfileRepository,
    private readonly serviceRepo: VendorServiceRepository,
    private readonly categories: ServiceCategoryLookup,
    private readonly clock: ClockPort,
    private readonly events: VendorServiceEventLogger,
  ) {}

  async execute(
    cmd: UpdateVendorServiceCommand,
    ctx: UpdateVendorServiceContext = {},
  ): Promise<UpdateVendorServiceResult> {
    const started = this.clock.now().getTime();

    const profile = await this.profileRepo.findEditableByVendorUserId(cmd.vendorUserId);
    ensureVendorServiceCrudAllowed(profile);

    const owned = await this.serviceRepo.findOwnedById(cmd.serviceId, profile.id);
    if (!owned) throw new VendorServiceNotFoundError();

    if (cmd.body.service_category_id !== undefined) {
      const found = await this.categories.findByIds([cmd.body.service_category_id]);
      if (found.length === 0 || !found[0]!.isActive) {
        throw new InvalidCategoryError([cmd.body.service_category_id]);
      }
    }

    const reactivating = cmd.body.is_active === true && owned.isActive === false;
    if (reactivating) {
      const activeCount = await this.serviceRepo.countActiveByVendorProfileId(profile.id);
      if (activeCount >= VENDOR_SERVICE_ACTIVE_LIMIT) {
        throw new VendorServiceLimitReachedError();
      }
    }

    const updated = await this.serviceRepo.update(cmd.serviceId, profile.id, {
      packageName: cmd.body.package_name,
      description: cmd.body.description,
      basePrice: cmd.body.base_price,
      currencyCode: cmd.body.currency_code as VendorServiceCurrencyCode | undefined,
      serviceCategoryId: cmd.body.service_category_id,
      isActive: cmd.body.is_active,
    });

    const fieldsUpdated = Object.keys(cmd.body);

    this.events.emitUpdated({
      correlationId: ctx.correlationId,
      vendorProfileId: profile.id,
      vendorUserId: profile.vendorUserId,
      vendorServiceId: updated.id,
      fieldsUpdated,
      reactivated: reactivating,
      durationMs: this.clock.now().getTime() - started,
    });

    return { service: updated, reactivated: reactivating };
  }
}
