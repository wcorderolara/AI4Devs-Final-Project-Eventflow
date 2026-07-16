-- US-044 / PB-P1-027 — Evolución de `vendor_services` para el CRUD del vendor.
-- Añade `package_name`, `base_price`, `currency_code`, `ai_generated_description`;
-- retira `title`, `price_min`, `price_max`, `status` (no usados por ninguna feature).
-- La tabla sólo era escrita por el seed demo (no hay tráfico real); backfill defensivo.
BEGIN;

-- 1) Nuevas columnas aditivas (nullable primero para backfill).
ALTER TABLE "vendor_services" ADD COLUMN "package_name" TEXT;
ALTER TABLE "vendor_services" ADD COLUMN "base_price" NUMERIC(14, 2);
ALTER TABLE "vendor_services" ADD COLUMN "currency_code" "CurrencyCode" NOT NULL DEFAULT 'GTQ';
ALTER TABLE "vendor_services" ADD COLUMN "ai_generated_description" BOOLEAN NOT NULL DEFAULT false;

-- 2) Backfill defensivo (por si existieran filas de seed demo previas).
UPDATE "vendor_services" SET "package_name" = COALESCE("title", 'Paquete');
UPDATE "vendor_services" SET "base_price" = COALESCE("price_min", 0);
UPDATE "vendor_services" SET "description" = COALESCE("description", 'Descripción no disponible');

-- 3) Enforzar NOT NULL post-backfill.
ALTER TABLE "vendor_services" ALTER COLUMN "package_name" SET NOT NULL;
ALTER TABLE "vendor_services" ALTER COLUMN "base_price" SET NOT NULL;
ALTER TABLE "vendor_services" ALTER COLUMN "description" SET NOT NULL;

-- 4) Retirar CHECK anterior (basado en price_min/price_max) y añadir el nuevo (base_price).
ALTER TABLE "vendor_services" DROP CONSTRAINT IF EXISTS "chk_vendor_services_base_price_nonneg";
ALTER TABLE "vendor_services"
  ADD CONSTRAINT "chk_vendor_services_base_price_nonneg" CHECK ("base_price" >= 0);

-- 5) Retirar columnas obsoletas y el enum `VendorServiceStatus` (sin consumidores).
ALTER TABLE "vendor_services" DROP COLUMN "title";
ALTER TABLE "vendor_services" DROP COLUMN "price_min";
ALTER TABLE "vendor_services" DROP COLUMN "price_max";
ALTER TABLE "vendor_services" DROP COLUMN "status";
DROP TYPE IF EXISTS "VendorServiceStatus";

COMMIT;
