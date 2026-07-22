-- US-026 (PB-P2-003 / DB-001) — Linaje de regeneración cross-cutting en `ai_recommendations`.
--
-- Motivación (D1): un `AIRecommendation` puede regenerarse hasta 5 veces por linaje (D2/D10).
-- Se agregan 3 columnas para materializar el árbol y la razón del usuario:
--   * `parent_recommendation_id` — padre directo (para navegar la cadena).
--   * `root_recommendation_id`   — raíz del linaje (contar niños del root, evita walking recursivo).
--   * `regeneration_feedback`    — texto libre ≤ 500 chars provisto por el usuario (D6).
--
-- Estrategia idempotente (compatible con datos existentes):
--   1. Añadir las 3 columnas nullables.
--   2. Añadir FKs self-referenciales con `ON DELETE SET NULL` (soft delete del padre no rompe
--      los hijos históricos; el 404 uniforme del use case se cubre en aplicación — deviation D-01
--      del execution record explica por qué no se usa `ON DELETE CASCADE`).
--   3. Índices para count por linaje (`root_id`) y navegación (`parent_id`).
--   4. Backfill: filas existentes se marcan como raíz de su propio linaje
--      (`root_recommendation_id = id`) — cumple D3 del tech spec.

ALTER TABLE "ai_recommendations"
  ADD COLUMN IF NOT EXISTS "parent_recommendation_id" UUID,
  ADD COLUMN IF NOT EXISTS "root_recommendation_id"   UUID,
  ADD COLUMN IF NOT EXISTS "regeneration_feedback"    TEXT;

-- FKs self-referenciales.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_rec_parent'
  ) THEN
    ALTER TABLE "ai_recommendations"
      ADD CONSTRAINT "fk_ai_rec_parent"
      FOREIGN KEY ("parent_recommendation_id") REFERENCES "ai_recommendations"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_rec_root'
  ) THEN
    ALTER TABLE "ai_recommendations"
      ADD CONSTRAINT "fk_ai_rec_root"
      FOREIGN KEY ("root_recommendation_id") REFERENCES "ai_recommendations"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- Índices para count por linaje y navegación.
CREATE INDEX IF NOT EXISTS "ai_recommendations_root_recommendation_id_idx"
  ON "ai_recommendations"("root_recommendation_id");
CREATE INDEX IF NOT EXISTS "ai_recommendations_parent_recommendation_id_idx"
  ON "ai_recommendations"("parent_recommendation_id");

-- Backfill (D3): filas preexistentes son raíces de su propio linaje.
UPDATE "ai_recommendations"
SET "root_recommendation_id" = "id"
WHERE "root_recommendation_id" IS NULL;
