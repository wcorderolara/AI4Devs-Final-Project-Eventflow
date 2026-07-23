// US-070 (PB-P2-007 / BE-004). `OnBookingConfirmedHandler` — emite las notifs
// `booking_confirmed` BILATERALES (organizer + vendor) tras confirmarse un
// `BookingIntent`.
//
// Invocado in-tx desde `ConfirmBookingIntentUseCase` (US-061 refactor de BE-005).
// Guards defensivos (D7: status != `confirmed_intent` / event ausente / recipient
// deactivated) NO abortan la transacción: se registran como `warn` estructurado y
// el handler continúa (skip por recipient) o retorna (skip global). Cualquier
// fallo del INSERT o del `existsBookingConfirmedForRecipient` propaga a la tx →
// rollback (AC-06).
//
// Dedup self-notification (AC-08 / D7): si `event.ownerId == vendorProfile.userId`
// (seed corrupto o cuenta dual), sólo se emite 1 par con `recipientRole='organizer'`
// (rol prioritario) — nunca 2 pares al mismo `userId`.
import type { Prisma } from '@prisma/client';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import type { NotificationBookingConfirmedRepository } from '../ports/notification-booking-confirmed.repository.js';
import type { SimulatedBookingConfirmedEmailPort } from '../ports/simulated-booking-confirmed-email.port.js';
import { renderBookingConfirmedTemplate } from '../i18n/booking-confirmed-templates.js';
import type { BookingConfirmedRole } from '../i18n/booking-confirmed-templates.js';

/**
 * Lookup del idioma del recipient. Estructuralmente compatible con
 * `OrganizerLanguageLookup` (US-082) — mismo shape para permitir reuso del
 * adapter `PrismaOrganizerLanguageLookup` para AMBOS recipients.
 */
export interface RecipientLanguagePreferenceReader {
  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null>;
}

/** Contrato mínimo del logger. */
export interface OnBookingConfirmedLogger {
  info(payload: Record<string, unknown>): void;
  warn(payload: Record<string, unknown>): void;
}

/** Input del handler (subset mínimo requerido). */
export interface OnBookingConfirmedInput {
  bookingIntent: {
    id: string;
    /** Enum Prisma `BookingIntentStatus`; el guard defensivo aceptado es 'confirmed_intent'. */
    status: string;
  };
  quote: { id: string };
  quoteRequest: { id: string };
  event: {
    id: string;
    ownerId: string;
    /** Enum Prisma (`es_LATAM`, `pt`, …) o código API. */
    language: string;
  };
  vendorProfile: { id: string; userId: string };
  /**
   * Estado de ambos recipients ya resuelto por el UC upstream (single query JOIN).
   * `null` significa "usuario inexistente" → guard defensivo skip parcial.
   */
  organizerUserStatus: 'active' | 'suspended' | 'deactivated' | null;
  vendorUserStatus: 'active' | 'suspended' | 'deactivated' | null;
  correlationId: string;
  tx: Prisma.TransactionClient;
}

export interface OnBookingConfirmedHandlerDeps {
  notificationRepo: NotificationBookingConfirmedRepository;
  languageLookup: RecipientLanguagePreferenceReader;
  emailAdapter: SimulatedBookingConfirmedEmailPort;
  logger: OnBookingConfirmedLogger;
}

interface Recipient {
  userId: string;
  role: BookingConfirmedRole;
  status: 'active' | 'suspended' | 'deactivated' | null;
}

export class OnBookingConfirmedHandler {
  constructor(private readonly deps: OnBookingConfirmedHandlerDeps) {}

