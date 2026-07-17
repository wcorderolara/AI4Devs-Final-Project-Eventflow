// QuoteEventNotificationService (US-056 / BE-002 — refactor de US-054 QuoteNotificationService).
// Tech Spec §7 Service.
//
// Servicio común reutilizable que emite 2 `Notification` al recipient (usualmente el vendor)
// por cada evento del dominio de Quote/QuoteRequest:
//   - `channel='in_app'`,          `deliveryStatus='delivered'`.
//   - `channel='email_simulated'`, `deliveryStatus='simulated'` (BR-NOTIF-003).
//
// Ambas inserciones comparten `event` y `payload`, y se ejecutan a través de
// `QuoteNotificationSenderPort` (US-049 BE-002). Cuando la use case pasa `tx`, ambos INSERTs
// participan en la misma transacción (D7 — atomicidad) y un fallo revierte todo, incluyendo
// la mutación de negocio que las precede (UPDATE del Quote o QuoteRequest).
//
// El logger emite `quote.notification.emitted` con `{eventName, recipientUserId, quoteId?}`
// para trazar la fan-out sin exponer el payload (SEC-09).
//
// Eventos soportados (`QuoteEventName`):
//   - `quote.rejected`             (US-054 — rechazo del organizer).
//   - `quote.expired`              (US-053 — expiración por job).
//   - `quote_request.cancelled`    (US-056 — cancelación por el organizer).
//   - `quote.marked_preferred`     (US-058 — organizer marca preferred).
//   - `quote.unmarked_preferred`   (US-058 — organizer desmarca o cambia de Quote preferred).
//   - `booking_intent.created`     (US-060 — organizer acepta Quote y crea BookingIntent atómicamente).
//   - `booking_intent.confirmed`   (US-061 — vendor asignado confirma el BookingIntent).
//   - `booking_intent.cancelled`   (US-062 — organizer o vendor cancela el BookingIntent).
import type { QuoteNotificationSenderPort } from '../../../shared/application/quote-notification-sender.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { Prisma } from '@prisma/client';

export type QuoteEventName =
  | 'quote.rejected'
  | 'quote.expired'
  | 'quote_request.cancelled'
  | 'quote.marked_preferred'
  | 'quote.unmarked_preferred'
  | 'booking_intent.created'
  | 'booking_intent.confirmed'
  | 'booking_intent.cancelled';

export interface EmitQuoteEventInput {
  /** `users.id` del destinatario resuelto por la use case invocante (usualmente el vendor). */
  recipientUserId: string;
  /** Evento canónico del dominio Quote/QuoteRequest. */
  eventName: QuoteEventName;
  /** Payload persistido en `notifications.payload` (ambos canales comparten la misma shape). */
  payload: Record<string, unknown>;
  /** Transacción activa cuando la emisión debe ser atómica con la mutación de negocio. */
  tx?: Prisma.TransactionClient;
  /** ID de la Quote afectada — se incluye en el log agregado si el evento es `quote.*`. */
  quoteId?: string;
  /** Correlación operativa para el log agregado (`quote.notification.emitted`). */
  correlationId?: string;
}

export class QuoteEventNotificationService {
  constructor(
    private readonly notifications: QuoteNotificationSenderPort,
    private readonly logger: DomainEventLogger,
  ) {}

  async emit(input: EmitQuoteEventInput): Promise<void> {
    const { recipientUserId, eventName, payload, tx, quoteId, correlationId } = input;
    await this.notifications.notify({
      channel: 'in_app',
      recipientUserId,
      event: eventName,
      deliveryStatus: 'delivered',
      payload,
      tx,
    });
    await this.notifications.notify({
      channel: 'email_simulated',
      recipientUserId,
      event: eventName,
      deliveryStatus: 'simulated',
      payload,
      tx,
    });
    this.logger.emit('quote.notification.emitted', {
      correlationId,
      quoteId,
      eventName,
      vendorUserId: recipientUserId,
    });
  }
}
