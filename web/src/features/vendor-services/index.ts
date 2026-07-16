// Barrel — vendor-services feature (US-044 / PB-P1-027).
export { VendorServiceTable } from './components/VendorServiceTable';
export { CreateServiceDialog } from './components/CreateServiceDialog';
export type { ServiceCategoryOption } from './components/CreateServiceDialog';
export { DeactivateServiceDialog } from './components/DeactivateServiceDialog';
export {
  useCreateVendorService,
  useDeactivateVendorService,
  useUpdateVendorService,
  useVendorServicesList,
  vendorServicesKeys,
} from './hooks/vendorServicesQueries';
export { vendorServicesApi } from './api/vendorServicesApi';
export type {
  CreateVendorServiceInput,
  UpdateVendorServiceInput,
  VendorServiceCurrencyCode,
  VendorServiceView,
} from './api/vendorServicesApi.types';
export { VENDOR_SERVICE_CURRENCY_CODES } from './api/vendorServicesApi.types';
