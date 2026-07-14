// US-036 (PB-P1-020 / BE-002, R1) — Reader del contexto (event + budget) requerido por las
// mutaciones de US-036 antes de aplicar cambios. Realiza tres verificaciones canónicas:
//   1. Ownership del evento (evento pertenece a `ownerId` y no está soft-deleted).
//   2. Estado del evento (debe estar en `{draft, active}` para permitir mutaciones — D3 / AC-06).
//   3. Localiza `Budget.id` del evento para las operaciones subsiguientes.
// Retorna `null` si ownership falla (masked 404 SEC-06). Si retorna, incluye `status` para que
// el use case decida `EVENT_NOT_EDITABLE` cuando corresponda.
export interface EventBudgetContext {
  eventStatus: 'draft' | 'active' | 'completed' | 'cancelled';
  budgetId: string;
}

export interface EventBudgetContextReader {
  find(eventId: string, ownerId: string): Promise<EventBudgetContext | null>;
}
