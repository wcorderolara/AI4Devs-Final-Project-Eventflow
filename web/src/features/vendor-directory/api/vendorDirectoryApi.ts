// API client — Directorio autenticado (US-045 / FE-003). `vendorsApi.search(...)`.
// Serializa los filtros como query params y descarta los `undefined`; el backend valida
// stricto (`.strict()`) y responde `400 INVALID_FILTERS` ante slugs desconocidos.
import { httpGet } from '@/shared/api-client';
import type {
  VendorSearchDataDTO,
  VendorSearchEnvelope,
  VendorSearchQuery,
} from './vendorDirectoryApi.types';

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
    const envelope = await httpGet<VendorSearchEnvelope>('/vendors', { query: buildQuery(input) });
    return envelope.data;
  },
};
