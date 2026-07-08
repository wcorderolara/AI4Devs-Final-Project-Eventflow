/*
  Warnings:

  - Added the required column `prompt_id` to the `ai_prompt_versions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_id` to the `booking_intents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_category_id` to the `booking_intents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AIPromptVersionStatus" AS ENUM ('active', 'deprecated');

-- AlterTable
ALTER TABLE "ai_prompt_versions" ADD COLUMN     "prompt_id" UUID NOT NULL,
ADD COLUMN     "status" "AIPromptVersionStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "ai_recommendations" ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timeout_ms" INTEGER NOT NULL DEFAULT 60000;

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "size_bytes" INTEGER;

-- AlterTable
ALTER TABLE "booking_intents" ADD COLUMN     "event_id" UUID NOT NULL,
ADD COLUMN     "is_simulated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "service_category_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "estimated_budget" DECIMAL(14,2),
ADD COLUMN     "guests_count" INTEGER;

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "vendor_profile_id" UUID;

-- AlterTable
ALTER TABLE "service_categories" ADD COLUMN     "depth_level" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "category_change_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "languages_supported" TEXT[];

-- CreateIndex
CREATE INDEX "ai_prompt_versions_prompt_id_idx" ON "ai_prompt_versions"("prompt_id");

-- CreateIndex
CREATE INDEX "booking_intents_event_id_idx" ON "booking_intents"("event_id");

-- CreateIndex
CREATE INDEX "booking_intents_service_category_id_idx" ON "booking_intents"("service_category_id");

-- CreateIndex
CREATE INDEX "quote_requests_vendor_profile_id_idx" ON "quote_requests"("vendor_profile_id");

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_intents" ADD CONSTRAINT "booking_intents_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_intents" ADD CONSTRAINT "booking_intents_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- US-102 — Check constraints (16). Doc 18 §13.3/§14.x/§15.x/§16.x/§19.1/§21.1.
-- Nota: NULL en columnas nullable pasa el CHECK (semántica SQL estándar).
-- ─────────────────────────────────────────────────────────────────────────────

-- Raw SQL: check Doc 18 §13.3 — email no vacío
ALTER TABLE "users" ADD CONSTRAINT "chk_users_email_not_empty" CHECK ("email" <> '');
-- Raw SQL: check Doc 18 §13.3 — password_hash no vacío
ALTER TABLE "users" ADD CONSTRAINT "chk_users_password_hash_not_empty" CHECK ("password_hash" <> '');
-- Raw SQL: check C-009 — guests_count >= 1
ALTER TABLE "events" ADD CONSTRAINT "chk_events_guests_count_positive" CHECK ("guests_count" >= 1);
-- Raw SQL: check C-010 — estimated_budget >= 0
ALTER TABLE "events" ADD CONSTRAINT "chk_events_estimated_budget_nonneg" CHECK ("estimated_budget" >= 0);
-- Raw SQL: check Doc 18 §14.4 — totales de budget no negativos
ALTER TABLE "budgets" ADD CONSTRAINT "chk_budgets_totals_nonneg" CHECK ("total_planned" >= 0 AND "total_committed" >= 0);
-- Raw SQL: check C-017 — montos de budget_item no negativos (paid no existe en el schema US-099)
ALTER TABLE "budget_items" ADD CONSTRAINT "chk_budget_items_amounts_nonneg" CHECK ("amount_planned" >= 0 AND "amount_committed" >= 0);
-- Raw SQL: check C-022b / Doc 18 §15.1 — cambios de categoría <= 5
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "chk_vendor_profiles_category_change_max" CHECK ("category_change_count" <= 5);
-- Raw SQL: check Doc 18 §15.1 — al menos un idioma soportado
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "chk_vendor_profiles_languages_not_empty" CHECK (cardinality("languages_supported") > 0);
-- Raw SQL: check Doc 18 §15.2 — precios no negativos (schema US-099 usa price_min/price_max)
ALTER TABLE "vendor_services" ADD CONSTRAINT "chk_vendor_services_base_price_nonneg" CHECK ("price_min" >= 0 AND "price_max" >= 0);
-- Raw SQL: check C-026b — profundidad de categoría entre 1 y 2
ALTER TABLE "service_categories" ADD CONSTRAINT "chk_service_categories_depth_level" CHECK ("depth_level" BETWEEN 1 AND 2);
-- Raw SQL: check Doc 18 §16.2 — total de quote no negativo (schema US-099 usa amount)
ALTER TABLE "quotes" ADD CONSTRAINT "chk_quotes_total_price_nonneg" CHECK ("amount" >= 0);
-- Raw SQL: check C-038 — booking siempre simulado en MVP (sin pagos reales)
ALTER TABLE "booking_intents" ADD CONSTRAINT "chk_booking_intents_is_simulated" CHECK ("is_simulated" = true);
-- Raw SQL: check C-041 — rating entero 1..5 (BR-REVIEW-003)
ALTER TABLE "reviews" ADD CONSTRAINT "chk_reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
-- Raw SQL: check Doc 18 §19.1 — tamaño de archivo no negativo
ALTER TABLE "attachments" ADD CONSTRAINT "chk_attachments_size_bytes_nonneg" CHECK ("size_bytes" >= 0);
-- Raw SQL: check Doc 18 §21.1 — timeout_ms positivo
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "chk_ai_recommendations_timeout_positive" CHECK ("timeout_ms" > 0);
-- Raw SQL: check Doc 18 §21.1 — retry_count entre 0 y 1
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "chk_ai_recommendations_retry_max" CHECK ("retry_count" BETWEEN 0 AND 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- US-102 — Unique parciales (4). Reglas de negocio dependientes de estado.
-- ─────────────────────────────────────────────────────────────────────────────

-- Raw SQL: unique parcial C-027 — una solicitud activa por (event, vendor) (BR-QUOTE-004)
CREATE UNIQUE INDEX "uq_quote_requests_event_vendor_active" ON "quote_requests" ("event_id", "vendor_profile_id") WHERE "status" IN ('sent', 'viewed', 'responded');
-- Raw SQL: unique parcial C-030 — una quote vigente por request (BR-QUOTE-013)
CREATE UNIQUE INDEX "uq_quotes_request_active" ON "quotes" ("quote_request_id") WHERE "status" NOT IN ('expired', 'rejected');
-- Raw SQL: unique parcial C-037 — un confirmed_intent por (event, category) (BR-BOOKING-007)
CREATE UNIQUE INDEX "uq_booking_intents_event_category_confirmed" ON "booking_intents" ("event_id", "service_category_id") WHERE "status" = 'confirmed_intent';
-- Raw SQL: unique parcial Doc 18 §21.2 — una versión activa por prompt
CREATE UNIQUE INDEX "uq_prompt_versions_active" ON "ai_prompt_versions" ("prompt_id") WHERE "status" = 'active';
