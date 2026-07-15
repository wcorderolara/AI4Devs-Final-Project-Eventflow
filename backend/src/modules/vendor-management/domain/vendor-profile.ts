// Vista de dominio de VendorProfile (US-040). Se serializa vía el mapper del response DTO.
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export type VendorProfileStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export interface VendorProfileCategoryView {
  id: string;
  name: string;
}

export interface VendorProfileView {
  id: string;
  vendorUserId: string;
  businessName: string;
  bio: string;
  locationId: string;
  languagesSupported: SupportedLanguage[];
  categories: VendorProfileCategoryView[];
  slug: string;
  status: VendorProfileStatus;
  createdAt: Date;
}