  async handle(input: OnBookingConfirmedInput): Promise<void> {
    const { notificationRepo, languageLookup, emailAdapter, logger } = this.deps;
    const {
      bookingIntent,
      quote,
      quoteRequest,
      event,
      vendorProfile,
      organizerUserStatus,
      vendorUserStatus,
      correlationId,
      tx,
    } = input;

    // Guards globales (AC-07 / D7). US-061 upstream garantiza el estado consistente
    // (bookingIntent='confirmed_intent', event vigente); estos checks son defensa en
    // profundidad — un skip global nunca aborta la tx.
    if (bookingIntent.status !== 'confirmed_intent') {
      logger.warn({
        event: 'notif.bookingConfirmed.skipped',
        reason: 'booking_intent_not_confirmed',
        correlationId,
        bookingIntentId: bookingIntent.id,
        bookingIntentStatus: bookingIntent.status,
      });
      return;
    }
    if (!event.ownerId || !vendorProfile.userId) {
      logger.warn({
        event: 'notif.bookingConfirmed.skipped',
        reason: 'recipient_id_null',
        correlationId,
        bookingIntentId: bookingIntent.id,
        eventId: event.id,
      });
      return;
    }

    // Dedup self-notification (AC-08 / D7). Si organizer == vendor por `user_id`,
    // se emite 1 par con rol `organizer` prioritario.
    const isSelfNotification = event.ownerId === vendorProfile.userId;
    if (isSelfNotification) {
      logger.info({
        event: 'notif.bookingConfirmed.self_notification',
        correlationId,
        bookingIntentId: bookingIntent.id,
        recipientUserId: event.ownerId,
      });
    }

    const recipients: Recipient[] = isSelfNotification
      ? [{ userId: event.ownerId, role: 'organizer', status: organizerUserStatus }]
      : [
          { userId: event.ownerId, role: 'organizer', status: organizerUserStatus },
          {
            userId: vendorProfile.userId,
            role: 'vendor',
            status: vendorUserStatus,
          },
        ];

    for (const recipient of recipients) {
      // Guard por recipient: skip parcial sin abortar el otro (AC-07 EC-04).
      if (
        recipient.status === 'deactivated' ||
        recipient.status === 'suspended' ||
        recipient.status === null
      ) {
        logger.warn({
          event: 'notif.bookingConfirmed.skipped',
          reason: 'recipient_deactivated',
          correlationId,
          bookingIntentId: bookingIntent.id,
          recipientUserId: recipient.userId,
          recipientRole: recipient.role,
          recipientStatus: recipient.status,
        });
        continue;
      }

      // Idempotencia por recipient (AC-02).
      const alreadyEmitted = await notificationRepo.existsBookingConfirmedForRecipient(
        recipient.userId,
        bookingIntent.id,
        { tx },
      );
      if (alreadyEmitted) {
        logger.info({
          event: 'notif.bookingConfirmed.idempotent_skip',
          correlationId,
          recipientUserId: recipient.userId,
          recipientRole: recipient.role,
          bookingIntentId: bookingIntent.id,
        });
        continue;
      }

      // Resolución de idioma por recipient (AC-04, D5).
      const language = await resolveLanguage(languageLookup, recipient.userId, event.language);
      const { subject, body } = renderBookingConfirmedTemplate(recipient.role, language);

      // 2 INSERTs por recipient (in_app + email_simulated) dentro de la tx.
      for (const channel of ['in_app', 'email_simulated'] as const) {
        await notificationRepo.create(
          {
            recipientUserId: recipient.userId,
            recipientRole: recipient.role,
            channel,
            languageCode: language,
            bookingIntentId: bookingIntent.id,
            quoteId: quote.id,
            quoteRequestId: quoteRequest.id,
            eventId: event.id,
            vendorProfileId: vendorProfile.id,
            title: subject,
            body,
          },
          { tx },
        );
      }

      // Log `[EMAIL]` estructurado por recipient exitoso (AC-05, NFR-OBS-004).
      emailAdapter.logEmail({
        toUserId: recipient.userId,
        recipientRole: recipient.role,
        bookingIntentId: bookingIntent.id,
        quoteId: quote.id,
        quoteRequestId: quoteRequest.id,
        eventId: event.id,
        vendorProfileId: vendorProfile.id,
        language,
        correlationId,
      });
    }
  }
}

/**
 * Resolución de idioma con fallback ladder D5:
 *   1. `User.preferredLanguage` (si está catalogado).
 *   2. `event.language` (traducido si es enum Prisma con `_`).
 *   3. `en` (default final).
 */
async function resolveLanguage(
  lookup: RecipientLanguagePreferenceReader,
  userId: string,
  eventLanguage: string,
): Promise<SupportedLanguage> {
  const preferred = await lookup.findPreferredLanguage(userId);
  if (preferred) return preferred;
  const eventLangApi = coerceToSupported(eventLanguage);
  if (eventLangApi) return eventLangApi;
  return 'en';
}

function coerceToSupported(value: string): SupportedLanguage | null {
  const normalized = value.replace('_', '-') as SupportedLanguage;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(normalized) ? normalized : null;
}
