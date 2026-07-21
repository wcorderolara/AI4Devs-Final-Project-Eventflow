-- US-084 (PB-P1-049 / DB-001 · AC-03, AC-05, EC-03) — Denormaliza el locale efectivo del
-- provider IA y el flag de fallback como columnas dedicadas de `ai_recommendations`. Antes vivían
-- solo dentro del blob `ai_meta` JSONB; con columnas dedicadas habilitamos: filtrado por locale
-- en índices futuros, joins/agregaciones i18n, auditoría explícita y contrato de dominio limpio
-- para US-018..025.
--
-- Estrategia (idempotente, apta para BD con datos existentes en producción-académica):
--   1. Añadir `locale` NULLABLE y `locale_fallback` con default false.
--   2. Backfill: `locale` desde `ai_meta->>'languageCode'`; si es NULL, del evento asociado
--      (`events.language_code`); si aún es NULL, del default 'es-LATAM'.
--      `locale_fallback` desde `ai_meta->>'fallbackUsed'` (bool).
--   3. Convertir `locale` a NOT NULL con default 'es-LATAM'.
--   4. Índice compuesto (`locale`, `created_at DESC`) para dashboards futuros.

ALTER TABLE "ai_recommendations"
  ADD COLUMN IF NOT EXISTS "locale" TEXT,
  ADD COLUMN IF NOT EXISTS "locale_fallback" BOOLEAN NOT NULL DEFAULT false;

-- Backfill `locale_fallback` desde el JSONB si el bool está presente.
UPDATE "ai_recommendations"
SET "locale_fallback" = COALESCE(("ai_meta"->>'fallbackUsed')::boolean, false)
WHERE "ai_meta" IS NOT NULL AND "ai_meta" ? 'fallbackUsed';

-- Backfill `locale`: preferencia (a) ai_meta.languageCode (b) events.language (c) default.
-- `events.language` es la fuente autoritativa por AC-05/US-082 (evento inmutable) pero se
-- guarda como valor del enum Prisma (`es_LATAM`/`es_ES`/`pt`/`en`). Se convierte al formato de
-- contrato API (`es-LATAM`/`es-ES`) — misma normalización que aplica `PRISMA_TO_API_LANGUAGE`
-- en el repositorio (US-094/BE-003).
UPDATE "ai_recommendations" AS r
SET "locale" = COALESCE(
  r."ai_meta"->>'languageCode',
  (
    SELECT CASE ec."language"::text
      WHEN 'es_LATAM' THEN 'es-LATAM'
      WHEN 'es_ES' THEN 'es-ES'
      ELSE ec."language"::text
    END
    FROM "events" ec
    WHERE ec."id" = r."event_id"
  ),
  'es-LATAM'
)
WHERE r."locale" IS NULL;

-- Cierre: nadie debería quedar con NULL tras el COALESCE anterior.
ALTER TABLE "ai_recommendations"
  ALTER COLUMN "locale" SET NOT NULL,
  ALTER COLUMN "locale" SET DEFAULT 'es-LATAM';

CREATE INDEX IF NOT EXISTS "ai_recommendations_locale_created_at_idx"
  ON "ai_recommendations" ("locale", "created_at" DESC);
