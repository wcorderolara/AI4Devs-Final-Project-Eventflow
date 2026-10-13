// Tipos DTO — Admin vendors (US-074 list + US-047 moderate). Espejo del contrato backend
// `GET /api/v1/admin/vendors` (US-074 §7/§9) y `POST /api/v1/admin/vendors/:id/moderate`
// (US-047 §7/§9).

export type ModerateVendorAction = 'approve' | 'reject' | 'hide' | 'unhide';
export type AdminVendorStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

// ── US-047 · moderate contract ──────────────────────────────────────────────

/**
 * Body del POST — `reason` es required en `reject`/`hide` (D4) y opcional en `approve`/
 * `unhide` (D3). El envelope se envía sin la clave cuando el usuario no ingresó reason.
 */
export interface ModerateVendorBodyDTO {
  action: ModerateVendorAction;
  reason?: string;
}

export interface ModeratedVendorDTO {
  id: string;
  status: AdminVendorStatus;
  isHidden: boolean;
  moderatedAt: string;
  moderatedBy: string;
  moderationReason: string | null;
  adminActionId: string;
}

export type ModerateVendorErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_UUID'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'VENDOR_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';

// ── US-074 · list contract ──────────────────────────────────────────────────

export interface AdminVendorListFilters {
  status?: AdminVendorStatus[];
  isHidden?: boolean;
  createdAtFrom?: string;
  createdAtTo?: string;
  businessName?: string;
  pageSize?: number;
  cursor?: string;
}

export interface AdminVendorOwner {
  userId: string;
  email: string;
}

export interface AdminVendorLastAction {
  action: string;
  reason: string | null;
  adminId: string | null;
  createdAt: string;
}

export interface AdminVendorListItem {
  id: string;
  businessName: string;
  slug: string | null;
  status: AdminVendorStatus;
  isHidden: boolean;
  createdAt: string;
  owner: AdminVendorOwner;
  lastAdminAction: AdminVendorLastAction | null;
}

export interface AdminVendorsPagination {
  nextCursor: string | null;
  pageSize: number;
}

export interface AdminVendorsListDTO {
  items: AdminVendorListItem[];
  pagination: AdminVendorsPagination;
}

export type AdminVendorsListErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CURSOR'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';
