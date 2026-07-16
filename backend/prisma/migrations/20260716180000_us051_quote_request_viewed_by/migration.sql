-- US-051 (PB-P1-031 / DB-001): agrega `quote_requests.viewed_by` para trazar qué usuario del
-- vendor disparó la transición `sent → viewed` (D3 del decision resolution). Columna NULLABLE
-- sin backfill: QRs existentes conservan `viewed_at` legado sin `viewed_by`. La FK a `users`
-- usa `ON DELETE RESTRICT` para preservar la auditoría aun cuando el usuario sea eliminado.
-- El índice apoya lookups reversos (ej. reportes de actividad del vendor por usuario).

ALTER TABLE "quote_requests" ADD COLUMN "viewed_by" UUID;

ALTER TABLE "quote_requests"
  ADD CONSTRAINT "quote_requests_viewed_by_fkey"
  FOREIGN KEY ("viewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "idx_quote_requests_viewed_by" ON "quote_requests" ("viewed_by");
