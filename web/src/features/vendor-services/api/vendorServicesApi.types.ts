// Tipos DTO — US-044 / PB-P1-027 (FE-003). Espejo del contrato §9 API Contract.

export type VendorServiceCurrencyCode = 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD';

export const VENDOR_SERVICE_CURRENCY_CODES: readonly VendorServiceCurrencyCode[] = [
  'GTQ',
  'EUR',
  'MXN',
  'COP',
  'USD',
];

export interface VendorServiceDTO {
  id: string;
  vendor_profile_id: string;
  service_category_id: string;
  package_name: string;
  description: string;
  base_price: string;
  currency_code: VendorServiceCurrencyCode;
  is_active: boolean;
  ai_generated_description: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorServiceListEnvelope {
  data: { items: VendorServiceDTO[] };
  correlationId: string;
}

export interface VendorServiceEnvelope {
  data: VendorServiceDTO;
  correlationId: string;
}

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

export function toVendorServiceView(dto: VendorServiceDTO): VendorServiceView {
  return {
    id: dto.id,
    vendorProfileId: dto.vendor_profile_id,
    serviceCategoryId: dto.service_category_id,
    packageName: dto.package_name,
    description: dto.description,
    basePrice: dto.base_price,
    currencyCode: dto.currency_code,
    isActive: dto.is_active,
    aiGeneratedDescription: dto.ai_generated_description,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export interface CreateVendorServiceInput {
  package_name: string;
  description: string;
  base_price: string;
  currency_code: VendorServiceCurrencyCode;
  service_category_id: string;
}

export interface UpdateVendorServiceInput {
  package_name?: string;
  description?: string;
  base_price?: string;
  currency_code?: VendorServiceCurrencyCode;
  service_category_id?: string;
  is_active?: boolean;
}
