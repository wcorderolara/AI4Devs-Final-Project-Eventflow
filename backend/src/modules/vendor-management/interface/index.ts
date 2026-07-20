// Barrel de la capa interface del bounded context vendor-management (US-040 / PB-P1-024).
export { vendorProfileRouter } from './vendor-profile.routes.js';
// US-075 (PB-P1-042): el endpoint EMERGENT `serviceCategoriesRouter` de US-040 se elimina —
// su reemplazo `{tree, flat}` vive ahora en `modules/service-catalog/interface/`.
export { vendorServiceRouter } from './vendor-service.routes.js';
export { vendorSearchRouter } from './vendor-search.routes.js';
// US-046 (PB-P1-029): endpoint público SEO del vendor. Sub-feature dentro de vendor-management
// (§7 Tech Spec — opción "sub-feature en `modules/vendors`") para preservar el invariante de 16
// bounded contexts canónicos (US-090 / Doc 14 §9).
export { publicVendorRouter } from './public-vendor.routes.js';
