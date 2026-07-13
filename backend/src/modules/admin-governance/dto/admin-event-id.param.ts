// US-016 / API-001 — Param DTO `:id` del endpoint admin de lectura de evento.
// Zod estricto para rechazar UUIDs mal formados antes de tocar la BD (`400 VALIDATION_ERROR`).
import { z } from 'zod';

export const AdminEventIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export type AdminEventIdParam = z.infer<typeof AdminEventIdParamSchema>;
