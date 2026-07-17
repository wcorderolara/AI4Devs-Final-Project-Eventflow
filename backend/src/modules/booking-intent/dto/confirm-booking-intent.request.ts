// Request DTO — Confirmar BookingIntent bilateral con enforcement disclaimer (US-063 / BE-003).
//
// US-063 refactoriza el body del `POST /api/v1/booking-intents/:id/confirm` (Tech Spec §7 US-063,
// Decisión D1 — paridad con US-060 create). El vendor debe aceptar explícitamente el disclaimer
// server-side antes de que la confirmación aplique cualquier side-effect (UPDATE committed, fan-out
// de notificaciones al organizer).
//
// Contrato del body:
//
//   {
//     "disclaimer_accepted": true
//   }
//
// - `disclaimer_accepted` DEBE ser `true` (literal Zod) — cualquier `false`, ausencia, o `null`
//   dispara `400 DISCLAIMER_REQUIRED` en el use case (paridad con el create — EC-02).
// - `.strict()` rechaza cualquier campo adicional — el body de confirm NO acepta datos de pago
//   (FR-BOOKING-007) ni ningún otro atributo — cualquier extra ⇒ `400 VALIDATION_ERROR`.
// - Se acepta como `boolean` (no `literal(true)`) para diferenciar en el error handler entre
//   "ausente o no booleano" (⇒ `VALIDATION_ERROR` estándar) y "presente pero `false`"
//   (⇒ `DISCLAIMER_REQUIRED` con código estable).
import { z } from 'zod';

export const ConfirmBookingIntentBodySchema = z
  .object({
    disclaimer_accepted: z.boolean(),
  })
  .strict();

export type ConfirmBookingIntentBody = z.infer<typeof ConfirmBookingIntentBodySchema>;
