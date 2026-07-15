// Use case — Listar VendorService (US-044 / BE-006, AC-01d).
// Retorna todos los servicios del vendor autenticado (activos e inactivos), ordenados por
// `createdAt desc`. Sin paginación (D3, MVP).
import type { VendorProfileRepository } from '../ports/vendor-profile.repository.js';
import type { VendorServiceRepository } from '../ports/vendor-service.repository.js';
import type { VendorServiceView } from '../domain/vendor-service.js';
import { ensureVendorServiceCrudAllowed } from './vendor-service-policy.js';

export interface ListVendorServicesCommand {
  vendorUserId: string;
}

export interface ListVendorServicesResult {
  items: VendorServiceView[];
}

export class ListVendorServicesUseCase {
  constructor(
    private readonly profileRepo: VendorProfileRepository,
    private readonly serviceRepo: VendorServiceRepository,
  ) {}

  async execute(cmd: ListVendorServicesCommand): Promise<ListVendorServicesResult> {
    const profile = await this.profileRepo.findEditableByVendorUserId(cmd.vendorUserId);
    ensureVendorServiceCrudAllowed(profile);
    const items = await this.serviceRepo.findAllByVendorProfileId(profile.id);
    return { items };
  }
}
