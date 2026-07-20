-- US-075 (PB-P1-042 / DB-002): CRUD admin ServiceCategory + jerarquía 2 niveles + i18n.
-- Tech Spec §10. Migración menor sobre `service_categories`.
--
--   `name_i18n`         jsonb  → catálogo i18n-first (Decisión PO D3). Requerido con `es-LATAM`
--                                 en la capa Zod/UseCase; DEFAULT '{}' garantiza NOT NULL sin
--                                 romper filas legacy — el seed y los writes nuevos siempre
--                                 lo pueblan. `label` se mantiene como fallback denormalizado.
--   `description_i18n`  jsonb? → opcional. Fallback runtime a `description` cuando falte.
--   `parent_id`         uuid?  → self-ref FK (jerarquía 2 niveles). Enforcement en el UseCase
--                                 (409 INVALID_HIERARCHY_DEPTH). El CHECK `depth_level` ya
--                                 existe desde US-102 (`BETWEEN 1 AND 2`). ON DELETE RESTRICT
--                                 preserva integridad histórica del catálogo (soft delete).
--   `sort_order`        int    → orden dentro del mismo nivel (Decisión PO D8). DEFAULT 0.
--
-- `IF NOT EXISTS` en las 4 columnas es defensivo por si una migración externa ya introdujo
-- alguna (patrón US-047/US-102). El índice parcial `idx_service_categories_parent_active_sort`
-- acelera el ORDER BY del listado admin y público (`WHERE deleted_at IS NULL` con `is_active`
-- y `sort_order` en la clave compuesta). FK con `ON DELETE RESTRICT` alineado con el resto
-- de FKs sobre `service_categories` (VendorService, EventTask, Quote, etc.).
ALTER TABLE "service_categories"
  ADD COLUMN IF NOT EXISTS "name_i18n"        jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "description_i18n" jsonb NULL,
  ADD COLUMN IF NOT EXISTS "parent_id"        uuid NULL,
  ADD COLUMN IF NOT EXISTS "sort_order"       integer NOT NULL DEFAULT 0;

-- Backfill: hidrata `name_i18n` con `label` en filas legacy para que el catálogo actual sea
-- inmediatamente consumible por el nuevo endpoint público `{tree, flat}` sin ejecutar el
-- seed. Idempotente: sólo actúa si `name_i18n` es objeto vacío.
UPDATE "service_categories"
   SET "name_i18n" = jsonb_build_object('es-LATAM', "label")
 WHERE "name_i18n" = '{}'::jsonb;

-- Backfill: hidrata `description_i18n` desde `description` cuando exista y `description_i18n`
-- sea NULL. Filas sin `description` quedan con NULL (comportamiento esperado por el listado).
UPDATE "service_categories"
   SET "description_i18n" = jsonb_build_object('es-LATAM', "description")
 WHERE "description_i18n" IS NULL
   AND "description" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'service_categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "service_categories"
      ADD CONSTRAINT "service_categories_parent_id_fkey"
        FOREIGN KEY ("parent_id") REFERENCES "service_categories"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Índice compuesto para el listado ordenado del catálogo (admin + público). Cubre el
-- filtro por `parent_id` (raíces vs subcategorías), el filtro por `is_active` (público)
-- y el ORDER BY final por `sort_order`. Parcial sobre soft-deletion para evitar indexar
-- filas descartadas.
CREATE INDEX IF NOT EXISTS "idx_service_categories_parent_active_sort"
  ON "service_categories" ("parent_id", "is_active", "sort_order")
  WHERE "deleted_at" IS NULL;
