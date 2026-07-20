-- US-076 (PB-P1-043 / DB-002): CRUD admin EventType + i18n.
-- Tech Spec §10. Migración menor sobre `event_types`, paridad EXACTA con US-075 sin jerarquía.
--
--   `name_i18n`         jsonb  → catálogo i18n-first (Decisión PO D3). Requerido con `es-LATAM`
--                                 en la capa Zod/UseCase; DEFAULT '{}' garantiza NOT NULL sin
--                                 romper filas legacy — el seed y los writes nuevos siempre lo
--                                 pueblan. `label` se mantiene como fallback denormalizado.
--   `description_i18n`  jsonb? → opcional (Decisión PO D3). Fallback runtime a `description`.
--   `sort_order`        int    → orden explícito para el listado (Decisión PO D10). DEFAULT 0.
--
-- `IF NOT EXISTS` en las 3 columnas es defensivo por si una migración externa ya introdujo
-- alguna (patrón US-075). No hay `parent_id` (Decisión PO: sin jerarquía). El índice
-- compuesto acelera el ORDER BY del listado admin y público (`WHERE deleted_at IS NULL`
-- con `is_active` y `sort_order`).
ALTER TABLE "event_types"
  ADD COLUMN IF NOT EXISTS "name_i18n"        jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "description_i18n" jsonb NULL,
  ADD COLUMN IF NOT EXISTS "sort_order"       integer NOT NULL DEFAULT 0;

-- Backfill: hidrata `name_i18n` con `label` en filas legacy para que el catálogo actual
-- sea inmediatamente consumible por el nuevo endpoint público sin ejecutar el seed.
-- Idempotente: sólo actúa si `name_i18n` es objeto vacío.
UPDATE "event_types"
   SET "name_i18n" = jsonb_build_object('es-LATAM', "label")
 WHERE "name_i18n" = '{}'::jsonb;

-- Backfill: hidrata `description_i18n` desde `description` cuando exista y `description_i18n`
-- sea NULL. Filas sin `description` quedan con NULL.
UPDATE "event_types"
   SET "description_i18n" = jsonb_build_object('es-LATAM', "description")
 WHERE "description_i18n" IS NULL
   AND "description" IS NOT NULL;

-- Índice compuesto para el listado ordenado (admin + público). Cubre el filtro por
-- `is_active` (público) y el ORDER BY final por `sort_order`. Parcial sobre soft-deletion
-- para evitar indexar filas descartadas. Declarado SOLO en SQL raw — Prisma no soporta
-- `WHERE` en `@@index` (patrón US-066/US-075/US-102 sobre CI drift).
CREATE INDEX IF NOT EXISTS "idx_event_types_active_sort"
  ON "event_types" ("is_active", "sort_order")
  WHERE "deleted_at" IS NULL;
