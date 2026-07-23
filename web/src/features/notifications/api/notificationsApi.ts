// US-071 (PB-P2-004 / FE-001). Cliente API del surface organizer de notificaciones.
// Contrato §9 tech spec: `GET /api/v1/notifications` con query params opcionales.
// Response envelope estándar EventFlow (`success(data, correlationId, pagination)`).
//
// US-072 (PB-P2-008 / FE-001): agrega `markAsRead` (PATCH single) y
// `markAllAsRead` (POST bulk global). Ambas mutations retornan `void` (backend
// responde `204 No Content` — D5). Sin body en el request.
import { httpGet, httpPatch, httpPost } from '@/shared/api-client';

/** Estados soportados por el query param `status`. */
export type NotificationStatusFilter = 'unread' | 'all';
export type NotificationStatus = 'unread' | 'read';
/** Canales soportados por el query param `channel` (D5). */
export type NotificationChannelFilter = 'in_app' | 'email_simulated' | 'all';

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  status?: NotificationStatusFilter;
  channel?: NotificationChannelFilter;
}

/** Shape del `NotificationDto` retornado por el backend (§7 use case output). */
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  status: NotificationStatus;
  link: string | null;
  channel: 'in_app' | 'email_simulated';
  languageCode: string;
  sent_at: string;
  read_at: string | null;
  emailSimulated: boolean;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListNotificationsResult {
  items: NotificationDto[];
  unreadCount: number;
  pagination: PaginationMeta;
}

interface EnvelopeData {
  items: NotificationDto[];
  unreadCount: number;
}

interface Envelope {
  data: EnvelopeData;
  pagination: PaginationMeta;
  meta: { correlationId: string; timestamp: string };
}

/** US-072 (FE-001). Default `channel='in_app'` (paridad con D4 backend). */
export const DEFAULT_MARK_ALL_CHANNEL: NotificationChannelFilter = 'in_app';

export const notificationsApi = {
  /**
   * Lista las notificaciones del usuario autenticado. Sin `credentials: 'include'` explícito
   * — `httpGet` ya lo aplica (patrón US-013). El backend deriva `session.userId` de la cookie
   * y aplica el aislamiento BR-NOTIF-005.
   */
  async list(params: ListNotificationsParams = {}): Promise<ListNotificationsResult> {
    const dto = await httpGet<Envelope>('/notifications', {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        status: params.status,
        channel: params.channel,
      },
    });
    return {
      items: dto.data.items,
      unreadCount: dto.data.unreadCount,
      pagination: dto.pagination,
    };
  },
  /**
   * US-072 (FE-001) — mark single: `PATCH /notifications/:id/read`. Response
   * `204 No Content`. `httpPatch` retorna `undefined` — se colapsa a `void`.
   */
  async markAsRead(notificationId: string): Promise<void> {
    await httpPatch<void>(`/notifications/${notificationId}/read`);
  },
  /**
   * US-072 (FE-001) — mark-all bulk: `POST /notifications/mark-all-read`. Se
   * envía `channel` sólo cuando difiere del default `in_app` para mantener el
   * request URL limpio en el happy path.
   */
  async markAllAsRead(
    channel: NotificationChannelFilter = DEFAULT_MARK_ALL_CHANNEL,
  ): Promise<void> {
    const query =
      channel === DEFAULT_MARK_ALL_CHANNEL ? undefined : { channel };
    await httpPost<void>('/notifications/mark-all-read', { query });
  },
};
