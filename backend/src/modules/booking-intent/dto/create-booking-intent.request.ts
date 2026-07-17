// Request DTO — Crear BookingIntent atómicamente (US-060 / BE-001). AC-01..AC-03, EC-05, VR-01..VR-03.
//
// El endpoint atómico `POST /api/v1/booking-intents` (D1) requiere disclaimer server-side
// enforcement (D2) y prohibe cualquier campo de pago (D8, FR-BOOKING-007). Contrato del body:
//
//   {
//     "quote_id": "<uuid>",
//     "disclaimer_accepted": true
//   }
//
// - `quote_id` (snake_case, contrato del endpoint) es un UUID válido — `.uuid()` de Zod produce
//   `400 VALIDATION_ERROR` cuando el string no matchea el formato.
// - `disclaimer_accepted` DEBE ser `true` (literal) — cualquier `false`, ausencia, o `null` cae al
//   `400 DISCLAIMER_REQUIRED` mapeado explícitamente en el use case (§7 Error Handling). Se usa
//   `boolean` + refine para diferenciar "ausente" (`VALIDATION_ERROR`) de "presente pero `false`"
//   (`DISCLAIMER_REQUIRED`) — así el frontend recibe el código estable esperado (i18n).
// - `.strict()` (FR-BOOKING-007, D8, AC-03) rechaza cualquier campo adicional — cualquier campo
//   de pago (`payment_method`, `card_token`, `card_number`, `amount_paid`, `payment_intent_id`,
//   etc.) dispara `400 VALIDATION_ERROR` con `details.unrecognized_keys[*]`. El backend NUNCA
//   captura ni almacena datos de pago.
import { z } from 'zod';

/**
 * Esquema base del body — `disclaimer_accepted` se acepta como `boolean` para permitir que el
 * use case distinga "false/ausente" (⇒ `DISCLAIMER_REQUIRED`) de "no es booleano" (⇒
 * `VALIDATION_ERROR` estándar del middleware Zod).
 */
export const CreateBookingIntentUs060RequestSchema = z
  .object({
    quote_id: z.string().uuid(),
    disclaimer_accepted: z.boolean(),
  })
  .strict();

export type CreateBookingIntentUs060Body = z.infer<typeof CreateBookingIntentUs060RequestSchema>;

// Alias legacy US-096 para preservar imports (el DTO ha sido reemplazado por el snake_case de
// US-060; el DTO camelCase original queda descontinuado — el barrel `dto/index.ts` re-exporta
// únicamente el nuevo esquema).
export const CreateBookingIntentRequestSchema = CreateBookingIntentUs060RequestSchema;
export type CreateBookingIntentRequest = CreateBookingIntentUs060Body;
