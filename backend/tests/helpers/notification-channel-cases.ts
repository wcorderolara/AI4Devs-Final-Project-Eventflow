// PR-6 — Casos compartidos de caracterización de los repositorios de notificación
// (unit + integration). Cada caso fija `type`, clave de idempotencia y payload exacto.
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaNotificationQrReceivedRepository } from '../../src/modules/notifications/infrastructure/prisma-notification-qr-received.repository.js';
import { PrismaNotificationQuoteReceivedRepository } from '../../src/modules/notifications/infrastructure/prisma-notification-quote-received.repository.js';
import { PrismaNotificationBookingConfirmedRepository } from '../../src/modules/notifications/infrastructure/prisma-notification-booking-confirmed.repository.js';
import { PrismaNotificationT7Repository } from '../../src/modules/notifications/infrastructure/prisma-notification-t7.repository.js';

export type Opts = { tx?: Prisma.TransactionClient };

/** Vista uniforme de un repositorio por tipo (los nombres de métodos varían por tipo). */
export interface RepoView {
  exists(userId: string, key: string, opts?: Opts): Promise<boolean>;
  create(input: never, opts?: Opts): Promise<void>;
}

export interface RepoCase {
  name: string;
  type: string;
  idempotencyKey: string;
  supportsTx: boolean;
  makeRepo(client: unknown): RepoView;
  /** Input del `create` dado el destinatario. */
  input(userId: string): Record<string, unknown>;
  /** Payload esperado (el orden de claves forma parte del contrato). */
  payload: Record<string, unknown>;
}

export const IDS = {
  quoteRequestId: '11111111-1111-4111-8111-111111111111',
  eventId: '22222222-2222-4222-8222-222222222222',
  organizerId: '33333333-3333-4333-8333-333333333333',
  quoteId: '44444444-4444-4444-8444-444444444444',
  vendorProfileId: '55555555-5555-4555-8555-555555555555',
  bookingIntentId: '66666666-6666-4666-8666-666666666666',
  taskId: '77777777-7777-4777-8777-777777777777',
};

export const REPO_CASES: RepoCase[] = [
  {
    name: 'qr_received',
    type: 'quote_request_received',
    idempotencyKey: IDS.quoteRequestId,
    supportsTx: true,
    makeRepo: (client) => {
      const r = new PrismaNotificationQrReceivedRepository(client as PrismaClient);
      return {
        exists: (u, k, o) => r.existsQuoteRequestReceivedForQR(u, k, o),
        create: (i, o) => r.create(i, o),
      };
    },
    input: (userId) => ({
      vendorUserId: userId,
      channel: 'in_app',
      languageCode: 'pt',
      quoteRequestId: IDS.quoteRequestId,
      eventId: IDS.eventId,
      organizerId: IDS.organizerId,
      categoryCode: 'catering',
      title: 'T',
      body: 'B',
    }),
    payload: {
      channel: 'in_app',
      languageCode: 'pt',
      quoteRequestId: IDS.quoteRequestId,
      eventId: IDS.eventId,
      organizerId: IDS.organizerId,
      categoryCode: 'catering',
      title: 'T',
      body: 'B',
    },
  },
  {
    name: 'quote_received',
    type: 'quote_received',
    idempotencyKey: IDS.quoteId,
    supportsTx: true,
    makeRepo: (client) => {
      const r = new PrismaNotificationQuoteReceivedRepository(client as PrismaClient);
      return {
        exists: (u, k, o) => r.existsQuoteReceivedForQuote(u, k, o),
        create: (i, o) => r.create(i, o),
      };
    },
    input: (userId) => ({
      organizerUserId: userId,
      channel: 'email_simulated',
      languageCode: 'en',
      quoteId: IDS.quoteId,
      quoteRequestId: IDS.quoteRequestId,
      eventId: IDS.eventId,
      vendorProfileId: IDS.vendorProfileId,
      title: 'T',
      body: 'B',
    }),
    payload: {
      channel: 'email_simulated',
      languageCode: 'en',
      quoteId: IDS.quoteId,
      quoteRequestId: IDS.quoteRequestId,
      eventId: IDS.eventId,
      vendorProfileId: IDS.vendorProfileId,
      title: 'T',
      body: 'B',
    },
  },
  {
    name: 'booking_confirmed',
    type: 'booking_confirmed',
    idempotencyKey: IDS.bookingIntentId,
    supportsTx: true,
    makeRepo: (client) => {
      const r = new PrismaNotificationBookingConfirmedRepository(client as PrismaClient);
      return {
        exists: (u, k, o) => r.existsBookingConfirmedForRecipient(u, k, o),
        create: (i, o) => r.create(i, o),
      };
    },
    input: (userId) => ({
      recipientUserId: userId,
      recipientRole: 'vendor',
      channel: 'in_app',
      languageCode: 'es-LATAM',
      bookingIntentId: IDS.bookingIntentId,
      quoteId: IDS.quoteId,
      quoteRequestId: IDS.quoteRequestId,
      eventId: IDS.eventId,
      vendorProfileId: IDS.vendorProfileId,
      title: 'T',
      body: 'B',
    }),
    payload: {
      channel: 'in_app',
      languageCode: 'es-LATAM',
      recipientRole: 'vendor',
      bookingIntentId: IDS.bookingIntentId,
      quoteId: IDS.quoteId,
      quoteRequestId: IDS.quoteRequestId,
      eventId: IDS.eventId,
      vendorProfileId: IDS.vendorProfileId,
      title: 'T',
      body: 'B',
    },
  },
  {
    name: 't7',
    type: 'task_due_soon',
    idempotencyKey: IDS.taskId,
    supportsTx: false,
    makeRepo: (client) => {
      const r = new PrismaNotificationT7Repository(client as PrismaClient);
      return {
        exists: (u, k) => r.existsTaskDueSoonForTask(u, k),
        create: (i) => r.create(i),
      };
    },
    input: (userId) => ({
      userId,
      channel: 'email_simulated',
      languageCode: 'es-ES',
      taskId: IDS.taskId,
      eventId: IDS.eventId,
      dueDate: '2026-07-29',
    }),
    payload: {
      channel: 'email_simulated',
      languageCode: 'es-ES',
      taskId: IDS.taskId,
      eventId: IDS.eventId,
      dueDate: '2026-07-29',
    },
  },
];

