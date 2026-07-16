// QuoteNotificationService (US-054 / BE-002). Tech Spec §7 Service.
//
// Servicio común reutilizable que emite 2 `Notification` al vendor por cada transición
// relevante de `Quote.status` (rejected/expired):
//   - `channel='in_app'`,          `deliveryStatus='delivered'`.
//   - `channel='email_simulated'`, `deliveryStatus='simulated'` (BR-NOTIF-003).
//
// Ambas inserciones comparten `event` y `payload`, y se ejecutan a través de
// `QuoteNotificationSenderPort` (US-049 BE-002). Cuando la use case pasa `tx`, ambos INSERTs
// participan en la misma transacción (D7 — atomicidad) y un fallo revierte todo, incluyendo
// el UPDATE del Quote que las precede.
//
// El logger emite `quote.notification.emitted` con `{eventName, quoteId, vendorUserId}` para
// trazar la fan-out. Los payloads NO se loguean (SEC-09).
import type { QuoteNotificationSenderPort } from '../../../shared/application/quote-notification-sender.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { Prisma } from '@prisma/client';

export type QuoteStateChangeEventName = 'quote.rejected' | 'quote.expired';

export interface EmitQuoteStateChangeInput {
  /** ID del Quote afectado (fuente del `quoteId` en logs). */
  quoteId: string;
  /** `users.id` del vendor destinatario — resuelto por la use case invocante. */
  vendorUserId: string;
  /** Evento canónico: `quote.rejected` (US-054) o `quote.expired` (US-053 refactor). */
  eventName: QuoteStateChangeEventName;
  /** Payload persistido en `notifications.payload` (ambos canales comparten la misma shape). */
  payload: Record<string, unknown>;
  /** Transacción activa cuando la emisión debe ser atómica con la mutación de negocio. */
  tx?: Prisma.TransactionClient;
  /** Correlación operativa para el log agregado (`quote.notification.emitted`). */
  correlationId?: string;
}

export class QuoteNotificationService {
  constructor(
    private readonly notifications: QuoteNotificationSenderPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async emitQuoteStateChange(input: EmitQuoteStateChangeInput): Promise<void> {
    const { quoteId, vendorUserId, eventName, payload, tx, correlationId } = input;
    await this.notifications.notify({
      channel: 'in_app',
      recipientUserId: vendorUserId,
      event: eventName,
      deliveryStatus: 'delivered',
      payload,
      tx,
    });
    await this.notifications.notify({
      channel: 'email_simulated',
      recipientUserId: vendorUserId,
      event: eventName,
      deliveryStatus: 'simulated',
      payload,
      tx,
    });
    this.logger.emit('quote.notification.emitted', {
      correlationId,
      quoteId,
      eventName,
      vendorUserId,
    });
  }
}
