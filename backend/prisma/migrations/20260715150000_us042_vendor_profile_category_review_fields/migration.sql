-- US-042 (PB-P1-025) — Migración menor (EMERGENT-001).
-- Agrega los dos campos que el Tech Spec §10 asume entregados por PB-P0-001 pero que no
-- estaban en el schema real: `last_category_change_at` (timestamp del último cambio aplicado)
-- y `requires_admin_review` (flag que dispara la cola de revisión admin — D2).
-- El CHECK `category_change_count <= 5` y el default `0` ya existen en `chk_vendor_profiles_
-- category_change_max` (US-102 / PB-P0-001).

ALTER TABLE "vendor_profiles"
  ADD COLUMN "last_category_change_at" TIMESTAMPTZ(6),
  ADD COLUMN "requires_admin_review"   BOOLEAN NOT NULL DEFAULT false;
