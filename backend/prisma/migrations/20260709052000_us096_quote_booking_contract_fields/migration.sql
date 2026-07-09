-- US-096 (PB-P0-004): campos del contrato Quote/Booking faltantes en los modelos base US-099.
-- Aditiva y forward-only. No modifica datos existentes. Autor: hand-authored estilo Prisma.

-- AlterTable quote_requests
ALTER TABLE "quote_requests" ADD COLUMN     "ai_recommendation_id" UUID,
ADD COLUMN     "brief" JSONB,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "viewed_at" TIMESTAMPTZ(6);

-- AlterTable quotes
ALTER TABLE "quotes" ADD COLUMN     "accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "breakdown" JSONB,
ADD COLUMN     "conditions" TEXT,
ADD COLUMN     "expired_at" TIMESTAMPTZ(6),
ADD COLUMN     "is_preferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejected_at" TIMESTAMPTZ(6),
ADD COLUMN     "sent_at" TIMESTAMPTZ(6);

-- AlterTable booking_intents
ALTER TABLE "booking_intents" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "cancelled_by" UUID,
ADD COLUMN     "vendor_profile_id" UUID;

-- CreateIndex
CREATE INDEX "booking_intents_vendor_profile_id_idx" ON "booking_intents"("vendor_profile_id");

-- AddForeignKey
ALTER TABLE "booking_intents" ADD CONSTRAINT "booking_intents_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
