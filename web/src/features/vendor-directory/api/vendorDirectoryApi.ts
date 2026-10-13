// API client — Directorio autenticado (US-045 / FE-003). `vendorsApi.search(...)`.
// Serializa los filtros como query params y descarta los `undefined`; el backend valida
// stricto (`.strict()`) y responde `400 INVALID_FILTERS` ante slugs desconocidos.
import { httpGetData } from '@/shared/api-client';
import type { VendorSearchDataDTO, VendorSearchQuery } from './vendorDirectoryApi.types';

function buildQuery(input: VendorSearchQuery): Record<string, string | number | undefined> {
  return {
    categoryCode: input.categoryCode,
    locationCode: input.locationCode,
    priceMin: input.priceMin,
    priceMax: input.priceMax,
    currency: input.currency,
    cursor: input.cursor,
    limit: input.limit,
  };
}

export const vendorsApi = {
  async search(input: VendorSearchQuery = {}): Promise<VendorSearchDataDTO> {
    return httpGetData<VendorSearchDataDTO>('/vendors', { query: buildQuery(input) });
  },
};
