-- US-047 (PB-P1-041 / DB-002): columnas de auditoría de moderación en `vendor_profiles`
-- + `is_hidden` boolean separado del enum `VendorProfileStatus` (Decisión PO D2/D9).
--
--   `is_hidden`         → flag ortogonal al `status`. Un vendor `approved` puede alternar
--                          entre visible (`false`) y oculto (`true`) sin cambiar de status.
--                          Directorio público (US-045) y detalle público (US-046) filtran
--                          por `status='approved' AND is_hidden=false`.
--   `moderated_by`      → FK a `users(id)` (admin que ejecutó la última acción de moderación).
--   `moderated_at`      → timestamp de la última moderación (asignado por `ModerateVendorUseCase`).
--   `moderation_reason` → texto justificativo [10..500] chars (validado en Zod, no en SQL).
--                          NULL cuando la última acción no requirió reason (`approve`/`unhide`).
--   `admin_action_id`   → FK al último `AdminAction` disparado por la moderación (BR-ADMIN-011).
--
-- `is_hidden` requiere DEFAULT `false` porque toda fila existente pasa a ser visible por
-- omisión (paridad con la lectura previa que sólo miraba `status`); `NOT NULL` es seguro
-- porque la aplicación siempre setea el valor.
-- Las 4 columnas audit son NULLABLE porque los vendors pre-moderación (creación via US-040)
-- NO tienen registro de moderación — se poblarán en la transacción atómica del UseCase.
-- FKs con `ON DELETE RESTRICT` (paridad con `reviews_moderated_by_fkey` de US-067): un admin
-- no puede borrarse mientras tenga acciones históricas; un `AdminAction` es append-only.
--
-- `IF NOT EXISTS` en las 5 columnas es defensivo por si una migración externa ya introdujo
-- `is_hidden` (Tech Spec §10) — el patrón sigue siendo el mismo que US-102 en columnas base.
-- El índice parcial `idx_vendor_profiles_status_hidden` acelera el filtro `status='approved'
-- AND is_hidden=false` del directorio público sin indexar filas rechazadas/soft-deleted
-- (el CTE de búsqueda US-045 ya restringe `status='approved'`).
ALTER TABLE "vendor_profiles"
  ADD COLUMN IF NOT EXISTS "is_hidden"         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moderated_by"      uuid NULL,
  ADD COLUMN IF NOT EXISTS "moderated_at"      timestamptz(6) NULL,
  ADD COLUMN IF NOT EXISTS "moderation_reason" text NULL,
  ADD COLUMN IF NOT EXISTS "admin_action_id"   uuid NULL;

ALTER TABLE "vendor_profiles"
  ADD CONSTRAINT "vendor_profiles_moderated_by_fkey"
    FOREIGN KEY ("moderated_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendor_profiles"
  ADD CONSTRAINT "vendor_profiles_admin_action_id_fkey"
    FOREIGN KEY ("admin_action_id") REFERENCES "admin_actions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índice parcial: sólo cubre filas relevantes para el directorio público (`status='approved'`
-- y no soft-deleted). Consultas admin del historial de moderación por admin usan otros índices.
CREATE INDEX IF NOT EXISTS "idx_vendor_profiles_status_hidden"
  ON "vendor_profiles" ("status", "is_hidden")
  WHERE "deleted_at" IS NULL;
