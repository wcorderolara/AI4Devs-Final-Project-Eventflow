-- US-050 (PB-P1-030 / DB-001): agrega `quote_requests.expires_at` para el conteo lazy del
-- endpoint `GET /api/v1/quote-requests/active-count` (EC-01). La columna es NULLABLE y sin
-- backfill: las QRs existentes quedan como "sin expiración explícita" y siguen contando
-- como activas mientras su `status` pertenezca al set activo. La transición formal a
-- `status='expired'` la asumirá un job batch (BR-QUOTE-005) en una US futura de lifecycle.
--
-- Índice `idx_quote_requests_expires_at` mantiene el filtro `expires_at > NOW()` acotado
-- cuando crezca la cardinalidad de QRs por evento (NFR-PERF-001). Se lista sin filtro
-- parcial para simplicidad y reutilización del planner.

ALTER TABLE "quote_requests" ADD COLUMN "expires_at" TIMESTAMPTZ(6);

CREATE INDEX "idx_quote_requests_expires_at" ON "quote_requests" ("expires_at");
