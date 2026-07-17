-- US-058 (PB-P1-035 / DB-002)
-- 1) Denormalizar `event_id` y `service_category_id` en `quotes` para habilitar el UNIQUE
--    parcial nativo `(event_id, service_category_id) WHERE is_preferred=true` (D5). Se copian
--    desde `quote_requests` por FK `quote_request_id`.
-- 2) Backfill idempotente antes del `NOT NULL` para tolerar Quotes preexistentes.
-- 3) FKs a `events` y `service_categories` con `ON DELETE RESTRICT` (misma semántica que
--    `quote_request → event`/`service_category`).
-- 4) UNIQUE parcial. Antes del `CREATE UNIQUE INDEX`, se limpia cualquier duplicado
--    preexistente que rompería la creación del constraint (defensivo — en un repo virgen
--    no aplica; en seeds antiguos podría existir >1 preferred por (event, category)).

-- 1) Columnas nuevas (nullable inicialmente para permitir el backfill).
ALTER TABLE "quotes"
  ADD COLUMN "event_id" uuid,
  ADD COLUMN "service_category_id" uuid;

-- 2) Backfill desde quote_requests.
UPDATE "quotes" q
SET "event_id" = qr."event_id",
    "service_category_id" = qr."service_category_id"
FROM "quote_requests" qr
WHERE q."quote_request_id" = qr."id"
  AND (q."event_id" IS NULL OR q."service_category_id" IS NULL);

-- Ahora ambas columnas son obligatorias.
ALTER TABLE "quotes"
  ALTER COLUMN "event_id" SET NOT NULL,
  ALTER COLUMN "service_category_id" SET NOT NULL;

-- 3) FKs consistentes con las de quote_requests.
ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_service_category_id_fkey"
  FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índices de lookup consistentes con el patrón de `quote_requests`.
CREATE INDEX "idx_quotes_event_id" ON "quotes" ("event_id");
CREATE INDEX "idx_quotes_service_category_id" ON "quotes" ("service_category_id");

-- 4) Limpieza defensiva de duplicados de preferred antes del UNIQUE parcial.
--    Estrategia: cuando hay >1 preferred por (event, category), se conserva el más reciente
--    (mayor `updated_at`, tie-break por `created_at`) y se desmarca el resto. En un repo
--    virgen no dispara ninguna fila.
WITH ranked AS (
  SELECT id,
         event_id,
         service_category_id,
         ROW_NUMBER() OVER (
           PARTITION BY event_id, service_category_id
           ORDER BY updated_at DESC, created_at DESC, id
         ) AS rn
  FROM "quotes"
  WHERE is_preferred = true
)
UPDATE "quotes"
SET "is_preferred" = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 5) UNIQUE parcial nativo (D5, BR-QUOTE-022).
CREATE UNIQUE INDEX "uq_quotes_preferred_per_event_category"
  ON "quotes" ("event_id", "service_category_id")
  WHERE "is_preferred" = true;
