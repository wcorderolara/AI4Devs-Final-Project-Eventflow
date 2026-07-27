// API pública de la feature vendor-public (conventions §10.2: sin imports profundos entre features).
export { PublicVendorProfile } from './components/PublicVendorProfile';
export { JsonLdLocalBusiness } from './components/JsonLdLocalBusiness';
export {
  PublicVendorDirectory,
  type PublicVendorDirectorySearchParams,
} from './components/PublicVendorDirectory';
export { PublicVendorDirectoryFilters } from './components/PublicVendorDirectoryFilters';
export { vendorsPublicApi } from './api/vendorPublicApi';
export {
  publicVendorDirectoryApi,
  type PublicVendorListResult,
} from './api/publicVendorDirectoryApi';
