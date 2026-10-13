// PR-6 — Caracterización de los canales de notificación (qr_received, quote_received,
// booking_confirmed, t7). Fija la forma EXACTA de lo que cada tipo escribe y loguea:
//   * fila `notifications` (`userId`, `type`, `payload` con orden de claves),
//   * cliente usado (tx vs default) e idempotencia por `payload->>'<clave>'`,
//   * log `email_simulated` (claves, orden, template, subject/body localizados) y su
//     set de claves permitidas (SEC-02).
// La consulta de idempotencia contra Postgres real vive en
// `tests/integration/notification-channels.integration.spec.ts`.
import type { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { IDS, REPO_CASES } from '../helpers/notification-channel-cases.js';
import {
  LoggingSimulatedQrReceivedEmailAdapter,
  QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS,
} from '../../src/modules/notifications/infrastructure/logging-simulated-qr-received-email.adapter.js';
import {
  LoggingSimulatedQuoteReceivedEmailAdapter,
  QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS,
} from '../../src/modules/notifications/infrastructure/logging-simulated-quote-received-email.adapter.js';
import {
  BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS,
  LoggingSimulatedBookingConfirmedEmailAdapter,
} from '../../src/modules/notifications/infrastructure/logging-simulated-booking-confirmed-email.adapter.js';
import {
  LoggingSimulatedT7EmailAdapter,
  T7_EMAIL_LOG_ALLOWED_KEYS,
} from '../../src/modules/notifications/infrastructure/logging-simulated-t7-email.adapter.js';
import { renderQrReceivedTemplate } from '../../src/modules/notifications/i18n/qr-received-templates.js';
import { renderQuoteReceivedTemplate } from '../../src/modules/notifications/i18n/quote-received-templates.js';
import { renderBookingConfirmedTemplate } from '../../src/modules/notifications/i18n/booking-confirmed-templates.js';
import { renderT7Template } from '../../src/modules/notifications/i18n/t7-templates.js';

/** Cliente Prisma falso: registra `$queryRaw` y `notification.create`. */
function fakeClient(rows: unknown[] = []) {
  const queries: unknown[][] = [];
  const creates: unknown[] = [];
  const client = {
    $queryRaw: (_strings: TemplateStringsArray, ...values: unknown[]) => {
      queries.push(values);
      return Promise.resolve(rows);
    },
    notification: {
      create: (args: unknown) => {
        creates.push(args);
        return Promise.resolve({});
      },
    },
  };
  return { client, queries, creates };
}

describe('PR-6 caracterización — repositorios de notificación por tipo', () => {
  for (const c of REPO_CASES) {
    describe(c.name, () => {
      it('create inserta la fila exacta (userId, type, payload con orden de claves)', async () => {
        const { client, creates } = fakeClient();
        await c.makeRepo(client).create(c.input('u-1') as never);
        expect(creates).toEqual([{ data: { userId: 'u-1', type: c.type, payload: c.payload } }]);
        const data = (creates[0] as { data: { payload: Record<string, unknown> } }).data;
        expect(Object.keys(data)).toEqual(['userId', 'type', 'payload']);
        expect(Object.keys(data.payload)).toEqual(Object.keys(c.payload));
      });

      it('exists refleja si la consulta devuelve filas', async () => {
        const empty = fakeClient([]);
        expect(await c.makeRepo(empty.client).exists('u-1', c.idempotencyKey)).toBe(false);
        expect(empty.queries).toHaveLength(1);
        expect(empty.queries[0]).toContain('u-1');
        expect(empty.queries[0]).toContain(c.type);
        expect(empty.queries[0]).toContain(c.idempotencyKey);
        const hit = fakeClient([{ exists: true }]);
        expect(await c.makeRepo(hit.client).exists('u-1', c.idempotencyKey)).toBe(true);
      });

      if (c.supportsTx) {
        it('opts.tx tiene prioridad sobre el cliente por defecto', async () => {
          const base = fakeClient();
          const tx = fakeClient([{ exists: true }]);
          const repo = c.makeRepo(base.client);
          const txClient = tx.client as unknown as Prisma.TransactionClient;
          expect(await repo.exists('u-1', c.idempotencyKey, { tx: txClient })).toBe(true);
          await repo.create(c.input('u-1') as never, { tx: txClient });
          expect(base.queries).toHaveLength(0);
          expect(base.creates).toHaveLength(0);
          expect(tx.queries).toHaveLength(1);
          expect(tx.creates).toHaveLength(1);
        });
      }
    });
  }
});

interface EmailCase {
  name: string;
  allowedKeys: readonly string[];
  expectedAllowedKeys: string[];
  logEmail(logger: { info(p: Record<string, unknown>): void }): void;
  expectedLog: Record<string, unknown>;
}

const EMAIL_CASES: EmailCase[] = [
  {
    name: 'qr_received',
    allowedKeys: QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS,
    expectedAllowedKeys: [
      'event', 'template', 'correlationId', 'to', 'userId', 'quoteRequestId', 'eventId',
      'organizerId', 'categoryCode', 'language', 'subject', 'body',
    ],
    logEmail: (logger) =>
      new LoggingSimulatedQrReceivedEmailAdapter(logger).logEmail({
        toUserId: 'u-v',
        quoteRequestId: IDS.quoteRequestId,
        eventId: IDS.eventId,
        organizerId: IDS.organizerId,
        categoryCode: 'catering',
        language: 'pt',
        correlationId: 'corr-1',
      }),
    expectedLog: {
      event: 'email_simulated',
      template: 'notif.qrReceived',
      correlationId: 'corr-1',
      to: 'u-v',
      userId: 'u-v',
      quoteRequestId: IDS.quoteRequestId,
      eventId: IDS.eventId,
      organizerId: IDS.organizerId,
      categoryCode: 'catering',
      language: 'pt',
      ...renderQrReceivedTemplate('pt', { categoryCode: 'catering' }),
    },
  },
  {
    name: 'quote_received',
    allowedKeys: QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS,
    expectedAllowedKeys: [
      'event', 'template', 'correlationId', 'to', 'userId', 'quoteId', 'quoteRequestId',
      'eventId', 'vendorProfileId', 'language', 'subject', 'body',
    ],
    logEmail: (logger) =>
      new LoggingSimulatedQuoteReceivedEmailAdapter(logger).logEmail({
        toUserId: 'u-o',
        quoteId: IDS.quoteId,
        quoteRequestId: IDS.quoteRequestId,
        eventId: IDS.eventId,
        vendorProfileId: IDS.vendorProfileId,
        language: 'en',
        correlationId: 'corr-2',
      }),
    expectedLog: {
      event: 'email_simulated',
      template: 'notif.quoteReceived',
      correlationId: 'corr-2',
      to: 'u-o',
      userId: 'u-o',
      quoteId: IDS.quoteId,
      quoteRequestId: IDS.quoteRequestId,
      eventId: IDS.eventId,
      vendorProfileId: IDS.vendorProfileId,
      language: 'en',
      ...renderQuoteReceivedTemplate('en'),
    },
  },
  ...(['organizer', 'vendor'] as const).map(
    (role): EmailCase => ({
      name: `booking_confirmed (${role})`,
      allowedKeys: BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS,
      expectedAllowedKeys: [
        'event', 'template', 'correlationId', 'to', 'userId', 'recipientRole', 'bookingIntentId',
        'quoteId', 'quoteRequestId', 'eventId', 'vendorProfileId', 'language', 'subject', 'body',
      ],
      logEmail: (logger) =>
        new LoggingSimulatedBookingConfirmedEmailAdapter(logger).logEmail({
          toUserId: 'u-r',
          recipientRole: role,
          bookingIntentId: IDS.bookingIntentId,
          quoteId: IDS.quoteId,
          quoteRequestId: IDS.quoteRequestId,
          eventId: IDS.eventId,
          vendorProfileId: IDS.vendorProfileId,
          language: 'es-ES',
          correlationId: 'corr-3',
        }),
      expectedLog: {
        event: 'email_simulated',
        template: `notif.bookingConfirmed.${role}`,
        correlationId: 'corr-3',
        to: 'u-r',
        userId: 'u-r',
        recipientRole: role,
        bookingIntentId: IDS.bookingIntentId,
        quoteId: IDS.quoteId,
        quoteRequestId: IDS.quoteRequestId,
        eventId: IDS.eventId,
        vendorProfileId: IDS.vendorProfileId,
        language: 'es-ES',
        ...renderBookingConfirmedTemplate(role, 'es-ES'),
      },
    }),
  ),
  {
    name: 't7',
    allowedKeys: T7_EMAIL_LOG_ALLOWED_KEYS,
    expectedAllowedKeys: [
      'event', 'template', 'correlationId', 'to', 'userId', 'taskId', 'eventId', 'dueDate',
      'language', 'subject', 'body',
    ],
    logEmail: (logger) =>
      new LoggingSimulatedT7EmailAdapter(logger).logEmail({
        toUserId: 'u-t',
        taskId: IDS.taskId,
        eventId: IDS.eventId,
        dueDate: '2026-07-29',
        language: 'es-LATAM',
        correlationId: 'corr-4',
      }),
    expectedLog: {
      event: 'email_simulated',
      template: 'notif.t7',
      correlationId: 'corr-4',
      to: 'u-t',
      userId: 'u-t',
      taskId: IDS.taskId,
      eventId: IDS.eventId,
      dueDate: '2026-07-29',
      language: 'es-LATAM',
      ...renderT7Template('es-LATAM', { taskId: IDS.taskId, dueDate: '2026-07-29' }),
    },
  },
];

describe('PR-6 caracterización — email simulado por tipo', () => {
  for (const c of EMAIL_CASES) {
    it(`${c.name}: un único log info con claves, orden y valores exactos`, () => {
      const logs: Record<string, unknown>[] = [];
      c.logEmail({ info: (p) => logs.push(p) });
      expect(logs).toEqual([c.expectedLog]);
      expect(Object.keys(logs[0] ?? {})).toEqual(Object.keys(c.expectedLog));
      expect([...c.allowedKeys]).toEqual(c.expectedAllowedKeys);
      expect(Object.keys(logs[0] ?? {})).toEqual(c.expectedAllowedKeys);
    });
  }
});
