// API client — vendor-profile (US-040 / FE-001; US-041 / FE-001; US-042 / FE-003).
// Sigue patrón `featureApi → mapper → modelo` (Doc 15 §24) sobre `shared/api-client/httpClient`.
// La cookie de sesión viaja automáticamente.
import { httpDelete, httpGetData, httpPatchData, httpPostData } from '@/shared/api-client';
import type {
  ChangeVendorCategoriesRequestDTO,
  ChangeVendorCategoriesResultDTO,
  CreateVendorProfileRequestDTO,
  ServiceCategoriesTreeFlatDTO,
  ServiceCategoryOption,
  UpdateVendorProfileRequestDTO,
  UpdateVendorProfileResultDTO,
  VendorProfileDTO,
} from './vendorProfileApi.types';

export const vendorProfileApi = {
  /** US-040 / AC-01: crea el VendorProfile del vendor autenticado. Retorna el DTO plano. */
  async create(input: CreateVendorProfileRequestDTO): Promise<VendorProfileDTO> {
    return httpPostData<VendorProfileDTO, CreateVendorProfileRequestDTO>('/vendors/me', {
      body: input,
    });
  },

  /**
   * US-040 (EMERGENT) → US-075 (PB-P1-042): catálogo público. El endpoint devuelve
   * `{tree, flat}`; el wizard `LocationCategoriesStep` sigue esperando la proyección
   * `ServiceCategoryOption[]` (id, code, label) — se toma directamente de `flat`
   * ya ordenado por el backend (`parent_id NULLS FIRST, sort_order, label`).
   */
  async listServiceCategories(): Promise<ServiceCategoryOption[]> {
    const data = await httpGetData<ServiceCategoriesTreeFlatDTO>('/service-categories');
    return data.flat.map((c) => ({ id: c.id, code: c.code, label: c.label }));
  },

  /** EMERGENT US-041: perfil del vendor autenticado (para hidratar el editor). */
  async getMine(): Promise<VendorProfileDTO> {
    return httpGetData<VendorProfileDTO>('/vendors/me');
  },

  /** US-041 / AC-01..04: PATCH parcial. Response `{ profile, repending }`. */
  async update(input: UpdateVendorProfileRequestDTO): Promise<UpdateVendorProfileResultDTO> {
    return httpPatchData<UpdateVendorProfileResultDTO, UpdateVendorProfileRequestDTO>(
      '/vendors/me',
      { body: input },
    );
  },

  /** US-041 / AC-05: soft delete. Sin body, response 204. */
  async softDelete(): Promise<void> {
    await httpDelete<void>('/vendors/me');
  },

  /**
   * US-042 / AC-01..04 · D1..D6: cambia el set de categorías del vendor autenticado.
   * Response `{ profile, repending, noop, category_change_count, requires_admin_review,
   * status, last_category_change_at }`.
   */
  async changeCategories(
    input: ChangeVendorCategoriesRequestDTO,
  ): Promise<ChangeVendorCategoriesResultDTO> {
    return httpPostData<ChangeVendorCategoriesResultDTO, ChangeVendorCategoriesRequestDTO>(
      '/vendors/me/categories',
      { body: input },
    );
  },
};
