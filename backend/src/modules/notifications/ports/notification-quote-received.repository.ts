// US-069 (PB-P2-006 / BE-001). Puerto `NotificationQuoteReceivedRepository`.
//
// Paralelo a `NotificationQrReceivedRepository` (US-068) pero dedicado a
// `type='quote_received'` (canonical enum de `docs/16 §34.3`). Se emite al
// organizer cuando el vendor pasa la `Quote` a `sent`. Los campos `channel` y
// `languageCode` viajan en `payload` (herencia US-034 D-01).
//
// La escritura opera dentro de la transacción del `RespondQuoteRequestUs052UseCase`
// (US-052) — el `tx` opcional permite compartir la conexión.
import type { Prisma } from '@prisma/client';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export type QuoteReceivedChannel = 'in_app' | 'email_simulated';

export interface CreateQuoteReceivedNotificationInput {
  organizerUserId: string;
  channel: QuoteReceivedChannel;
  languageCode: SupportedLanguage;
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  vendorProfileId: string;
  /** Título localizado (persistido en `payload.title` para que US-071 lo renderice). */
  title: string;
  /** Body localizado (`payload.body`). */
  body: string;
}

export interface QuoteReceivedRepositoryOptions {
  tx?: Prisma.TransactionClient;
}

export interface NotificationQuoteReceivedRepository {
  /**
   * Retorna `true` si ya existe una `Notification(type='quote_received')`
   * dirigida a `organizerUserId` con `payload.quoteId=quoteId`.
   * Filtro estrecho sobre `user_id + type` (cubierto por
   * `idx_notifications_user_status_sent`).
   */
  existsQuoteReceivedForQuote(
    organizerUserId: string,
    quoteId: string,
    opts?: QuoteReceivedRepositoryOptions,
  ): Promise<boolean>;

  /** Inserta una fila `notifications`. Sin chequeo de idempotencia interno. */
  create(
    input: CreateQuoteReceivedNotificationInput,
    opts?: QuoteReceivedRepositoryOptions,
  ): Promise<void>;
}
