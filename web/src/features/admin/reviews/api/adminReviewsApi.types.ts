// Tipos DTO — Admin reviews (US-067 moderate + US-077 list). Espejo del contrato backend
// `POST /api/v1/admin/reviews/:id/moderate` (US-067 §7/§9) y `GET /api/v1/admin/reviews`
// (US-077 §7/§9).

export type ModerateAction = 'hide' | 'remove';
export type AdminReviewStatus = 'published' | 'hidden' | 'removed';

// ── US-067 · moderate contract ──────────────────────────────────────────────

export interface ModerateReviewBodyDTO {
  action: ModerateAction;
  reason: string;
}

/** Response 200 tras moderación atómica. `status` refleja el destino (`hidden`|`removed`). */
export interface ModeratedReviewDTO {
  id: string;
  status: 'hidden' | 'removed';
  moderatedAt: string;
  moderatedBy: string;
  moderationReason: string;
  adminActionId: string;
}

export interface ModeratedReviewEnvelope {
  data: ModeratedReviewDTO;
  correlationId: string;
}

/** Códigos de error consumidos por el UI del panel admin moderate. */
export type ModerateReviewErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_UUID'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'REVIEW_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';

// ── US-077 · list contract ──────────────────────────────────────────────────

export interface AdminReviewListFilters {
  status?: AdminReviewStatus[];
  vendorId?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  ratingMin?: number;
  ratingMax?: number;
  hasAdminAction?: boolean;
  pageSize?: number;
  cursor?: string;
}

export interface AdminReviewLastAction {
  action: string;
  reason: string | null;
  adminId: string | null;
  createdAt: string;
}

export interface AdminReviewAuthor {
  userId: string;
  displayName: string;
}

export interface AdminReviewVendor {
  id: string;
  businessName: string;
  slug: string | null;
}

export interface AdminReviewEvent {
  id: string;
  title: string;
}

export interface AdminReviewListItem {
  id: string;
  rating: number;
  comment: string | null;
  status: AdminReviewStatus;
  createdAt: string;
  author: AdminReviewAuthor;
  vendor: AdminReviewVendor;
  event: AdminReviewEvent;
  lastAdminAction: AdminReviewLastAction | null;
}

export interface AdminReviewsPagination {
  nextCursor: string | null;
  pageSize: number;
}

export interface AdminReviewsListDTO {
  items: AdminReviewListItem[];
  pagination: AdminReviewsPagination;
}

export interface AdminReviewsListEnvelope {
  data: AdminReviewsListDTO;
  correlationId: string;
}

/** Códigos de error consumidos por el UI del panel admin listing. */
export type AdminReviewsListErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CURSOR'
  | 'INVALID_FILTERS'
  | 'INVALID_UUID'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';
