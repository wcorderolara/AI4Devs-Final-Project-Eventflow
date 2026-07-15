-- US-039 (PB-P1-023 / DB-001, D1) — Idempotencia del sync `BudgetItem.committed` por BookingIntent.
-- Ambas columnas NULLABLE sin default y sin backfill: NULL representa "intent no sincronizado".
-- Los registros pre-existentes en `booking_intents` (incluidos los ya en `confirmed_intent`) quedan
-- con NULL; una siguiente confirm/cancel del ciclo activo NO los tocaría (el handler solo actúa
-- en la transición del invocador upstream). Compatibilidad hacia atrás garantizada.

ALTER TABLE "booking_intents"
  ADD COLUMN "committed_synced_at" TIMESTAMPTZ(6),
  ADD COLUMN "committed_synced_amount" DECIMAL(14, 2);
