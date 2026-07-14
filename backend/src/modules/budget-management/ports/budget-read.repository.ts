// US-035 (PB-P1-020 / BE-002, R1) — Port del repositorio de lectura del presupuesto.
// Ownership check separado (mirror del patrón US-027 / task-management) para permitir
// masked 404 antes del read del agregado. `getByEventId` retorna `null` si no existe
// `Budget` para el evento (caso borde: viola BR-BUDGET-001; se traduce a 404 en el use case).
import type { BudgetAggregateView } from '../domain/budget-view.js';

export interface BudgetReadRepository {
  /**
   * Verifica que el evento existe, no está soft-deleted y pertenece al `ownerId`.
   * SEC-06: masked 404 — evento ajeno / inexistente / soft-deleted colapsan en `false`.
   */
  isOwnedEvent(eventId: string, ownerId: string): Promise<boolean>;

  /**
   * Retorna el agregado `Budget + items + Event.currency` para el evento dado. Los `Decimal`
   * de Prisma se convierten a `number` en el adapter concreto para simplificar el use case.
   * Devuelve `null` si no existe `Budget` para el evento (caso borde).
   */
  getByEventId(eventId: string): Promise<BudgetAggregateView | null>;
}
