-- US-056 (PB-P1-034 / DB-001)
-- 1) Audit fields de cancelación en `quote_requests` (D4).
--    - `cancellation_reason text NULL`: motivo opcional capturado por el organizer (0..500 en el DTO).
--    - `cancelled_by uuid NULL`: FK a `users(id)` con `ON DELETE RESTRICT` para preservar auditoría.
-- 2) Índice compuesto `(quote_id, status)` en `booking_intents` para el EXISTS del
--    `CancelQuoteRequestUseCase` (D2). Complementa el índice existente por `quote_id` solo.
-- 3) Índice de lookup reverso por `cancelled_by` en `quote_requests` (paridad con `viewed_by`).

ALTER TABLE "quote_requests"
  ADD COLUMN "cancelled_by" uuid,
  ADD COLUMN "cancellation_reason" text;

ALTER TABLE "quote_requests"
  ADD CONSTRAINT "quote_requests_cancelled_by_fkey"
  FOREIGN KEY ("cancelled_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "idx_quote_requests_cancelled_by" ON "quote_requests" ("cancelled_by");

CREATE INDEX "idx_booking_intents_quote_id_status" ON "booking_intents" ("quote_id", "status");
