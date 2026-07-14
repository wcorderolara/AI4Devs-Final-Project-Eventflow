-- US-031 (PB-P1-017): fill-in del esquema físico `event_tasks` para habilitar el bulk confirm HITL.
-- Alinea Prisma con Doc 18 §14.3 (columnas `ai_generated`, `ai_recommendation_id`) y agrega
-- las columnas de auditoría HITL (`confirmed_by_user_id`, `confirmed_at`) requeridas por SEC-07.
-- Extiende el enum `EventTaskStatus` con `active` para materializar la transición canónica
-- `pending → active` de la operación bulk. Aditiva y forward-only.
-- Backfill: se refleja `origin='ai'` en `ai_generated=TRUE` para preservar la semántica actual.
-- Autor: hand-authored en estilo Prisma.

-- AlterEnum
ALTER TYPE "EventTaskStatus" ADD VALUE IF NOT EXISTS 'active' AFTER 'pending';

-- AlterTable
ALTER TABLE "event_tasks"
  ADD COLUMN "ai_generated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ai_recommendation_id" UUID,
  ADD COLUMN "confirmed_by_user_id" UUID,
  ADD COLUMN "confirmed_at" TIMESTAMPTZ(6);

-- Backfill: `origin='ai'` marca semánticamente tareas IA. `ai_generated` refleja esa bandera.
UPDATE "event_tasks"
   SET "ai_generated" = TRUE
 WHERE "origin" = 'ai';

-- AddForeignKey
ALTER TABLE "event_tasks"
  ADD CONSTRAINT "event_tasks_ai_recommendation_id_fkey"
  FOREIGN KEY ("ai_recommendation_id") REFERENCES "ai_recommendations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event_tasks"
  ADD CONSTRAINT "event_tasks_confirmed_by_user_id_fkey"
  FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "event_tasks_event_id_ai_generated_status_idx"
  ON "event_tasks" ("event_id", "ai_generated", "status");

CREATE INDEX "event_tasks_ai_recommendation_id_idx"
  ON "event_tasks" ("ai_recommendation_id");
