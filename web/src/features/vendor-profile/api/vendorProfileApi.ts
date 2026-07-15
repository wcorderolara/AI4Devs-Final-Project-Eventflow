// API client — vendor-profile (US-040 / FE-001; US-041 / FE-001). Sigue patrón `featureApi →
// mapper → modelo` (Doc 15 §24) sobre `shared/api-client/httpClient`. La cookie de sesión viaja
// automáticamente.
import { httpDelete, httpGet, httpPatch, httpPost } from '@/shared/api-client';
import type {
  CreateVendorProfileRequestDTO,
  ServiceCategoriesEnvelopeDTO,
  ServiceCategoryOption,
  UpdateVendorProfileEnvelopeDTO,
  UpdateVendorProfileRequestDTO,
  UpdateVendorProfileResultDTO,
  VendorProfileDTO,
  VendorProfileEnvelopeDTO,
} from './vendorProfileApi.types';

export const vendorProfileApi = {
  /** US-040 / AC-01: crea el VendorProfile del vendor autenticado. Retorna el DTO plano. */
  async create(input: CreateVendorProfileRequestDTO): Promise<VendorProfileDTO> {
    const dto = await httpPost<VendorProfileEnvelopeDTO, CreateVendorProfileRequestDTO>(
      '/vendors/me',
      { body: input },
    );
    return dto.data;
  },

  /** US-040 (EMERGENT): catálogo de ServiceCategory activas para el wizard. */
  async listServiceCategories(): Promise<ServiceCategoryOption[]> {
    const dto = await httpGet<ServiceCategoriesEnvelopeDTO>('/service-categories');
    return dto.data;
  },

  /** EMERGENT US-041: perfil del vendor autenticado (para hidratar el editor). */
  async getMine(): Promise<VendorProfileDTO> {
    const dto = await httpGet<VendorProfileEnvelopeDTO>('/vendors/me');
    return dto.data;
  },

  /** US-041 / AC-01..04: PATCH parcial. Response `{ profile, repending }`. */
  async update(input: UpdateVendorProfileRequestDTO): Promise<UpdateVendorProfileResultDTO> {
    const dto = await httpPatch<UpdateVendorProfileEnvelopeDTO, UpdateVendorProfileRequestDTO>(
      '/vendors/me',
      { body: input },
    );
    return dto.data;
  },

  /** US-041 / AC-05: soft delete. Sin body, response 204. */
  async softDelete(): Promise<void> {
    await httpDelete<void>('/vendors/me');
  },
};
