// US-069 (PB-P2-006 / BE-004). `OnQuoteSentHandler` — emite las notifs
// `quote_received` al organizer dueño de la QR tras enviar una Quote (`status='sent'`).
//
// Invocado in-tx desde `RespondQuoteRequestUs052UseCase` (US-052 refactor de BE-005).
// Guards defensivos (D6: quote no-`sent` / owner deactivated / owner_id null) NO abortan
// la transacción: se registran como `warn` estructurado y el handler retorna. Cualquier
// fallo del INSERT o del `existsQuoteReceivedForQuote` propaga a la tx → rollback (AC-06).
import type { Prisma } from '@prisma/client';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import type { NotificationQuoteReceivedRepository } from '../ports/notification-quote-received.repository.js';
import type { SimulatedQuoteReceivedEmailPort } from '../ports/simulated-quote-received-email.port.js';
import { renderQuoteReceivedTemplate } from '../i18n/quote-received-templates.js';

/**
 * Lookup del idioma del organizer. Estructuralmente compatible con
 * `OrganizerLanguageLookup` (US-082) y con `VendorLanguagePreferenceReader` (US-068):
 * mismo shape para permitir reuso del adapter `PrismaOrganizerLanguageLookup` en el
 * composition root.
 */
export interface OrganizerLanguagePreferenceReader {
  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null>;
}

/** Contrato mínimo del logger. */
export interface OnQuoteSentLogger {
  info(payload: Record<string, unknown>): void;
  warn(payload: Record<string, unknown>): void;
}

/**
 * Input del handler (subset mínimo requerido). Se acota a lo estrictamente necesario
 * para preservar boundaries del módulo `notifications`.
 */
export interface OnQuoteSentInput {
  quote: {
    id: string;
    /** Enum Prisma `QuoteStatus`; el guard defensivo aceptado es 'sent'. */
    status: string;
  };
  quoteRequest: { id: string };
  vendorProfile: { id: string };
  event: {
    id: string;
    ownerId: string;
    /** Enum Prisma (`es_LATAM`, `pt`, …) o código API. */
    language: string;
  };
  organizerUser: {
    id: string;
    /**
     * Estado del usuario destinatario. En Prisma actual el enum `UserStatus` sólo tiene
     * `active | suspended` (tech spec §12 usa `deactivated` como término general para
     * "usuario que no debe recibir notifs"; ambos disparan el skip defensivo).
     */
    status: 'active' | 'suspended' | 'deactivated';
  };
  correlationId: string;
  tx: Prisma.TransactionClient;
}

export interface OnQuoteSentHandlerDeps {
  notificationRepo: NotificationQuoteReceivedRepository;
  languageLookup: OrganizerLanguagePreferenceReader;
  emailAdapter: SimulatedQuoteReceivedEmailPort;
  logger: OnQuoteSentLogger;
}

export class OnQuoteSentHandler {
  constructor(private readonly deps: OnQuoteSentHandlerDeps) {}

  async handle(input: OnQuoteSentInput): Promise<void> {
    const { notificationRepo, languageLookup, emailAdapter, logger } = this.deps;
    const { quote, quoteRequest, vendorProfile, event, organizerUser, correlationId, tx } = input;

    // Guards defensivos (AC-07 / D6). US-052 upstream garantiza el estado consistente
    // (quote='sent', event vigente, owner autorizado); estos checks son defensa en
    // profundidad — un skip nunca aborta la tx.
    if (quote.status !== 'sent') {
      logger.warn({
        event: 'notif.quoteReceived.skipped',
        reason: 'quote_not_sent',
        correlationId,
        quoteId: quote.id,
        quoteRequestId: quoteRequest.id,
        quoteStatus: quote.status,
      });
      return;
    }
    if (!event.ownerId) {
      logger.warn({
        event: 'notif.quoteReceived.skipped',
        reason: 'owner_id_null',
        correlationId,
        quoteId: quote.id,
        quoteRequestId: quoteRequest.id,
        eventId: event.id,
      });
      return;
    }
    if (organizerUser.status === 'deactivated' || organizerUser.status === 'suspended') {
      logger.warn({
        event: 'notif.quoteReceived.skipped',
        reason: 'user_deactivated',
        correlationId,
        quoteId: quote.id,
        quoteRequestId: quoteRequest.id,
        organizerUserId: organizerUser.id,
        organizerUserStatus: organizerUser.status,
      });
      return;
    }

    // Idempotencia (AC-02). Chequeo dentro de la misma tx por `payload->>'quoteId'`.
    const alreadyEmitted = await notificationRepo.existsQuoteReceivedForQuote(
      organizerUser.id,
      quote.id,
      { tx },
    );
    if (alreadyEmitted) {
      logger.info({
        event: 'notif.quoteReceived.idempotent_skip',
        correlationId,
        organizerUserId: organizerUser.id,
        quoteId: quote.id,
        quoteRequestId: quoteRequest.id,
      });
      return;
    }

    // Resolución de idioma (AC-04, D5 fallback ladder).
    const language = await resolveLanguage(languageLookup, organizerUser.id, event.language);

    // Rendering del par subject/body (SEC-02: sin placeholders, sin PII).
    const { subject, body } = renderQuoteReceivedTemplate(language);

    // 2 INSERTs (in_app + email_simulated) dentro de la tx.
    for (const channel of ['in_app', 'email_simulated'] as const) {
      await notificationRepo.create(
        {
          organizerUserId: organizerUser.id,
          channel,
          languageCode: language,
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

    // Log `[EMAIL]` estructurado (AC-05, NFR-OBS-004).
    emailAdapter.logEmail({
      toUserId: organizerUser.id,
      quoteId: quote.id,
      quoteRequestId: quoteRequest.id,
      eventId: event.id,
      vendorProfileId: vendorProfile.id,
      language,
      correlationId,
    });
  }
}

/**
 * Resolución de idioma con fallback ladder D5:
 *   1. `User.preferredLanguage` del organizer (si está catalogado).
 *   2. `event.language` (traducido si es enum Prisma con `_`).
 *   3. `en` (default final).
 */
async function resolveLanguage(
  lookup: OrganizerLanguagePreferenceReader,
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
