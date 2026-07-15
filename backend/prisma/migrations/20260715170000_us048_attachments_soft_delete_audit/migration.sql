-- US-048 (PB-P1-026) — Migración menor (EMERGENT-001).
-- Agrega los dos campos de auditoría del soft delete que el Tech Spec §7 asume entregados
-- por PB-P0-001 pero que no estaban en el schema real: `deleted_by` (actor que dispara el
-- soft delete) y `deletion_reason` (opcional, 1..500 chars enforced en la capa Zod).
-- Ambos NULL permitido para preservar los attachments históricos y los que aún no fueron
-- soft-deleted. C-037 y C-060 (auditoría de soft delete) se satisfacen a nivel de aplicación
-- + estos campos.

ALTER TABLE "attachments"
  ADD COLUMN "deleted_by"      UUID,
  ADD COLUMN "deletion_reason" TEXT;
