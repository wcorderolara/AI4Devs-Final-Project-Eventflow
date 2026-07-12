-- US-012 (PB-P1-007): soft delete de eventos en estado `draft`. Aditiva y forward-only.
-- `deleted_at` marca la baja lógica; `deleted_by` guarda el userId del organizador que la ejecutó
-- (columna UUID simple, sin FK, para no requerir relación inversa en Prisma). No modifica datos
-- existentes (BR-EVENT-010: nunca hard delete). Autor: hand-authored en estilo Prisma.

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "deleted_by" UUID;
