-- US-095 (PB-P0-004): campos del contrato Event API faltantes en el modelo base US-099.
-- Aditiva y forward-only: `notes` (texto libre opcional), `auto_completed` (compat job PB-P1-009,
-- default false) y `completed_at` (nullable). No modifica datos existentes.
-- Autor: hand-authored en estilo Prisma (ver execution record §9 D1).

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "auto_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "notes" TEXT;
