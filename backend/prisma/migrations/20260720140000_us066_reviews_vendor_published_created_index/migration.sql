-- US-066 (PB-P1-039 / DB-001): índice parcial sobre `reviews (vendor_profile_id, created_at DESC,
-- id DESC) WHERE status='published'` que soporta el listado paginado por cursor keyset del
-- endpoint público `GET /api/v1/vendors/:id/reviews`. El orden estable `(created_at DESC, id DESC)`
-- coincide con el `ORDER BY` del UseCase (Tech Spec §7) y con el predicado de la próxima página
-- (`created_at < c.created_at OR (created_at = c.created_at AND id < c.id)`).
--
-- Complementa el índice existente `idx_reviews_vendor_status_published` (US-102) — que sólo
-- indexa por `(vendor_profile_id) WHERE status='published'` — añadiendo el orden secundario
-- necesario para evitar sort en memoria del planner cuando la lista crece.
--
-- Sólo indexamos `status='published'` porque el path caliente es público (no-admin). El path
-- admin (que ve todos los status) usa el índice general `reviews_vendor_profile_id_idx` +
-- filesort acotado — aceptable per Tech Spec §10.
CREATE INDEX "idx_reviews_vendor_published_created"
  ON "reviews" ("vendor_profile_id", "created_at" DESC, "id" DESC)
  WHERE "status" = 'published';
