// US-072 (PB-P2-008 / BE-001). Zod schemas para las mutations de mark-as-read:
//   * Path param `notificationId: z.string().uuid()` — VR-02.
//   * Query param `channel: z.enum(['in_app', 'email_simulated', 'all']).default('in_app')` — VR-03, D4.
//
// Se reutilizan las constantes canónicas del schema de listado (US-071 BE-001) para
// mantener el contrato consistente entre GET/PATCH/POST del mismo recurso.
import { z } from 'zod';
import {
  LIST_NOTIFICATIONS_CHANNEL,
  type ListNotificationsChannel,
} from './list-notifications.query.schema.js';

/** Path param `notificationId` — UUID v4 canónico (patrón EventFlow). */
export const notificationIdParamSchema = z
  .object({
    notificationId: z.string().uuid(),
  })
  .strict();

export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;

/**
 * Query param `channel` opcional para `POST /notifications/mark-all-read`. Default
 * `in_app` (D4) — paridad con US-071 D5. Los valores permitidos son idénticos al
 * schema de listado.
 */
export const DEFAULT_MARK_ALL_READ_CHANNEL: ListNotificationsChannel = 'in_app';

export const markAllReadQuerySchema = z
  .object({
    channel: z.enum(LIST_NOTIFICATIONS_CHANNEL).default(DEFAULT_MARK_ALL_READ_CHANNEL),
  })
  .strict();

export type MarkAllReadQuery = z.infer<typeof markAllReadQuerySchema>;
