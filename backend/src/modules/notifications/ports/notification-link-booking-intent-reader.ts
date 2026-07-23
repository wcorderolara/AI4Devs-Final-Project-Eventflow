// US-070 (PB-P2-007 / BE-002). Puerto local del módulo `notifications` para
// validar existencia de `BookingIntent` en batch al resolver deep-links del type
// `booking_confirmed`. Vive dentro de `notifications` (no cross-module): el
// adapter Prisma consulta directamente `booking_intents` sin depender de
// `booking-intent` para preservar boundaries (mismo patrón que los readers de
// `Event` en US-071 y `QuoteRequest` en US-068).

export interface NotificationLinkBookingIntentReader {
  /** Retorna el subset de IDs de BookingIntent que existen (sin filtro por status). */
  filterExistingBookingIntentIds(ids: string[]): Promise<Set<string>>;
}
