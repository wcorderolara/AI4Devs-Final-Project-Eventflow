// US-031 (PB-P1-017 / BE-001) — Zod schemas para el bulk confirm HITL.
// `taskIds` se valida como array de UUID v4 con `min(1)` (VR-03: body vacío) y `max(50)` (EC-07).
// El límite se re-verifica **defensivamente** post-dedup en el use case; Zod pre-dedup se limita
// a un tope holgado para acotar payload y capturar la mayoría de payloads inválidos temprano.
import { z } from 'zod';

export const BULK_CONFIRM_MAX_IDS = 50;

export const confirmAITasksBulkParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const confirmAITasksBulkBodySchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, { message: 'taskIds must not be empty' }).max(200, {
    // Cap Zod alto (200) para diferenciar validation-vacío (400 VALIDATION) del límite de negocio
    // 50 post-dedup (400 BULK_LIMIT_EXCEEDED) que se verifica en el use case tras el `Set` dedup.
    message: 'taskIds exceeds hard payload cap',
  }),
});

export const confirmAITasksBulkRequestSchema = z.object({
  params: confirmAITasksBulkParamsSchema,
  body: confirmAITasksBulkBodySchema,
});

export type ConfirmAITasksBulkParams = z.infer<typeof confirmAITasksBulkParamsSchema>;
export type ConfirmAITasksBulkBody = z.infer<typeof confirmAITasksBulkBodySchema>;
