// US-071 (PB-P2-004 / BE-002). Puerto de listado del surface organizer.
//
// La `Notification` física expone `id, userId, type, payload (JSONB), status, readAt,
// createdAt, updatedAt, isSeed`. El `channel` y `languageCode` viajan en `payload`
// (herencia US-034 D-01). El adapter aplica el filtro `channel` sobre
// `payload->>'channel'` vía `$queryRaw` cuando `channel != 'all'`.
import type {
  ListNotificationsChannel,
  ListNotificationsStatus,
} from '../interface/http/list-notifications.query.schema.js';

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'unread' | 'read';
  readAt: Date | null;
  createdAt: Date;
}

export interface FindByUserInput {
  userId: string;
  page: number;
  pageSize: number;
  status: ListNotificationsStatus;
  channel: ListNotificationsChannel;
}

export interface FindByUserResult {
  items: NotificationRow[];
  total: number;
}

export interface CountUnreadByUserInput {
  userId: string;
  channel: ListNotificationsChannel;
}

export interface ListNotificationsRepository {
  /**
   * Retorna una página del surface organizer con `ORDER BY (status='unread') DESC,
   * created_at DESC, id ASC` (D1). `channel='all'` no aplica cláusula sobre payload.
   */
  findByUser(input: FindByUserInput): Promise<FindByUserResult>;

  /** Cuenta filas `status='unread'` con el mismo filtro `channel`. */
  countUnreadByUser(input: CountUnreadByUserInput): Promise<number>;
}
