// Request DTO — Crear solicitud de cotización (US-092 / BE-005). AC-03; VR-01, VR-05.
// Reglas semánticas (vendor activo, límite de 5 activos) → capa Application.
import { z } from 'zod';

export const CreateQuoteRequestRequestSchema = z
  .object({
    event_id: z.string().uuid(),
    vendor_id: z.string().uuid(),
    category_id: z.string().uuid(),
    brief: z.string().min(10).max(4000),
    deadline: z.string().datetime().optional(),
    attachments: z.array(z.string()).optional(),
  })
  .strict();

export type CreateQuoteRequestRequest = z.infer<typeof CreateQuoteRequestRequestSchema>;
