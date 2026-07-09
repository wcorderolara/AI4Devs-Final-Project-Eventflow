// Re-export de los helpers de autorización compartidos (US-096). La lógica vive en shared/access
// para reutilizarse también desde booking-intent sin imports cross-module.
export { requireEventOwner, requireVendorProfileId } from '../../../shared/access/authz.js';
