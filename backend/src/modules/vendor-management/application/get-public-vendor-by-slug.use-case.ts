// Use case — GetPublicVendorBySlugUseCase (US-046 / BE-004, §7 Tech Spec).
// Recibe un slug ya validado por el DTO Zod (BE-001), consulta el repository (BE-002) y
// aplica el whitelist mapper (BE-003). Devuelve `null` cuando el vendor no está approved o
// no existe — el controller mapea esa condición a `404 VENDOR_NOT_FOUND` uniforme
// (D6 — sin distinción para evitar information leakage). No lanza errores para el flujo
// happy path/negative — sólo propaga excepciones inesperadas del repository.
import type { PublicVendorDto } from '../interface/dto/public-vendor.response.js';
import type { PublicVendorRepository } from '../ports/public-vendor.repository.js';
import { toPublicVendorDto } from './public-vendor.mapper.js';

export interface GetPublicVendorBySlugInput {
  slug: string;
}

export class GetPublicVendorBySlugUseCase {
  constructor(private readonly repository: PublicVendorRepository) {}

  async execute(input: GetPublicVendorBySlugInput): Promise<PublicVendorDto | null> {
    const record = await this.repository.findPublicApprovedBySlug(input.slug);
    if (record === null) return null;
    return toPublicVendorDto(record);
  }
}
