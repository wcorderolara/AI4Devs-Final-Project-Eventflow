-- Fix directorio público: backfill de `vendor_profiles.slug` para perfiles sin slug.
-- US-040 agregó `slug` como NULLABLE sin backfill y el seed demo creaba vendors sin slug, por lo
-- que el directorio (`GET /public/vendors`) devolvía `slug: null` y la card enlazaba a
-- `/vendors/null`. Replica `slugify` (minúsculas, sin acentos, [a-z0-9-]) y, si el slug base ya
-- está tomado o se repite entre filas pendientes, agrega el prefijo del id para mantener UNIQUE.

WITH base AS (
  SELECT
    vp."id",
    COALESCE(
      NULLIF(
        left(
          trim(BOTH '-' FROM regexp_replace(
            regexp_replace(
              regexp_replace(
                translate(lower(vp."business_name"), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
                '[^a-z0-9\s-]', '', 'g'
              ),
              '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
          )),
          80
        ),
        ''
      ),
      'vendor'
    ) AS slug_base
  FROM "vendor_profiles" vp
  WHERE vp."slug" IS NULL
),
ranked AS (
  SELECT
    b."id",
    b.slug_base,
    row_number() OVER (PARTITION BY b.slug_base ORDER BY b."id") AS rn
  FROM base b
)
UPDATE "vendor_profiles" vp
SET "slug" = CASE
  WHEN r.rn = 1
    AND NOT EXISTS (SELECT 1 FROM "vendor_profiles" o WHERE o."slug" = r.slug_base)
    THEN r.slug_base
  ELSE r.slug_base || '-' || left(vp."id"::text, 8)
END
FROM ranked r
WHERE vp."id" = r."id";
