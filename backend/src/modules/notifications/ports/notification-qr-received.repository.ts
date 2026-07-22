// US-068 (PB-P2-005 / BE-001). Puerto `NotificationQrReceivedRepository`.
//
// Contrato paralelo al `NotificationT7Repository` de US-034 pero dedicado a
// `type='quote_request_received'` (canonical enum de `docs/16 §34.3`). Los campos
// `channel` y `languageCode` viajan en `payload` (herencia US-034 D-01).
//
// La escritura opera dentro de la transacción del `CreateQuoteRequestUseCase`
// (US-049 refactor de BE-005) — el `tx` opcional permite compartir la conexión.
import type { Prisma } from '@prisma/client';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export type QrReceivedChannel = 'in_app' | 'email_simulated';

export interface CreateQrReceivedNotificationInput {
  vendorUserId: string;
  channel: QrReceivedChannel;
  languageCode: SupportedLanguage;
  quoteRequestId: string;
  eventId: string;
  organizerId: string;
  categoryCode: string;
  /** Título localizado (persistido en `payload.title` para que US-071 lo renderice). */
  title: string;
  /** Body localizado (`payload.body`). */
  body: string;
}

export interface QrReceivedRepositoryOptions {
  tx?: Prisma.TransactionClient;
}

export interface NotificationQrReceivedRepository {
  /**
   * Retorna `true` si ya existe una `Notification(type='quote_request_received')`
   * dirigida a `vendorUserId` con `payload.quoteRequestId=quoteRequestId`.
   * Filtro estrecho sobre `user_id + type` (cubierto por `idx_notifications_user_status_sent`).
   */
  existsQuoteRequestReceivedForQR(
    vendorUserId: string,
    quoteRequestId: string,
    opts?: QrReceivedRepositoryOptions,
  ): Promise<boolean>;

  /** Inserta una fila `notifications`. Sin chequeo de idempotencia interno. */
  create(
    input: CreateQrReceivedNotificationInput,
    opts?: QrReceivedRepositoryOptions,
  ): Promise<void>;
}
