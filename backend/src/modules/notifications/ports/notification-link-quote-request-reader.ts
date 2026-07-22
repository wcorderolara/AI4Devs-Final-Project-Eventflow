// US-068 (PB-P2-005 / BE-002). Puerto local del módulo `notifications` para validar
// existencia de `QuoteRequest` en batch al resolver deep-links del type
// `quote_request_received`. Vive dentro de `notifications` (no cross-module):
// el adapter Prisma consulta directamente `quote_requests` sin depender de
// `quote-flow` para preservar boundaries (mismo patrón que el
// `NotificationLinkEventReader` de US-071).

export interface NotificationLinkQuoteRequestReader {
  /** Retorna el subset de IDs de QuoteRequest que existen (sin filtro por status). */
  filterExistingQuoteRequestIds(ids: string[]): Promise<Set<string>>;
}
