// US-034 (PB-P2-004). Tipos del dominio `notifications` requeridos por el emisor T-7.
// El schema físico `notifications` no expone `channel` ni `language_code` como columnas;
// ambos viajan dentro de `payload` JSONB (mismo patrón que US-049 —
// `PrismaQuoteNotificationSenderAdapter`). Ver US-034 execution record D-01.
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

/** Canal lógico de una `Notification`. Persistido en `payload.channel`. */
export type NotificationChannel = 'in_app' | 'email_simulated';

/**
 * Tipo canónico de `Notification` para el flujo T-7. `type='task_due_soon'` ya está
 * catalogado en `docs/18 §998` y es reutilizado por US-071/US-072.
 */
export const NOTIFICATION_TYPE_TASK_DUE_SOON = 'task_due_soon' as const;
export type NotificationTypeTaskDueSoon = typeof NOTIFICATION_TYPE_TASK_DUE_SOON;

/**
 * Payload persistido en `Notification.payload` para `type='task_due_soon'`.
 * `channel` y `languageCode` viajan aquí en lugar de columnas dedicadas
 * (ver US-034 execution record D-01). US-071 leerá estos campos.
 */
export interface TaskDueSoonPayload {
  channel: NotificationChannel;
  languageCode: SupportedLanguage;
  taskId: string;
  eventId: string;
  /** ISO date `YYYY-MM-DD` (calendario, sin hora). */
  dueDate: string;
}

/** Error interno lanzado si un guard de invariante `BR-NOTIF-005` falla. */
export class BrNotif005InvariantViolationError extends Error {
  readonly code = 'BR_NOTIF_005_INVARIANT_VIOLATION';

  constructor(public readonly expectedUserId: string, public readonly actualUserId: string) {
    super(
      `BR-NOTIF-005: notification.user_id (${actualUserId}) must equal event.owner_id (${expectedUserId})`,
    );
    this.name = 'BrNotif005InvariantViolationError';
  }
}
