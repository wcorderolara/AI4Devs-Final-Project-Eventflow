// Puertos de los canales de notificación por tipo (US-034 T-7, US-068 qr_received,
// US-069 quote_received, US-070 booking_confirmed). Cada tipo persiste filas
// `notifications` (canales `in_app` + `email_simulated`, D5) y emite un log `[EMAIL]`
// simulado. Contrato común; lo que cambia por tipo es el input.
//
// El schema físico no expone `channel` / `language_code`: viajan en `payload`
// (US-034 D-01). La escritura puede compartir la transacción del caso de uso vía `tx`.
import type { Prisma } from '@prisma/client';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import type { NotificationChannel } from '../domain/index.js';
import type { BookingConfirmedRole } from '../i18n/booking-confirmed-templates.js';

export interface NotificationRepositoryOptions {
  tx?: Prisma.TransactionClient;
}

export interface NotificationRepository<TInput> {
  /**
   * `true` si ya existe una `Notification` del tipo dirigida a `userId` con
   * `payload.<clave de idempotencia> = key`. Filtro estrecho sobre `user_id + type`
   * (cubierto por `idx_notifications_user_status_sent`).
   */
  exists(userId: string, key: string, opts?: NotificationRepositoryOptions): Promise<boolean>;

  /** Inserta una fila `notifications`. Sin chequeo de idempotencia interno. */
  create(input: TInput, opts?: NotificationRepositoryOptions): Promise<void>;
}

/** Campos comunes del email simulado. `toUserId` es el `userId`, nunca el email (SEC-02). */
export interface SimulatedEmailInput {
  toUserId: string;
  language: SupportedLanguage;
  correlationId: string;
}

export interface SimulatedEmailPort<TInput extends SimulatedEmailInput> {
  /** Emite un log estructurado `event='email_simulated'` con el template resuelto. */
  logEmail(input: TInput): void;
}

/** Campos comunes del payload de una fila `notifications`. */
interface NotificationRowInput {
  channel: NotificationChannel;
  languageCode: SupportedLanguage;
}

/** Payload localizado que US-071 renderiza (`payload.title` / `payload.body`). */
interface LocalizedRowInput extends NotificationRowInput {
  title: string;
  body: string;
}

// --- T-7 (`type='task_due_soon'`, idempotencia por `payload.taskId`) ---------------

export interface CreateT7NotificationInput extends NotificationRowInput {
  userId: string;
  taskId: string;
  eventId: string;
  /** ISO date `YYYY-MM-DD` (calendario, sin hora). */
  dueDate: string;
}

export interface SimulatedT7EmailInput extends SimulatedEmailInput {
  taskId: string;
  eventId: string;
  /** ISO date `YYYY-MM-DD`. */
  dueDate: string;
}

export type NotificationT7Repository = NotificationRepository<CreateT7NotificationInput>;
export type SimulatedT7EmailPort = SimulatedEmailPort<SimulatedT7EmailInput>;

// --- QR recibida (`type='quote_request_received'`, por `payload.quoteRequestId`) ----

export interface CreateQrReceivedNotificationInput extends LocalizedRowInput {
  vendorUserId: string;
  quoteRequestId: string;
  eventId: string;
  organizerId: string;
  categoryCode: string;
}

export interface SimulatedQrReceivedEmailInput extends SimulatedEmailInput {
  quoteRequestId: string;
  eventId: string;
  organizerId: string;
  categoryCode: string;
}

export type NotificationQrReceivedRepository =
  NotificationRepository<CreateQrReceivedNotificationInput>;
export type SimulatedQrReceivedEmailPort = SimulatedEmailPort<SimulatedQrReceivedEmailInput>;

// --- Quote recibida (`type='quote_received'`, por `payload.quoteId`) ----------------

export interface CreateQuoteReceivedNotificationInput extends LocalizedRowInput {
  organizerUserId: string;
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  vendorProfileId: string;
}

export interface SimulatedQuoteReceivedEmailInput extends SimulatedEmailInput {
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  vendorProfileId: string;
}

export type NotificationQuoteReceivedRepository =
  NotificationRepository<CreateQuoteReceivedNotificationInput>;
export type SimulatedQuoteReceivedEmailPort = SimulatedEmailPort<SimulatedQuoteReceivedEmailInput>;

// --- Reserva confirmada (`type='booking_confirmed'`, bilateral, por
// `payload.bookingIntentId` y destinatario) -----------------------------------------

export interface CreateBookingConfirmedNotificationInput extends LocalizedRowInput {
  recipientUserId: string;
  recipientRole: BookingConfirmedRole;
  bookingIntentId: string;
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  vendorProfileId: string;
}

export interface SimulatedBookingConfirmedEmailInput extends SimulatedEmailInput {
  recipientRole: BookingConfirmedRole;
  bookingIntentId: string;
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  vendorProfileId: string;
}

export type NotificationBookingConfirmedRepository =
  NotificationRepository<CreateBookingConfirmedNotificationInput>;
export type SimulatedBookingConfirmedEmailPort =
  SimulatedEmailPort<SimulatedBookingConfirmedEmailInput>;
