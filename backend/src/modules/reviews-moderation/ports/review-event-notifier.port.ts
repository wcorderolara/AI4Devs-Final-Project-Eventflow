// Consumer-owned port (US-065). El módulo `reviews-moderation` define el contrato de emisión
// de eventos `review.published` al vendor. El composition root (`organizer-review.routes.ts`)
// enlaza el `QuoteEventNotificationService` (US-060 BE-002) como adapter — patrón
// consumer-owned interface, consistente con `BookingEventNotifierPort` (US-060) y
// `BudgetCommittedSyncPort` (US-039).
import type { Prisma } from '@prisma/client';

export type ReviewEventName = 'review.published';

export interface EmitReviewEventInput {
  recipientUserId: string;
  eventName: ReviewEventName;
  payload: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
  correlationId?: string;
}

export interface ReviewEventNotifierPort {
  emit(input: EmitReviewEventInput): Promise<void>;
}
