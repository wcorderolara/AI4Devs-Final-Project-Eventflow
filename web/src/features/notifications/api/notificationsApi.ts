// US-071 (PB-P2-004 / FE-001). Cliente API del surface organizer de notificaciones.
// Contrato §9 tech spec: `GET /api/v1/notifications` con query params opcionales.
// Response envelope estándar EventFlow (`success(data, correlationId, pagination)`).
import { httpGet } from '@/shared/api-client';

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
};
