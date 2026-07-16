-- US-045 (PB-P1-028 / DB-001) — Campos y catálogos requeridos por el directorio autenticado
-- (`GET /api/v1/vendors`). Aditiva y no destructiva: la tabla `vendor_profiles` gana dos
-- columnas denormalizadas para orden estable por reputación; `locations` gana un slug
-- estable requerido por el filtro `locationCode`. Añade un índice compuesto para keyset
-- pagination sobre vendors aprobados vivos.

-- 1) Slug estable en Location. UNIQUE parcial (NULL permitido para filas legacy). Backfill
--    determinista para las 3 filas seed reconocidas por (country, region).
ALTER TABLE "locations" ADD COLUMN "code" VARCHAR(64);

UPDATE "locations"
SET "code" = 'GT-GUA'
WHERE "country" = 'Guatemala'
  AND "region" = 'Guatemala'
  AND "code" IS NULL;

UPDATE "locations"
SET "code" = 'MX-CDMX'
WHERE "country" = 'México'
  AND "region" = 'CDMX'
  AND "code" IS NULL;

UPDATE "locations"
SET "code" = 'CO-ANT'
WHERE "country" = 'Colombia'
  AND "region" = 'Antioquia'
  AND "code" IS NULL;

CREATE UNIQUE INDEX "locations_code_key" ON "locations" ("code");

-- 2) Agregados denormalizados en VendorProfile para el orden estable del directorio
--    (`rating_avg DESC NULLS LAST, created_at DESC, id DESC`). Se recomputan sólo cuando
--    cambian reviews (US-088 fuera del MVP; el seed demo hace un batch al final). Antes de
--    que existan reviews, `rating_avg` es NULL y `reviews_count` = 0.
ALTER TABLE "vendor_profiles"
  ADD COLUMN "rating_avg" NUMERIC(3, 2),
  ADD COLUMN "reviews_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill inicial desde `reviews` publicadas y no soft-deleted, por si el ambiente ya tiene
-- reviews seed antes de esta migración.
UPDATE "vendor_profiles" vp
SET
  "rating_avg" = agg."avg",
  "reviews_count" = agg."cnt"
FROM (
  SELECT
    r."vendor_profile_id" AS vpid,
    ROUND(AVG(r."rating")::numeric, 2) AS "avg",
    COUNT(*)::int AS "cnt"
  FROM "reviews" r
  WHERE r."status" = 'published' AND r."deleted_at" IS NULL
  GROUP BY r."vendor_profile_id"
) agg
WHERE vp."id" = agg.vpid;

-- 3) Índice compuesto para keyset pagination sobre vendors aprobados vivos. NULLS LAST alinea
--    el orden con el request (vendors sin reviews van al final). Partial index reduce tamaño.
CREATE INDEX "idx_vendor_profiles_directory"
  ON "vendor_profiles" ("rating_avg" DESC NULLS LAST, "created_at" DESC, "id" DESC)
  WHERE "status" = 'approved' AND "deleted_at" IS NULL;
