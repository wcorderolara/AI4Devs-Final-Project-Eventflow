// US-039 (PB-P1-023 / BE-001) — Port definido por `booking-intent` para que el módulo
// `budget-management` sincronice `BudgetItem.committed` cuando el ciclo del BookingIntent
// transita a `confirmed_intent` o `cancelled`. La implementación (adapter) vive en
// `modules/budget-management/infrastructure/*` y participa en la `prisma.$transaction`
// abierta por el use case invocador (`ConfirmBookingIntent` / `CancelBookingIntent`).
//
// Contrato:
//   * El handler NUNCA abre transacción propia — el `tx` se inyecta.
//   * Ambos métodos son idempotentes por `bookingIntentId` (D1).
//   * `revertOnCancel` acepta la auditoría de cancelación como input (FR-BOOKING-005);
//     el invocador upstream también la persiste sobre `booking_intents`.
import type { Prisma } from '@prisma/client';

export interface BudgetSyncCancellationInput {
  at: Date;
  by: string;
  /**
   * US-062 (BE-001): `reason` es `string | null` — AC-03 permite cancelar sin razón. El handler
   * `revertOnCancel` no persiste el reason (la persistencia sobre `booking_intents.cancellation_reason`
   * la hace el UC US-062 upstream); el field vive en el port por auditoría transversal.
   */
  reason: string | null;
}

export interface BudgetCommittedSyncPort {
  applyOnConfirm(input: {
    bookingIntentId: string;
    tx: Prisma.TransactionClient;
    correlationId?: string;
  }): Promise<void>;

  revertOnCancel(input: {
    bookingIntentId: string;
    tx: Prisma.TransactionClient;
    cancellation: BudgetSyncCancellationInput;
    correlationId?: string;
  }): Promise<void>;
}

/** No-op adapter — útil como default para código que aún no cablea el sync real (tests, seeds). */
export const NoopBudgetCommittedSync: BudgetCommittedSyncPort = {
  async applyOnConfirm(): Promise<void> {
    /* intencionalmente vacío */
  },
  async revertOnCancel(): Promise<void> {
    /* intencionalmente vacío */
  },
};
