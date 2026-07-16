// Response DTO — VendorService (US-044). Snake case en la superficie HTTP; el error envelope
// mantiene el contrato de ADR-API-002.
import type { VendorServiceView } from '../../domain/vendor-service.js';

export interface VendorServiceResponse {
  id: string;
  vendor_profile_id: string;
  service_category_id: string;
  package_name: string;
  description: string;
  base_price: string;
  currency_code: string;
  is_active: boolean;
  ai_generated_description: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorServiceListResponse {
  items: VendorServiceResponse[];
}

export function toVendorServiceResponse(view: VendorServiceView): VendorServiceResponse {
  return {
    id: view.id,
    vendor_profile_id: view.vendorProfileId,
    service_category_id: view.serviceCategoryId,
    package_name: view.packageName,
    description: view.description,
    base_price: view.basePrice,
    currency_code: view.currencyCode,
    is_active: view.isActive,
    ai_generated_description: view.aiGeneratedDescription,
    created_at: view.createdAt,
    updated_at: view.updatedAt,
  };
}
