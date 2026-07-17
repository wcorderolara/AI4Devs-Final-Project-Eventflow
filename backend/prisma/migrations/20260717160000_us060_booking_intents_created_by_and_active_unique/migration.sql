-- US-060 (PB-P1-036 / DB-002) — BookingIntent audit column + UNIQUE parcial activo.
--
-- Objetivos:
--   1) Agregar `booking_intents.created_by uuid NOT NULL` con FK a `users(id)` ON DELETE RESTRICT.
--      Backfill idempotente desde el join `booking_intents → quotes → quote_requests → events →
--      user_id` (organizer dueño del evento). En un repo virgen no dispara filas.
--   2) Índice de lookup `idx_booking_intents_created_by`.
--   3) UNIQUE parcial nativo `uq_booking_intents_active_per_quote (quote_id) WHERE status IN
--      ('pending','confirmed_intent')` — a lo sumo un BookingIntent activo por Quote (EC-03,
--      VR-07, BR-BOOKING-004). Se define aquí porque Prisma <5 no soporta `WHERE` en `@@unique`.

-- 1) Nueva columna nullable inicialmente para permitir el backfill del histórico.
ALTER TABLE "booking_intents"
  ADD COLUMN "created_by" uuid;

-- 2) Backfill desde el organizer del evento asociado al Quote.
UPDATE "booking_intents" bi
SET "created_by" = e."user_id"
FROM "quotes" q
JOIN "quote_requests" qr ON qr."id" = q."quote_request_id"
JOIN "events" e ON e."id" = qr."event_id"
WHERE bi."quote_id" = q."id"
  AND bi."created_by" IS NULL;

-- 3) Fila sin ancla en el join (defensa profunda): usar el organizer del evento denormalizado en
--    el propio BookingIntent (US-102 agrega event_id / service_category_id a booking_intents).
UPDATE "booking_intents" bi
SET "created_by" = e."user_id"
FROM "events" e
WHERE bi."event_id" = e."id"
  AND bi."created_by" IS NULL;

-- 4) Ahora la columna es obligatoria.
ALTER TABLE "booking_intents"
  ALTER COLUMN "created_by" SET NOT NULL;

-- 5) FK a users con ON DELETE RESTRICT (misma semántica que el resto de FKs de auditoría — el
--    borrado de un usuario que originó un intent está protegido por integridad referencial).
ALTER TABLE "booking_intents"
  ADD CONSTRAINT "booking_intents_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) Índice de lookup por organizer creador.
CREATE INDEX "idx_booking_intents_created_by" ON "booking_intents" ("created_by");

-- 7) Limpieza defensiva de duplicados activos preexistentes antes del UNIQUE parcial. Cuando
--    existan >1 BookingIntents en (`pending`,`confirmed_intent`) para el mismo `quote_id`, se
--    conserva el más reciente (mayor `updated_at`, tie-break por `created_at` y `id`) y los
--    restantes se marcan `cancelled` con `cancellation_reason` explícito. En un repo virgen no
--    dispara filas.
WITH ranked AS (
  SELECT id,
         quote_id,
         ROW_NUMBER() OVER (
           PARTITION BY quote_id
           ORDER BY updated_at DESC, created_at DESC, id
         ) AS rn
  FROM "booking_intents"
  WHERE status IN ('pending', 'confirmed_intent')
)
UPDATE "booking_intents"
SET "status" = 'cancelled',
    "cancelled_at" = NOW(),
    "cancellation_reason" = 'auto-cancelled by us060 migration (duplicate active intent)'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 8) UNIQUE parcial nativo (D4, BR-BOOKING-004, EC-03).
CREATE UNIQUE INDEX "uq_booking_intents_active_per_quote"
  ON "booking_intents" ("quote_id")
  WHERE "status" IN ('pending', 'confirmed_intent');
