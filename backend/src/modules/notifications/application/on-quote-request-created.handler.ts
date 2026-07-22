// US-068 (PB-P2-005 / BE-004). `OnQuoteRequestCreatedHandler` — emite las notifs
// `quote_request_received` al vendor destinatario tras la creación de una QR.
//
// Invocado in-tx desde `CreateQuoteRequestUseCase` (US-049 refactor de BE-005). Los
// guards defensivos (vendor no-approved / user deactivated / user_id null) NO abortan
// la transacción: se registran como `warn` estructurado y el handler retorna.
// Cualquier fallo del INSERT o del `existsQuoteRequestReceivedForQR` propaga a la
// tx → rollback (AC-06).
import type { Prisma } from '@prisma/client';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import type { NotificationQrReceivedRepository } from '../ports/notification-qr-received.repository.js';
import type { SimulatedQrReceivedEmailPort } from '../ports/simulated-qr-received-email.port.js';
import { renderQrReceivedTemplate } from '../i18n/qr-received-templates.js';

/** Lookup del idioma del vendor. Estructuralmente compatible con `OrganizerLanguageLookup`. */
export interface VendorLanguagePreferenceReader {
  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null>;
}

/** Contrato mínimo del logger. */
export interface OnQrCreatedLogger {
  info(payload: Record<string, unknown>): void;
  warn(payload: Record<string, unknown>): void;
}

/** Input del handler (subset mínimo requerido). */
export interface OnQrCreatedInput {
  quoteRequest: { id: string };
  vendorProfile: {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'hidden';
    userId: string | null;
    /** `deletedAt` opcional para hardening defensivo (aunque US-049 ya filtra deleted_at IS NULL). */
    deletedAt?: Date | null;
  };
  vendorUser: {
    id: string;
    /**
     * Estado del usuario destinatario. En Prisma actual el enum `UserStatus` sólo tiene
     * `active | suspended` (tech spec §12 usa `deactivated` como término general para
     * "usuario que no debe recibir notifs"; ambos disparan el skip defensivo).
     */
    status: 'active' | 'suspended' | 'deactivated';
  };
  event: {
    id: string;
    ownerId: string;
    /** Enum Prisma (`es_LATAM`, `pt`, …) o código API. */
    language: string;
  };
  serviceCategoryCode: string;
  correlationId: string;
  tx: Prisma.TransactionClient;
}

export interface OnQuoteRequestCreatedHandlerDeps {
  notificationRepo: NotificationQrReceivedRepository;
  languageLookup: VendorLanguagePreferenceReader;
  emailAdapter: SimulatedQrReceivedEmailPort;
  logger: OnQrCreatedLogger;
}

export class OnQuoteRequestCreatedHandler {
  constructor(private readonly deps: OnQuoteRequestCreatedHandlerDeps) {}

  async handle(input: OnQrCreatedInput): Promise<void> {
    const { notificationRepo, languageLookup, emailAdapter, logger } = this.deps;
    const { quoteRequest, vendorProfile, vendorUser, event, serviceCategoryCode, correlationId, tx } = input;

    // Guards defensivos (AC-07). US-049 ya filtra `status='approved'` en la row-lock,
    // pero se preserva aquí como defensa en profundidad — un skip nunca aborta la tx.
    if (vendorProfile.status !== 'approved') {
      logger.warn({
        event: 'notif.qrReceived.skipped',
        reason: 'vendor_not_approved',
        correlationId,
        vendorProfileId: vendorProfile.id,
        vendorStatus: vendorProfile.status,
      });
      return;
    }
    if (vendorProfile.userId === null) {
      logger.warn({
        event: 'notif.qrReceived.skipped',
        reason: 'user_id_null',
        correlationId,
        vendorProfileId: vendorProfile.id,
      });
      return;
    }
    if (vendorUser.status === 'deactivated' || vendorUser.status === 'suspended') {
      logger.warn({
        event: 'notif.qrReceived.skipped',
        reason: 'user_deactivated',
        correlationId,
        vendorProfileId: vendorProfile.id,
        vendorUserId: vendorUser.id,
        vendorUserStatus: vendorUser.status,
      });
      return;
    }

    // Idempotencia (AC-02). El chequeo corre dentro de la misma tx.
    const alreadyEmitted = await notificationRepo.existsQuoteRequestReceivedForQR(
      vendorUser.id,
      quoteRequest.id,
      { tx },
    );
    if (alreadyEmitted) {
      logger.info({
        event: 'notif.qrReceived.idempotent_skip',
        correlationId,
        vendorUserId: vendorUser.id,
        quoteRequestId: quoteRequest.id,
      });
      return;
    }

    // Resolución de idioma (AC-04, D5 fallback ladder).
    const language = await resolveLanguage(languageLookup, vendorUser.id, event.language);

    // Rendering del par subject/body (SEC-02: sólo placeholder `categoryCode`).
    const { subject, body } = renderQrReceivedTemplate(language, {
      categoryCode: serviceCategoryCode,
    });

    // 2 INSERTs (D5 US-034 pattern) dentro de la tx.
    for (const channel of ['in_app', 'email_simulated'] as const) {
      await notificationRepo.create(
        {
          vendorUserId: vendorUser.id,
          channel,
          languageCode: language,
          quoteRequestId: quoteRequest.id,
          eventId: event.id,
          organizerId: event.ownerId,
          categoryCode: serviceCategoryCode,
          title: subject,
          body,
        },
        { tx },
      );
    }

    // Log `[EMAIL]` estructurado (AC-05, NFR-OBS-004).
    emailAdapter.logEmail({
      toUserId: vendorUser.id,
      quoteRequestId: quoteRequest.id,
      eventId: event.id,
      organizerId: event.ownerId,
      categoryCode: serviceCategoryCode,
      language,
      correlationId,
    });
  }
}

/**
 * Resolución de idioma con fallback ladder D5:
 *   1. `User.preferredLanguage` (si está catalogado).
 *   2. `event.language` (traducido si es enum Prisma con `_`).
 *   3. `en` (default final, distinto de `es-LATAM` — el vendor puede estar en cualquier país).
 */
async function resolveLanguage(
  lookup: VendorLanguagePreferenceReader,
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
