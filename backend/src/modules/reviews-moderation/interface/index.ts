// Barrel — capa interface del módulo Reviews (US-065 + US-066).
export * from './create-review.dto.js';
export * from './review.response.js';
export { OrganizerReviewController } from './organizer-review.controller.js';
export { organizerReviewRouter } from './organizer-review.routes.js';
// US-066 (PB-P1-039): listado público de reviews por vendor.
export * from './list-vendor-reviews.dto.js';
export * from './list-vendor-reviews.response.js';
export { VendorReviewsController } from './vendor-reviews.controller.js';
export { vendorReviewsRouter } from './vendor-reviews.routes.js';
