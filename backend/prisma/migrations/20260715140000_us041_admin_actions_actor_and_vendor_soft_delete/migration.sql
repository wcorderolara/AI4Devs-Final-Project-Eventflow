-- US-041 (PB-P1-024) — Migración menor.
-- 1) `admin_actions.admin_user_id` pasa a NULLABLE + se agregan columnas de actor efectivo y
--    correlación (AC-02, SEC-05). Permite auditar acciones disparadas por el vendor
--    (`vendor_pending_after_major_edit`, D2) sin fabricar un adminUserId.
-- 2) `vendor_profiles.deleted_by` (AC-05 / D4) para trazar quién ejecutó el soft delete.
--    Sin FK explícita — simetría con `events.deleted_by`.

-- 1a) Drop FK, hacer NULLABLE, recrear FK con onDelete Restrict.
ALTER TABLE "admin_actions"
  DROP CONSTRAINT IF EXISTS "admin_actions_admin_user_id_fkey";

ALTER TABLE "admin_actions"
  ALTER COLUMN "admin_user_id" DROP NOT NULL;

ALTER TABLE "admin_actions"
  ADD CONSTRAINT "admin_actions_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "users"("id")
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- 1b) Actor efectivo (vendor/organizer/admin) + correlationId + índices.
ALTER TABLE "admin_actions"
  ADD COLUMN "actor_user_id"   UUID,
  ADD COLUMN "actor_role"      TEXT,
  ADD COLUMN "correlation_id"  TEXT;

CREATE INDEX "admin_actions_actor_user_id_idx"
  ON "admin_actions" ("actor_user_id");

CREATE INDEX "admin_actions_target_entity_target_id_idx"
  ON "admin_actions" ("target_entity", "target_id");

-- 2) vendor_profiles.deleted_by
ALTER TABLE "vendor_profiles"
  ADD COLUMN "deleted_by" UUID;
