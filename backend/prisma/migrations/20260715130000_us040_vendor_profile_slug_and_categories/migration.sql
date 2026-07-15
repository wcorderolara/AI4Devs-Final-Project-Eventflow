-- US-040 (PB-P1-024) — DB-001
-- Agrega `slug` UNIQUE a `vendor_profiles` y crea la tabla join M:N `vendor_profile_categories`.
-- `slug` es NULLABLE para retro-compatibilidad con perfiles legacy (los perfiles creados por
-- US-040 siempre persistirán el slug server-side). Índice UNIQUE aplica solo a filas con valor.

-- 1) `slug` en vendor_profiles
ALTER TABLE "vendor_profiles"
  ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "vendor_profiles_slug_key"
  ON "vendor_profiles" ("slug");

-- Índice de status (soporta admin queue y filtros del directorio público futuro).
CREATE INDEX "vendor_profiles_status_idx"
  ON "vendor_profiles" ("status");

-- 2) Tabla join M:N vendor_profile <-> service_category
CREATE TABLE "vendor_profile_categories" (
  "vendor_profile_id"    UUID NOT NULL,
  "service_category_id"  UUID NOT NULL,
  "created_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "vendor_profile_categories_pkey"
    PRIMARY KEY ("vendor_profile_id", "service_category_id"),

  CONSTRAINT "vendor_profile_categories_vendor_profile_id_fkey"
    FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT "vendor_profile_categories_service_category_id_fkey"
    FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "vendor_profile_categories_service_category_id_idx"
  ON "vendor_profile_categories" ("service_category_id");
