-- US-067 (PB-P1-040 / DB-002): 4 columnas de auditoría de moderación en `reviews`.
-- Tech Spec §10; Decisión PO D3.
--
--   `moderated_by`      → FK a `users(id)` (admin que moderó).
--   `moderated_at`      → timestamp de la última moderación (asignado por el UseCase).
--   `moderation_reason` → texto justificativo [10..500] chars (validado en Zod, no en SQL).
--   `admin_action_id`   → FK al último `AdminAction` disparado por la moderación (BR-ADMIN-011).
--
-- Todas NULLABLE porque las reviews `published` (creación normal via US-065) NO tienen
-- registro de moderación. Se poblarán en la transacción atómica del `ModerateReviewUseCase`
-- junto con el `status='hidden'|'removed'`. FR-REVIEW-005 prohibe hard delete: sólo se
-- persisten estas 4 columnas + `status` — nunca se borran filas.
--
-- FK usan `ON DELETE RESTRICT` por defecto de Prisma (paridad con las FK de review a
-- users/vendor_profiles): un admin no puede borrarse mientras tenga acciones históricas;
-- un `AdminAction` no puede borrarse (append-only per Doc 14 §admin_actions).
--
-- Índice parcial `idx_reviews_moderated_by_at` cubre listados admin del historial de
-- moderación por admin (auditoría). `WHERE moderated_at IS NOT NULL` evita indexar las
-- reviews `published` (99% del volumen), manteniéndolo compacto.
ALTER TABLE "reviews"
  ADD COLUMN "moderated_by"      uuid NULL,
  ADD COLUMN "moderated_at"      timestamptz(6) NULL,
  ADD COLUMN "moderation_reason" text NULL,
  ADD COLUMN "admin_action_id"   uuid NULL;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_moderated_by_fkey"
    FOREIGN KEY ("moderated_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_admin_action_id_fkey"
    FOREIGN KEY ("admin_action_id") REFERENCES "admin_actions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "idx_reviews_moderated_by_at"
  ON "reviews" ("moderated_by", "moderated_at" DESC)
  WHERE "moderated_at" IS NOT NULL;
