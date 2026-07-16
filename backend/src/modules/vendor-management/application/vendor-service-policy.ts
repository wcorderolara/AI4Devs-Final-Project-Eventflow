// Política compartida por los 4 use cases del CRUD `VendorService` (US-044 / D1).
// pending / approved / rejected → CRUD permitido.
// hidden → 409 PROFILE_HIDDEN.
// soft-deleted → 404 (perfil).
import { VendorProfileHiddenError, VendorProfileNotFoundError } from '../domain/vendor-profile.errors.js';
import type { VendorProfileEditableSnapshot } from '../ports/vendor-profile.repository.js';

export function ensureVendorServiceCrudAllowed(
  snapshot: VendorProfileEditableSnapshot | null,
): asserts snapshot is VendorProfileEditableSnapshot {
  // El snapshot editable excluye soft-deleted (retorna null) — cubre EC-07 → 404.
  if (!snapshot) throw new VendorProfileNotFoundError();
  if (snapshot.status === 'hidden') throw new VendorProfileHiddenError();
}
