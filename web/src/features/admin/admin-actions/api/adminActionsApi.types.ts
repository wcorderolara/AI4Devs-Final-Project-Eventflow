// US-080 / FE-005 — DTOs del cliente admin del audit log AdminAction. Espejo del contrato
// backend `GET /api/v1/admin/admin-actions` (§7 Tech Spec + §9 API Contract).
//
// El backend expone snake_case en el response (`target_type`, `target_id`, `created_at`) y
// snake_case también en los query params (`admin_id`, `target_type`, etc.). Los filtros del
// cliente usan camelCase; el mapping a snake_case ocurre en `toListQueryString`.

export type AdminActionTargetType =
  | 'review'
  | 'vendor_profile'
  | 'service_category'
  | 'event_type'
  | 'event';

export interface AdminActionListItemAdmin {
  id: string | null;
  businessName: string | null;
  email: string | null;
}

export interface AdminActionListItemModel {
  id: string;
  admin: AdminActionListItemAdmin;
  target_type: string;
  target_id: string;
  action: string;
  reason: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminActionsListFilters {
  adminId?: string;
  targetType?: AdminActionTargetType;
  targetId?: string;
  action?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  pageSize?: number;
  cursor?: string;
}

export interface AdminActionsListPagination {
  nextCursor: string | null;
  pageSize: number;
}

export interface AdminActionsListDTO {
  items: AdminActionListItemModel[];
  pagination: AdminActionsListPagination;
}

export interface AdminActionsListEnvelope {
  data: AdminActionsListDTO;
  meta?: { correlationId: string; timestamp?: string };
}
