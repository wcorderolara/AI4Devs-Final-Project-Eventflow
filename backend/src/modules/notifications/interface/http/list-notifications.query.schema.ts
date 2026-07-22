// US-071 (PB-P2-004 / BE-001). Zod schema del query string del endpoint
// `GET /api/v1/notifications`. Contrato §9 tech spec + decisiones D2/D5.
//
// Defaults (fail-safe):
//   * `page = 1` (int ≥ 1)
//   * `pageSize = 10` (int 1..50)
//   * `status = 'all'` (D2)
//   * `channel = 'in_app'` (D5 — dedup: emisor T-7 crea 2 filas por tarea; el default
//     evita mostrarlas duplicadas en el surface organizer)
//
// Errores Zod → 400 `INVALID_QUERY_PARAM` / `INVALID_PAGINATION` (VR-03..VR-05).
import { z } from 'zod';

export const LIST_NOTIFICATIONS_STATUS = ['unread', 'all'] as const;
export type ListNotificationsStatus = (typeof LIST_NOTIFICATIONS_STATUS)[number];

export const LIST_NOTIFICATIONS_CHANNEL = ['in_app', 'email_simulated', 'all'] as const;
export type ListNotificationsChannel = (typeof LIST_NOTIFICATIONS_CHANNEL)[number];

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
export const DEFAULT_STATUS: ListNotificationsStatus = 'all';
export const DEFAULT_CHANNEL: ListNotificationsChannel = 'in_app';

export const listNotificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
    status: z.enum(LIST_NOTIFICATIONS_STATUS).default(DEFAULT_STATUS),
    channel: z.enum(LIST_NOTIFICATIONS_CHANNEL).default(DEFAULT_CHANNEL),
  })
  .strict();

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
