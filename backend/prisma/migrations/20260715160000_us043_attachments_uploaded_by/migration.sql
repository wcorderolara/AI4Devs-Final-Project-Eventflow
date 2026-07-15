-- US-043 (PB-P1-026) — Migración menor (EMERGENT-001).
-- Agrega `uploaded_by` a `attachments`, referenciado por AC-01 y por el log
-- `vendor.portfolio.uploaded` (§14 Tech Spec). NULL permitido para preservar los
-- attachments históricos insertados por seed antes de US-043.
-- Sin FK formal contra `users(id)` para mantener el patrón polimórfico (Doc 18 §19) y
-- evitar bloquear soft-deletes de usuarios; la referencia lógica se documenta en el
-- schema Prisma. `deleted_by`/`deletion_reason` se entregan con US-048 (DELETE soft).

ALTER TABLE "attachments"
  ADD COLUMN "uploaded_by" UUID;
