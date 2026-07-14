-- US-027 (PB-P1-018): fundación real del listado paginado del checklist. Fill-in aditivo del
-- esquema físico `event_tasks` con las columnas asumidas por el Tech Spec §10 pero ausentes en
-- el esquema previo (`description`, `category_code`, `deleted_at`) y el índice canónico
-- `idx_event_tasks_event_status_due (event_id, status, due_date)` (Tech Spec §10 + Doc 18 §14).
-- Aditiva y forward-only; no rompe US-031 ni el enum `active` introducido allí.
-- Autor: hand-authored en estilo Prisma.

-- AlterTable
ALTER TABLE "event_tasks"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "category_code" TEXT,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

-- AddForeignKey — FK débil hacia `service_categories.code` con ON DELETE SET NULL para no
-- romper listados si el catálogo se retira. Ver US-027 AC-04 (categoryCode filtrable con literal
-- "null") + BR-TASK-008 (categoría opcional).
ALTER TABLE "event_tasks"
  ADD CONSTRAINT "event_tasks_category_code_fkey"
  FOREIGN KEY ("category_code") REFERENCES "service_categories"("code")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex — índice canónico de listado. Cubre ownership (`event_id`) + filtro por estado
-- + ordenamiento por `due_date ASC NULLS LAST` (US-027 AC-01, AC-05). Doc 18 §14 lo declara
-- como fundacional del checklist. El `WHERE deleted_at IS NULL` NO se agrega como partial para
-- no confundir el planner con el índice `event_tasks_event_id_ai_generated_status_idx` ya
-- presente; el filtro `deleted_at IS NULL` en las queries se aplica siempre y el planner elige
-- el índice adecuado según los predicados.
CREATE INDEX "idx_event_tasks_event_status_due"
  ON "event_tasks" ("event_id", "status", "due_date");
