// Barrel — interface del módulo admin-governance (US-016 + US-047).
export { adminEventsRouter } from './admin-events.routes.js';
export { AdminEventsController } from './admin-events.controller.js';
// US-047 (PB-P1-041): moderación admin del VendorProfile.
export { adminVendorRouter } from './admin-vendor.routes.js';
export { AdminVendorController } from './admin-vendor.controller.js';
