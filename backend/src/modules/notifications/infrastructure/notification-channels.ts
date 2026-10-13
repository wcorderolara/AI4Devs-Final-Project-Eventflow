// Configuración por tipo de los canales de notificación: fila `notifications` (type,
// destinatario, clave de idempotencia, payload) y log `[EMAIL]` simulado (template, campos,
// render i18n). Se consume con `PrismaNotificationRepository` y `LoggingSimulatedEmailAdapter`.
//
// Los `*_EMAIL_LOG_ALLOWED_KEYS` son el contrato SEC-02 de cada log (test SEC-T-01).
import type {
  CreateBookingConfirmedNotificationInput,
  CreateQrReceivedNotificationInput,
  CreateQuoteReceivedNotificationInput,
  CreateT7NotificationInput,
  SimulatedBookingConfirmedEmailInput,
  SimulatedQrReceivedEmailInput,
  SimulatedQuoteReceivedEmailInput,
  SimulatedT7EmailInput,
} from '../ports/notification-channels.port.js';
import { NOTIFICATION_TYPE_TASK_DUE_SOON } from '../domain/index.js';
import { renderT7Template } from '../i18n/t7-templates.js';
import { renderQrReceivedTemplate } from '../i18n/qr-received-templates.js';
import { renderQuoteReceivedTemplate } from '../i18n/quote-received-templates.js';
import { renderBookingConfirmedTemplate } from '../i18n/booking-confirmed-templates.js';
import type { NotificationTypeSpec } from './prisma-notification.repository.js';
import { emailLogAllowedKeys, type SimulatedEmailSpec } from './logging-simulated-email.adapter.js';

// --- US-034 T-7 ----------------------------------------------------------------------

export const T7_NOTIFICATION: NotificationTypeSpec<CreateT7NotificationInput> = {
  type: NOTIFICATION_TYPE_TASK_DUE_SOON,
  recipientKey: 'userId',
  idempotencyKey: 'taskId',
  payloadKeys: ['channel', 'languageCode', 'taskId', 'eventId', 'dueDate'],
};

export const T7_EMAIL: SimulatedEmailSpec<SimulatedT7EmailInput> = {
  template: 'notif.t7',
  fields: ['taskId', 'eventId', 'dueDate'],
  render: (i) => renderT7Template(i.language, { taskId: i.taskId, dueDate: i.dueDate }),
};

export const T7_EMAIL_LOG_ALLOWED_KEYS = emailLogAllowedKeys(T7_EMAIL);

// --- US-068 QR recibida (vendor) -----------------------------------------------------

export const QR_RECEIVED_NOTIFICATION: NotificationTypeSpec<CreateQrReceivedNotificationInput> = {
  type: 'quote_request_received',
  recipientKey: 'vendorUserId',
  idempotencyKey: 'quoteRequestId',
  payloadKeys: [
    'channel',
    'languageCode',
    'quoteRequestId',
    'eventId',
    'organizerId',
    'categoryCode',
    'title',
    'body',
  ],
};

export const QR_RECEIVED_EMAIL: SimulatedEmailSpec<SimulatedQrReceivedEmailInput> = {
  template: 'notif.qrReceived',
  fields: ['quoteRequestId', 'eventId', 'organizerId', 'categoryCode'],
  render: (i) => renderQrReceivedTemplate(i.language, { categoryCode: i.categoryCode }),
};

export const QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS = emailLogAllowedKeys(QR_RECEIVED_EMAIL);

// --- US-069 Quote recibida (organizer) -----------------------------------------------

export const QUOTE_RECEIVED_NOTIFICATION: NotificationTypeSpec<CreateQuoteReceivedNotificationInput> = {
  type: 'quote_received',
  recipientKey: 'organizerUserId',
  idempotencyKey: 'quoteId',
  payloadKeys: [
    'channel',
    'languageCode',
    'quoteId',
    'quoteRequestId',
    'eventId',
    'vendorProfileId',
    'title',
    'body',
  ],
};

export const QUOTE_RECEIVED_EMAIL: SimulatedEmailSpec<SimulatedQuoteReceivedEmailInput> = {
  template: 'notif.quoteReceived',
  fields: ['quoteId', 'quoteRequestId', 'eventId', 'vendorProfileId'],
  render: (i) => renderQuoteReceivedTemplate(i.language),
};

export const QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS = emailLogAllowedKeys(QUOTE_RECEIVED_EMAIL);

// --- US-070 Reserva confirmada (bilateral organizer + vendor) ------------------------

export const BOOKING_CONFIRMED_NOTIFICATION: NotificationTypeSpec<CreateBookingConfirmedNotificationInput> = {
  type: 'booking_confirmed',
  recipientKey: 'recipientUserId',
  idempotencyKey: 'bookingIntentId',
  payloadKeys: [
    'channel',
    'languageCode',
    'recipientRole',
    'bookingIntentId',
    'quoteId',
    'quoteRequestId',
    'eventId',
    'vendorProfileId',
    'title',
    'body',
  ],
};

export const BOOKING_CONFIRMED_EMAIL: SimulatedEmailSpec<SimulatedBookingConfirmedEmailInput> = {
  template: (i) => `notif.bookingConfirmed.${i.recipientRole}`,
  fields: ['recipientRole', 'bookingIntentId', 'quoteId', 'quoteRequestId', 'eventId', 'vendorProfileId'],
  render: (i) => renderBookingConfirmedTemplate(i.recipientRole, i.language),
};

export const BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS = emailLogAllowedKeys(BOOKING_CONFIRMED_EMAIL);
