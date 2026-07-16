// DTO Zod del endpoint `GET /api/v1/quote-requests/active-count` (US-050 / BE-001).
// Tech Spec §7 DTOs. Sólo dos UUIDs por query string; `.strict()` rechaza claves extra.
import { z } from 'zod';

export const activeQrCountUs050QuerySchema = z
  .object({
    event_id: z.string().uuid(),
    service_category_id: z.string().uuid(),
  })
  .strict();

export type ActiveQrCountUs050Query = z.infer<typeof activeQrCountUs050QuerySchema>;

export interface ActiveQrCountUs050Response {
  active_count: number;
  limit: number;
  available_slots: number;
  statuses_counted: readonly string[];
}
