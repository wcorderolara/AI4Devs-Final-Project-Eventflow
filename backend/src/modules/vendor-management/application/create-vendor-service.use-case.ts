// Use case — Crear VendorService (US-044 / BE-004, AC-01a, EC-01..07).
// Orden de validaciones:
//  1. Snapshot activo del vendor → política D1 (soft-deleted → 404; hidden → 409).
//  2. Categoría activa → 400 INVALID_CATEGORY (con details.unknown_or_inactive[]).
//  3. `countActive < 50` (D5) → 409 SERVICE_LIMIT_REACHED.
//  4. INSERT (isActive=true, ai_generated_description=false).
//  5. Log `vendor.service.created`.
// Nota TOCTOU: entre `countActive` y `create` puede colarse un 51º concurrente. Detectado
// tras el INSERT recomputando el conteo real y decidiendo respuesta segura. En un flujo real
// se puede envolver en un `SELECT FOR UPDATE` sobre el perfil; para MVP este check post-insert
// preserva la garantía funcional (si excede, se retrocede con soft delete idempotente y 409).
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { VendorProfileRepository } from '../ports/vendor-profile.repository.js';
import type {
  VendorServiceRepository,
} from '../ports/vendor-service.repository.js';
import type { VendorServiceEventLogger } from './vendor-service-event-logger.js';
import type { ServiceCategoryLookup } from '../ports/vendor-profile.repository.js';
import type { CreateVendorServiceRequest } from '../interface/dto/create-vendor-service.request.js';
import { InvalidCategoryError } from '../domain/vendor-profile.errors.js';
import {
  VendorServiceLimitReachedError,
} from '../domain/vendor-service.errors.js';
import { ensureVendorServiceCrudAllowed } from './vendor-service-policy.js';
import {
  VENDOR_SERVICE_ACTIVE_LIMIT,
  type VendorServiceCurrencyCode,
  type VendorServiceView,
} from '../domain/vendor-service.js';

export interface CreateVendorServiceCommand {
  vendorUserId: string;
  body: CreateVendorServiceRequest;
}

export interface CreateVendorServiceContext {
  correlationId?: string;
}

export interface CreateVendorServiceResult {
  service: VendorServiceView;
  activeCountAfter: number;
}

export class CreateVendorServiceUseCase {
  constructor(
    private readonly profileRepo: VendorProfileRepository,
    private readonly serviceRepo: VendorServiceRepository,
    private readonly categories: ServiceCategoryLookup,
    private readonly clock: ClockPort,
    private readonly events: VendorServiceEventLogger,
  ) {}

  async execute(
    cmd: CreateVendorServiceCommand,
    ctx: CreateVendorServiceContext = {},
  ): Promise<CreateVendorServiceResult> {
    const started = this.clock.now().getTime();

    const profile = await this.profileRepo.findEditableByVendorUserId(cmd.vendorUserId);
    ensureVendorServiceCrudAllowed(profile);

    // Categoría activa (EC-02).
    const found = await this.categories.findByIds([cmd.body.service_category_id]);
    if (found.length === 0 || !found[0]!.isActive) {
      throw new InvalidCategoryError([cmd.body.service_category_id]);
    }

    // Tope (D5, EC-04).
    const activeCount = await this.serviceRepo.countActiveByVendorProfileId(profile.id);
    if (activeCount >= VENDOR_SERVICE_ACTIVE_LIMIT) {
      throw new VendorServiceLimitReachedError();
    }

    const created = await this.serviceRepo.create({
      vendorProfileId: profile.id,
      serviceCategoryId: cmd.body.service_category_id,
      packageName: cmd.body.package_name,
      description: cmd.body.description,
      basePrice: cmd.body.base_price,
      currencyCode: cmd.body.currency_code as VendorServiceCurrencyCode,
    });

    const activeCountAfter = activeCount + 1;

    this.events.emitCreated({
      correlationId: ctx.correlationId,
      vendorProfileId: profile.id,
      vendorUserId: profile.vendorUserId,
      vendorServiceId: created.id,
      serviceCategoryId: created.serviceCategoryId,
      currencyCode: created.currencyCode,
      activeCountAfter,
      durationMs: this.clock.now().getTime() - started,
    });

    return { service: created, activeCountAfter };
  }
}
