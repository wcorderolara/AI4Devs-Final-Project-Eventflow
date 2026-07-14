-- US-029 (PB-P1-018 / EMERGENT-001) — Auditoría de mutaciones PATCH/DELETE en event_tasks.
-- Aditiva y forward-only. Ambas columnas son NULLABLE por compatibilidad con filas existentes
-- pre-US-029. Cada mutación PATCH content / PATCH status persiste `updated_by_user_id`;
-- DELETE persiste `deleted_by_user_id` además. FKs a `users.id` con `ON DELETE SET NULL`
-- (usuarios eliminados no rompen la auditoría; el registro queda huérfano).

ALTER TABLE "event_tasks"
  ADD COLUMN "updated_by_user_id" UUID,
  ADD COLUMN "deleted_by_user_id" UUID;

ALTER TABLE "event_tasks"
  ADD CONSTRAINT "event_tasks_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "event_tasks_deleted_by_user_id_fkey"
    FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
