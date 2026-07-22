// US-071 (PB-P2-004 / BE-003). Puerto local del módulo `notifications` para validar
// existencia de `Event` en batch al resolver deep-links (`task_due_soon` requiere
// verificar `payload.eventId`). Vive dentro de `notifications` (no cross-module):
// el adapter Prisma consulta directamente la tabla `events` sin depender de
// `event-planning` para preservar boundaries (ver deviation D-03).

export interface NotificationLinkEventReader {
  /**
   * Retorna el conjunto de `eventId`s que existen. Ausencia ⇒ recurso removido/inexistente
   * (`link=null`). Sin filtrado por status: el link es válido incluso si el evento está
   * `completed`/`cancelled` (US-032 muestra banner read-only — EC-02 tech spec).
   */
  filterExistingEventIds(ids: string[]): Promise<Set<string>>;
}
