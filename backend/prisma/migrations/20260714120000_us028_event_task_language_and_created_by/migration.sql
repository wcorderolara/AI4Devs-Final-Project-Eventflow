-- US-028 (PB-P1-018): fundación real para AC-01 del endpoint POST /events/:eventId/tasks.
-- Fill-in aditivo del esquema físico `event_tasks` con las columnas exigidas por AC-01 pero
-- ausentes en el esquema previo (post US-027 EMERGENT-001):
--   * `language_code`  — hereda `event.language_code` en el momento del insert (BR-AI-011).
--   * `created_by_user_id` — auditoría intrínseca (SEC-09; distinto de `confirmed_by_user_id`
--     que ya existe y sólo se usa en el flujo HITL de US-025/US-031).
-- Ambas columnas NULLABLE para no requerir backfill de filas existentes (tareas IA de US-018/
-- US-025/US-031 y tareas manuales anteriores). Forward-only, aditiva; no rompe US-027 ni US-031.

-- AlterTable — nuevas columnas nullables.
ALTER TABLE "event_tasks"
  ADD COLUMN "language_code" "LanguageCode",
  ADD COLUMN "created_by_user_id" UUID;

-- AddForeignKey — FK débil hacia `users.id` con ON DELETE SET NULL para no romper tareas si el
-- usuario se retira. `created_by_user_id` es puramente de auditoría, no participa en semántica
-- de negocio.
ALTER TABLE "event_tasks"
  ADD CONSTRAINT "event_tasks_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
