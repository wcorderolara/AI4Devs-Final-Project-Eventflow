// Feature admin vendors — US-074 (list) + US-047 (moderate). Punto de entrada público.
export { adminVendorsApi } from './api/adminVendorsApi';
export type {
  ModerateVendorAction,
  ModerateVendorBodyDTO,
  ModeratedVendorDTO,
  ModerateVendorErrorCode,
  AdminVendorStatus,
  AdminVendorListFilters,
  AdminVendorListItem,
  AdminVendorLastAction,
  AdminVendorOwner,
  AdminVendorsListDTO,
  AdminVendorsListErrorCode,
} from './api/adminVendorsApi.types';
export {
  useModerateVendor,
  useAdminVendorsList,
  adminVendorsKeys,
} from './hooks/adminVendorsQueries';
export { VendorStatusBadge } from './components/VendorStatusBadge';
export { VendorFiltersPanel } from './components/VendorFiltersPanel';
export { VendorModerationDialog } from './components/VendorModerationDialog';
export type { VendorModerationDialogVendor } from './components/VendorModerationDialog';
export { VendorModerationTable } from './components/VendorModerationTable';
