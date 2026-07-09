-- US-097 (PB-P0-004): contexto/owner/aiMeta de AIRecommendation para el contrato AI endpoints.
-- Aditiva y forward-only. `event_id`/`ai_prompt_version_id` pasan a nullable (vendor_bio sin evento;
-- prompt registry en PB-P0-010). Tabla vacía en el estado actual → `requested_by_user_id` NOT NULL seguro.

-- AlterTable: relajar NOT NULL solo en event_id (vendor_bio no tiene evento).
ALTER TABLE "ai_recommendations" ALTER COLUMN "event_id" DROP NOT NULL;

-- AlterTable: nuevas columnas
ALTER TABLE "ai_recommendations" ADD COLUMN     "ai_meta" JSONB,
ADD COLUMN     "quote_request_id" UUID,
ADD COLUMN     "requested_by_user_id" UUID NOT NULL,
ADD COLUMN     "vendor_profile_id" UUID;

-- CreateIndex
CREATE INDEX "ai_recommendations_requested_by_user_id_idx" ON "ai_recommendations"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "ai_recommendations_vendor_profile_id_idx" ON "ai_recommendations"("vendor_profile_id");

-- CreateIndex
CREATE INDEX "ai_recommendations_quote_request_id_idx" ON "ai_recommendations"("quote_request_id");

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
