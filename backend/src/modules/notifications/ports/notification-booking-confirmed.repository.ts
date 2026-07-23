// US-070 (PB-P2-007 / BE-001). Puerto `NotificationBookingConfirmedRepository`.
//
// Paralelo a `NotificationQuoteReceivedRepository` (US-069) pero dedicado a
// `type='booking_confirmed'` (canonical enum de `docs/16 §34.3`). Se emite
// BILATERAL: al organizer (`event.owner_id`) y al vendor (`vendor_profile.user_id`),
// cada uno con su propio `recipientRole` en `payload` para dispatch del link.
//
// La escritura opera dentro de la transacción del `ConfirmBookingIntentUseCase`
// (US-061) — el `tx` opcional permite compartir la conexión.
import type { Prisma } from '@prisma/client';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export type BookingConfirmedChannel = 'in_app' | 'email_simulated';
export type BookingConfirmedRecipientRole = 'organizer' | 'vendor';

export interface CreateBookingConfirmedNotificationInput {
  recipientUserId: string;
  recipientRole: BookingConfirmedRecipientRole;
  channel: BookingConfirmedChannel;
  languageCode: SupportedLanguage;
  bookingIntentId: string;
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  vendorProfileId: string;
  /** Título localizado (persistido en `payload.title` para render por US-071). */
  title: string;
  /** Body localizado (`payload.body`). */
  body: string;
}

export interface BookingConfirmedRepositoryOptions {
  tx?: Prisma.TransactionClient;
}

export interface NotificationBookingConfirmedRepository {
  /**
   * Retorna `true` si ya existe una `Notification(type='booking_confirmed')`
   * dirigida a `recipientUserId` con `payload.bookingIntentId=bookingIntentId`.
   * Idempotencia por recipient (D2): se aplica 2× por handler run (una por rol).
   * Filtro estrecho sobre `user_id + type` (cubierto por
   * `idx_notifications_user_status_sent`).
   */
  existsBookingConfirmedForRecipient(
    recipientUserId: string,
    bookingIntentId: string,
    opts?: BookingConfirmedRepositoryOptions,
  ): Promise<boolean>;

  /** Inserta una fila `notifications`. Sin chequeo de idempotencia interno. */
  create(
    input: CreateBookingConfirmedNotificationInput,
    opts?: BookingConfirmedRepositoryOptions,
  ): Promise<void>;
}
