-- Migration US-101 (PB-P0-001): índices críticos vía raw SQL (funcional + parciales) + columnas de soporte.
-- Forward-only (ADR-DB-005). Naming Doc 18 §7. Raw SQL comentado por Doc 18 §28.3.
-- Columnas is_active/work_label/expires_at agregadas por resolución autorizada de BLK-001
-- (override de Tech Spec §10 "Sin columnas nuevas") para soportar los predicados exactos del AC-03.

-- ─────────────────────────────────────────────────────────────────────────────
-- Columnas de soporte (representables en PSL; generadas por Prisma desde el schema)
-- ─────────────────────────────────────────────────────────────────────────────

-- AlterTable
ALTER TABLE "ai_recommendations" ADD COLUMN     "expires_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "work_label" TEXT;

-- AlterTable
ALTER TABLE "vendor_services" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- ─────────────────────────────────────────────────────────────────────────────
-- Índice funcional único (AC-02)
-- ─────────────────────────────────────────────────────────────────────────────

-- Raw SQL: índice funcional único para login y unicidad case-insensitive de email (Doc 18 §13.3/§28.3)
CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" (LOWER("email"));

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices parciales no-únicos del catálogo Doc 18 §25 (AC-03)
-- ─────────────────────────────────────────────────────────────────────────────

-- Raw SQL: índice parcial para listados de eventos activos/borrador (Doc 18 §25)
CREATE INDEX "idx_events_status_event_date_active" ON "events" ("status", "event_date") WHERE "status" IN ('active', 'draft');

-- Raw SQL: índice parcial para job de cierre automático de eventos (BR-EVENT-013)
CREATE INDEX "idx_events_auto_complete_candidates" ON "events" ("event_date") WHERE "status" = 'active';

-- Raw SQL: índice parcial para reminders de tareas pendientes (Doc 18 §25)
CREATE INDEX "idx_event_tasks_due_date_pending" ON "event_tasks" ("due_date") WHERE "status" = 'pending';

-- Raw SQL: índice parcial para directorio público de proveedores aprobados (Doc 18 §25)
CREATE INDEX "idx_vendor_profiles_status_location" ON "vendor_profiles" ("status", "location_id") WHERE "status" = 'approved';

-- Raw SQL: índice parcial para servicios de vendor activos (Doc 18 §25)
CREATE INDEX "idx_vendor_services_active" ON "vendor_services" ("vendor_profile_id") WHERE "is_active" = true;

-- Raw SQL: índice parcial para selector de categorías activas (Doc 18 §25)
CREATE INDEX "idx_service_categories_active" ON "service_categories" ("is_active") WHERE "is_active" = true;

-- Raw SQL: índice parcial para conteo de solicitudes activas por categoría (C-027b)
CREATE INDEX "idx_quote_requests_event_category_active" ON "quote_requests" ("event_id", "service_category_id") WHERE "status" IN ('sent', 'viewed', 'responded');

-- Raw SQL: índice parcial para job de expiración de cotizaciones a 15 días (Doc 18 §16.2)
CREATE INDEX "idx_quotes_valid_until_active" ON "quotes" ("valid_until") WHERE "status" = 'sent';

-- Raw SQL: índice parcial para reseñas publicadas en el directorio (Doc 18 §25)
CREATE INDEX "idx_reviews_vendor_status_published" ON "reviews" ("vendor_profile_id") WHERE "status" = 'published';

-- Raw SQL: índice parcial para badge de notificaciones no leídas (Doc 18 §25)
CREATE INDEX "idx_notifications_user_unread" ON "notifications" ("user_id") WHERE "status" = 'unread';

-- Raw SQL: índice parcial para límite de 10 imágenes por trabajo del vendor (C-022)
CREATE INDEX "idx_attachments_vendor_work_active" ON "attachments" ("owner_id", "work_label") WHERE "owner_type" = 'vendor_work' AND "status" = 'active';

-- Raw SQL: índice parcial para job de expiración de AIRecommendation (Doc 18 §25)
CREATE INDEX "idx_ai_rec_pending_expires" ON "ai_recommendations" ("expires_at") WHERE "status" = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices parciales is_seed para reset quirúrgico de demo (AC-04; Doc 18 §27.5)
-- Uno por cada tabla operativa que declara is_seed (18 tablas; ai_prompt_versions excluida).
-- ─────────────────────────────────────────────────────────────────────────────

-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_users_is_seed" ON "users" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_locations_is_seed" ON "locations" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_service_categories_is_seed" ON "service_categories" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_event_types_is_seed" ON "event_types" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_vendor_profiles_is_seed" ON "vendor_profiles" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_vendor_services_is_seed" ON "vendor_services" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_attachments_is_seed" ON "attachments" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_events_is_seed" ON "events" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_event_tasks_is_seed" ON "event_tasks" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_budgets_is_seed" ON "budgets" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_budget_items_is_seed" ON "budget_items" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_quote_requests_is_seed" ON "quote_requests" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_quotes_is_seed" ON "quotes" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_booking_intents_is_seed" ON "booking_intents" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_reviews_is_seed" ON "reviews" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_notifications_is_seed" ON "notifications" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_admin_actions_is_seed" ON "admin_actions" ("is_seed") WHERE "is_seed" = true;
-- Raw SQL: índice parcial reset seed (Doc 18 §27.5)
CREATE INDEX "idx_ai_recommendations_is_seed" ON "ai_recommendations" ("is_seed") WHERE "is_seed" = true;
