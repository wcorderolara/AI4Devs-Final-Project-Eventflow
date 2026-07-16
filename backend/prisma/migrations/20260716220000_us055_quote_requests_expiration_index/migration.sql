-- US-055 (PB-P1-033 / DB-001): índice parcial sobre `quote_requests(status, created_at)` para el
-- filtro del `ExpireQuoteRequestsJob`. La QR se crea con `status='sent'` (US-049) y `created_at`
-- funciona como `sent_at` semántico (el DTO de US-049 expone `sent_at: qr.createdAt.toISOString()`).
-- Sólo indexamos filas activas (`status IN ('sent','viewed')`) porque el job filtra exactamente
-- ese subconjunto; el índice parcial mantiene el tamaño acotado a cardinalidad "en vuelo" y evita
-- pagar mantenimiento por filas ya terminales (`responded`, `expired`, `cancelled`).
CREATE INDEX "idx_quote_requests_active_created_at" ON "quote_requests" ("status", "created_at")
  WHERE "status" IN ('sent', 'viewed');
