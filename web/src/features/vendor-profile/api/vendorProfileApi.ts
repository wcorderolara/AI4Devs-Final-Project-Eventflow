// API client — vendor-profile (US-040 / FE-001). Sigue patrón `featureApi → mapper → modelo`
// (Doc 15 §24) sobre `shared/api-client/httpClient`. La cookie de sesión viaja automáticamente.
import { httpGet, httpPost } from '@/shared/api-client';
import type {
  CreateVendorProfileRequestDTO,
  ServiceCategoriesEnvelopeDTO,
  ServiceCategoryOption,
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
};
