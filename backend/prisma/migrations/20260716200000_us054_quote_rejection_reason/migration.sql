-- US-054 (PB-P1-032 / DB-001): agrega `quotes.rejection_reason` para persistir el motivo
-- opcional que captura el organizer al rechazar una Quote (D4 del decision resolution).
-- Columna NULLABLE sin backfill: Quotes previamente rechazadas conservan `rejection_reason = NULL`.
-- La longitud (0..500) se valida en el DTO Zod `rejectQuoteBody` — no se aplica CHECK físico
-- para preservar flexibilidad si el negocio decide subir el máximo en el futuro (patrón US-041).

ALTER TABLE "quotes" ADD COLUMN "rejection_reason" TEXT;
