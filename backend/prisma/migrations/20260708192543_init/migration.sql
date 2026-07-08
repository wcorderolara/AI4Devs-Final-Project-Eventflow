-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('organizer', 'vendor', 'admin');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('GTQ', 'EUR', 'MXN', 'COP', 'USD');

-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('es-LATAM', 'es-ES', 'pt', 'en');

-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('openai', 'mock', 'anthropic');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "EventTaskStatus" AS ENUM ('pending', 'in_progress', 'done', 'skipped');

-- CreateEnum
CREATE TYPE "EventTaskOrigin" AS ENUM ('manual', 'ai');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('sent', 'viewed', 'responded', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "BookingIntentStatus" AS ENUM ('pending', 'confirmed_intent', 'cancelled');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('published', 'hidden', 'removed');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('unread', 'read');

-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('active', 'deleted');

-- CreateEnum
CREATE TYPE "VendorProfileStatus" AS ENUM ('pending', 'approved', 'rejected', 'hidden');

-- CreateEnum
CREATE TYPE "VendorServiceStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "AIRecommendationStatus" AS ENUM ('pending', 'accepted', 'edited', 'rejected', 'discarded', 'failed', 'expired');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "UserRole" NOT NULL,
    "preferred_language" "LanguageCode" NOT NULL DEFAULT 'es-LATAM',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "bio" TEXT,
    "status" "VendorProfileStatus" NOT NULL DEFAULT 'pending',
    "location_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_services" (
    "id" UUID NOT NULL,
    "vendor_profile_id" UUID NOT NULL,
    "service_category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "VendorServiceStatus" NOT NULL DEFAULT 'active',
    "price_min" DECIMAL(14,2),
    "price_max" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'active',
    "url" TEXT NOT NULL,
    "file_name" TEXT,
    "mime_type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type_id" UUID NOT NULL,
    "location_id" UUID,
    "title" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "currency" "CurrencyCode" NOT NULL DEFAULT 'GTQ',
    "language" "LanguageCode" NOT NULL DEFAULT 'es-LATAM',
    "event_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tasks" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "due_date" TIMESTAMPTZ(6),
    "status" "EventTaskStatus" NOT NULL DEFAULT 'pending',
    "origin" "EventTaskOrigin" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "event_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "total_planned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_committed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_items" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "category_code" TEXT,
    "amount_planned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amount_committed" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "service_category_id" UUID NOT NULL,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'sent',
    "ai_brief_meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "quote_request_id" UUID NOT NULL,
    "vendor_profile_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'GTQ',
    "valid_until" TIMESTAMPTZ(6),
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_intents" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "status" "BookingIntentStatus" NOT NULL DEFAULT 'pending',
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "booking_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "booking_intent_id" UUID NOT NULL,
    "vendor_profile_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'unread',
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_entity" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "ai_prompt_version_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "input_payload" JSONB NOT NULL,
    "output_payload" JSONB NOT NULL,
    "status" "AIRecommendationStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompt_versions" (
    "id" UUID NOT NULL,
    "prompt_key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "provider" "LLMProvider" NOT NULL,
    "template_checksum" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_code_key" ON "service_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_code_key" ON "event_types"("code");

-- CreateIndex
CREATE INDEX "vendor_profiles_location_id_idx" ON "vendor_profiles"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_profiles_user_id_key" ON "vendor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "vendor_services_vendor_profile_id_idx" ON "vendor_services"("vendor_profile_id");

-- CreateIndex
CREATE INDEX "vendor_services_service_category_id_idx" ON "vendor_services"("service_category_id");

-- CreateIndex
CREATE INDEX "attachments_owner_type_owner_id_idx" ON "attachments"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "events_user_id_idx" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "events_event_type_id_idx" ON "events"("event_type_id");

-- CreateIndex
CREATE INDEX "events_location_id_idx" ON "events"("location_id");

-- CreateIndex
CREATE INDEX "event_tasks_event_id_idx" ON "event_tasks"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_event_id_key" ON "budgets"("event_id");

-- CreateIndex
CREATE INDEX "budget_items_budget_id_idx" ON "budget_items"("budget_id");

-- CreateIndex
CREATE INDEX "quote_requests_event_id_idx" ON "quote_requests"("event_id");

-- CreateIndex
CREATE INDEX "quote_requests_service_category_id_idx" ON "quote_requests"("service_category_id");

-- CreateIndex
CREATE INDEX "quotes_quote_request_id_idx" ON "quotes"("quote_request_id");

-- CreateIndex
CREATE INDEX "quotes_vendor_profile_id_idx" ON "quotes"("vendor_profile_id");

-- CreateIndex
CREATE INDEX "booking_intents_quote_id_idx" ON "booking_intents"("quote_id");

-- CreateIndex
CREATE INDEX "reviews_vendor_profile_id_idx" ON "reviews"("vendor_profile_id");

-- CreateIndex
CREATE INDEX "reviews_booking_intent_id_idx" ON "reviews"("booking_intent_id");

-- CreateIndex
CREATE INDEX "reviews_author_id_idx" ON "reviews"("author_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "admin_actions_admin_user_id_idx" ON "admin_actions"("admin_user_id");

-- CreateIndex
CREATE INDEX "ai_recommendations_event_id_idx" ON "ai_recommendations"("event_id");

-- CreateIndex
CREATE INDEX "ai_recommendations_ai_prompt_version_id_idx" ON "ai_recommendations"("ai_prompt_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_versions_prompt_key_version_key" ON "ai_prompt_versions"("prompt_key", "version");

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_services" ADD CONSTRAINT "vendor_services_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_services" ADD CONSTRAINT "vendor_services_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_intents" ADD CONSTRAINT "booking_intents_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_intent_id_fkey" FOREIGN KEY ("booking_intent_id") REFERENCES "booking_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_ai_prompt_version_id_fkey" FOREIGN KEY ("ai_prompt_version_id") REFERENCES "ai_prompt_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
