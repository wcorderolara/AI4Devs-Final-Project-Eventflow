-- US-080 (PB-P1-046 / DB-001) — Índices B-tree para el visor admin del audit log
-- `GET /api/v1/admin/admin-actions`. Cubre listado cronológico + filtros por actor admin y por
-- entidad target puntual sin escaneo secuencial. NFR-PERF-001 (< 500ms p95).

CREATE INDEX IF NOT EXISTS "admin_actions_created_at_idx"
  ON "admin_actions" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "admin_actions_admin_user_id_created_at_idx"
  ON "admin_actions" ("admin_user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "admin_actions_target_entity_target_id_created_at_idx"
  ON "admin_actions" ("target_entity", "target_id", "created_at" DESC);
