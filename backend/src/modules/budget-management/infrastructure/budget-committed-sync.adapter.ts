// US-039 (PB-P1-023 / BE-002) — Adapter que implementa el port `BudgetCommittedSyncPort`
// (definido en `modules/booking-intent`) delegando al use case
// `UpdateCommittedFromBookingIntentUseCase` de `modules/budget-management`.
//
// Es la única superficie por la que `ConfirmBookingIntentUseCase` y `CancelBookingIntentUseCase`
// invocan el sync — así el módulo consumidor no depende de la implementación interna del handler.
import type {
  BudgetCommittedSyncPort,
  BudgetSyncCancellationInput,
} from '../../booking-intent/ports/budget-committed-sync.port.js';
import type { Prisma } from '@prisma/client';
import type { UpdateCommittedFromBookingIntentUseCase } from '../application/update-committed-from-booking-intent.use-case.js';

export class BudgetCommittedSyncAdapter implements BudgetCommittedSyncPort {
  constructor(private readonly useCase: UpdateCommittedFromBookingIntentUseCase) {}

  async applyOnConfirm(input: {
    bookingIntentId: string;
    tx: Prisma.TransactionClient;
    correlationId?: string;
  }): Promise<void> {
    await this.useCase.applyOnConfirm(input);
  }

  async revertOnCancel(input: {
    bookingIntentId: string;
    tx: Prisma.TransactionClient;
    cancellation: BudgetSyncCancellationInput;
    correlationId?: string;
  }): Promise<void> {
    await this.useCase.revertOnCancel(input);
  }
}
