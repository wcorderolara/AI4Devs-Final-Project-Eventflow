// US-072 (PB-P2-008 / BE-002). Puerto `MarkNotificationsRepository` — mutations de
// mark-as-read para el owner-user autenticado.
//
// Aisla los contratos de escritura sobre `notifications` (paralelo al patrón de
// puertos dedicados por operación de US-068/US-069/US-070 — evita expandir el port
// polimórfico `ListNotificationsRepository`).
//
// Todos los métodos aplican el aislamiento BR-NOTIF-005 con
// `WHERE user_id = $sessionUserId` — el UseCase upstream nunca recibe ni pasa un
// `userId` distinto al de la sesión.
import type { ListNotificationsChannel } from '../interface/http/list-notifications.query.schema.js';

/**
 * Retorno mínimo del ownership lookup — sólo lo estrictamente necesario para el
 * use case (ownership + idempotencia). El use case NO expone al cliente ningún
 * campo distinto de un `204 No Content`.
 */
export interface OwnedNotificationSnapshot {
  id: string;
  userId: string;
  /** `true` si `read_at IS NOT NULL` — dispara el path idempotente AC-06. */
  alreadyRead: boolean;
}

export interface MarkNotificationsRepository {
  /**
   * Devuelve el snapshot de ownership de una notif. Retorna `null` cuando NO existe.
   * NO aplica ownership check — el caller inspecciona `snapshot.userId` para decidir
   * si retornar 404 (política de no-revelación de `docs/19`).
   */
  findOwnedById(notificationId: string): Promise<OwnedNotificationSnapshot | null>;

  /**
   * Marca UNA notif como leída — `UPDATE notifications SET read_at=now(), status='read'
   * WHERE id=$1 AND user_id=$2 AND read_at IS NULL`. Idempotente: si ya estaba `read`
   * retorna `affected=0` (el UseCase responde 204 igualmente).
   * Retorna el número de filas afectadas para trazabilidad + logs de auditoría.
   */
  markAsRead(notificationId: string, userId: string): Promise<{ affected: number }>;

  /**
   * Marca TODAS las notifs `unread` del usuario que coinciden con el filtro `channel`.
   * `channel='all'` no aplica cláusula sobre `payload->>'channel'`. Retorna
   * `affected` para logs auditables. Nunca lanza sobre 0 filas (EC-02).
   */
  markAllAsReadForUser(
    userId: string,
    channel: ListNotificationsChannel,
  ): Promise<{ affected: number }>;
}
