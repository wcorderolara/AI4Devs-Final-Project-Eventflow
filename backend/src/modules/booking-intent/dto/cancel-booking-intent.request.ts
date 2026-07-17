// Request DTO — Cancelar BookingIntent bilateralmente (US-062 / BE-001). AC-03, EC-05, VR-05.
//
// Contrato §7 US-062: `reason` OPCIONAL, string 0..500 chars. El cancelador puede omitir el
// motivo (AC-03) y el service persiste `null` en `cancellation_reason`. El backend hace `.trim()`
// y trata la cadena vacía como ausente (`null`). Los strings > 500 disparan
// `400 INVALID_CANCELLATION_REASON`.
//
// Cambia el field name legacy (`cancellationReason` requerido max 1000 en US-096) por `reason`
// opcional max 500 alineado con US-062 y consistente con el DTO de US-054/US-056 (cancel de
// QuoteRequest). El alias legacy `CancelBookingIntentRequest` se preserva como re-export del
// nuevo tipo (DEV-03 US-062).
import { z } from 'zod';

const REASON_MAX = 500;

export const CancelBookingIntentUs062RequestSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(REASON_MAX)
      .optional(),
  })
  .strict();

export type CancelBookingIntentUs062Body = z.infer<typeof CancelBookingIntentUs062RequestSchema>;

/**
 * Alias legacy US-096 — el schema fue reemplazado por el nuevo `reason` opcional. El
 * middleware validador consume el mismo tipo; los tests unit US-096 se actualizaron.
 */
export const CancelBookingIntentRequestSchema = CancelBookingIntentUs062RequestSchema;
export type CancelBookingIntentRequest = CancelBookingIntentUs062Body;
