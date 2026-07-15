-- US-037 (PB-P1-021) — Trazabilidad IA por fila en budget_items.
-- Aditiva y forward-only. Columna NULLABLE por compatibilidad con filas existentes
-- pre-US-037 (items manuales). FK a `ai_recommendations.id` con `ON DELETE SET NULL`
-- (recomendaciones eliminadas no rompen la trazabilidad; el item queda desasociado).
-- NO agrega soft delete (respeta ADR-DB-004): la política D2 de reemplazo se ejecuta
-- por hard delete filtrado por este campo + audit log estructurado.

ALTER TABLE "budget_items"
  ADD COLUMN "ai_recommendation_id" UUID;

ALTER TABLE "budget_items"
  ADD CONSTRAINT "budget_items_ai_recommendation_id_fkey"
    FOREIGN KEY ("ai_recommendation_id") REFERENCES "ai_recommendations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Índice para el predicado D2 (findReplaceable):
-- WHERE budget_id = ? AND ai_recommendation_id IS NOT NULL AND ai_recommendation_id != ?
CREATE INDEX "budget_items_ai_recommendation_id_idx"
  ON "budget_items"("ai_recommendation_id");
