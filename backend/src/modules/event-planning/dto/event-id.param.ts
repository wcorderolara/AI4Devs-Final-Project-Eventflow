// Param DTO — `:eventId` de ruta (US-095 / BE-001). Valida UUID antes de tocar la BD.
import { z } from 'zod';

export const EventIdParamSchema = z
  .object({
    eventId: z.string().uuid(),
  })
  .strict();

export type EventIdParam = z.infer<typeof EventIdParamSchema>;
