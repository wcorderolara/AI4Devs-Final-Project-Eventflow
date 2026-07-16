// Dominio — `VendorService` (US-044 / PB-P1-027).
// El precio se expone como `string` (numeric(14,2) sin pérdida) para respetar el contrato del
// error envelope y el schema Doc 18 §15.2. `currencyCode` sigue el enum `CurrencyCode` de Prisma.
export type VendorServiceCurrencyCode = 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD';

export const VENDOR_SERVICE_CURRENCY_CODES = ['GTQ', 'EUR', 'MXN', 'COP', 'USD'] as const;

/** Cap de servicios activos por vendor (D5). */
export const VENDOR_SERVICE_ACTIVE_LIMIT = 50;

export interface VendorServiceView {
  id: string;
  vendorProfileId: string;
  serviceCategoryId: string;
  packageName: string;
  description: string;
  basePrice: string;
  currencyCode: VendorServiceCurrencyCode;
  isActive: boolean;
  aiGeneratedDescription: boolean;
  createdAt: string;
  updatedAt: string;
}
