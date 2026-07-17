// US-060 (PB-P1-036 / QA-001) — Unit tests.
//
// Cobertura:
//   - DTO `CreateBookingIntentUs060RequestSchema`: happy path, `.strict()` (rechaza campos de
//     pago FR-BOOKING-007), `quote_id` UUID válido, `disclaimer_accepted` booleano.
//   - `QuoteEventName`: contiene los 6 eventos (incluye `booking_intent.created`).
//   - `CreateBookingIntentUs060UseCase` branches:
//       AC-01 happy path (SELECT FOR UPDATE + UPDATE Quote → accepted + INSERT BookingIntent +
//         1 emit al vendor + log).
//       AC-02 disclaimer false / omitido → `DisclaimerRequiredError` (400 DISCLAIMER_REQUIRED)
//         SIN abrir transacción.
//       EC-01 Quote vencida (`valid_until < now`) → `QuoteExpiredError` (409 QUOTE_EXPIRED).
//       EC-02 status ∉ {sent} (accepted/rejected/expired/draft) → `QuoteNotAcceptableError`
//         (409 QUOTE_NOT_ACCEPTABLE) con `currentStatus`.
//       EC-03 BookingIntent activo ya existe → `BookingIntentAlreadyExistsError` (409) con
//         `bookingIntentId` del existente.
//       EC-04 Quote de otro organizer → `QuoteNotFoundForBookingError` (404 uniforme).
//       EC-04 Quote inexistente → `QuoteNotFoundForBookingError` (404 uniforme).
//       Guard defensivo: vendor_profile faltante en el step 8 → `QuoteNotFoundForBookingError` (rollback).
import { QuoteStatus, BookingIntentStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  CreateBookingIntentUs060RequestSchema,
} from '../../src/modules/booking-intent/dto/create-booking-intent.request.js';
import { CreateBookingIntentUs060UseCase } from '../../src/modules/booking-intent/application/create-booking-intent.us060.use-case.js';
import {
  BookingIntentAlreadyExistsError,
  DisclaimerRequiredError,
  QuoteNotAcceptableError,
} from '../../src/modules/booking-intent/domain/us060.errors.js';
import { QuoteNotFoundForBookingError } from '../../src/modules/booking-intent/domain/us060.errors.js';
import { QuoteExpiredError } from '../../src/shared/domain/errors/quote-flow.errors.js';
import type {
  EmitQuoteEventInput,
  QuoteEventName,
  QuoteEventNotificationService,
} from '../../src/modules/quote-flow/services/quote-event-notification.service.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const ORGANIZER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ORGANIZER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';
const QUOTE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const QR_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EVENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const SC_ID = '99999999-9999-9999-9999-999999999999';
const VP_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const VENDOR_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EXISTING_INTENT_ID = '11111111-2222-3333-4444-555555555555';

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-060 · CreateBookingIntentUs060RequestSchema', () => {
  it('acepta `{ quote_id, disclaimer_accepted: true }`', () => {
    const r = CreateBookingIntentUs060RequestSchema.safeParse({
      quote_id: QUOTE_ID,
      disclaimer_accepted: true,
    });
    expect(r.success).toBe(true);
  });

  it('acepta `disclaimer_accepted: false` (el UC lo mapea a 400 DISCLAIMER_REQUIRED)', () => {
    const r = CreateBookingIntentUs060RequestSchema.safeParse({
      quote_id: QUOTE_ID,
      disclaimer_accepted: false,
    });
    expect(r.success).toBe(true);
  });

  it('rechaza body vacío', () => {
    expect(CreateBookingIntentUs060RequestSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza `quote_id` no UUID → VALIDATION_ERROR estándar', () => {
    expect(
      CreateBookingIntentUs060RequestSchema.safeParse({ quote_id: 'not-a-uuid', disclaimer_accepted: true })
        .success,
    ).toBe(false);
  });

  it('rechaza `disclaimer_accepted` no booleano', () => {
    expect(
      CreateBookingIntentUs060RequestSchema.safeParse({ quote_id: QUOTE_ID, disclaimer_accepted: 'yes' })
        .success,
    ).toBe(false);
  });

  it('AC-03 / FR-BOOKING-007: `.strict()` rechaza cualquier campo de pago (payment_method, card_token, card_number, amount_paid, payment_intent_id)', () => {
    const paymentFields = ['payment_method', 'card_token', 'card_number', 'amount_paid', 'payment_intent_id'];
    for (const field of paymentFields) {
      const body: Record<string, unknown> = {
        quote_id: QUOTE_ID,
        disclaimer_accepted: true,
        [field]: 'attacker-value',
      };
      const parsed = CreateBookingIntentUs060RequestSchema.safeParse(body);
      expect(parsed.success, `field=${field}`).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QuoteEventName type: mantiene los 6 eventos soportados
// ─────────────────────────────────────────────────────────────────────────────
describe('US-060 · QuoteEventName', () => {
  it('el type acepta los 6 nombres de evento (incluye `booking_intent.created`)', () => {
    const names: QuoteEventName[] = [
      'quote.rejected',
      'quote.expired',
      'quote_request.cancelled',
      'quote.marked_preferred',
      'quote.unmarked_preferred',
      'booking_intent.created',
    ];
    expect(names).toHaveLength(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UseCase — fake $queryRaw + $transaction
// ─────────────────────────────────────────────────────────────────────────────

interface FakeQuoteRow {
  id: string;
  quote_request_id: string;
  vendor_profile_id: string;
  event_id: string;
  service_category_id: string;
  status: QuoteStatus;
  valid_until: Date | null;
}

interface UseCaseFake {
  uc: CreateBookingIntentUs060UseCase;
  emitSpy: ReturnType<typeof vi.fn>;
  logSpy: ReturnType<typeof vi.fn>;
  quoteUpdates: Array<{ id: string; data: { status: QuoteStatus; acceptedAt: Date } }>;
  intentCreates: Array<{ quoteId: string; createdBy: string; status: BookingIntentStatus }>;
}

interface FakeOptions {
  /** Sobrescribe la Quote target retornada por el SELECT FOR UPDATE. */
  quote?: Partial<FakeQuoteRow> | null;
  /** Sobrescribe el `organizer_user_id` retornado por el lookup del evento. */
  eventOwnerId?: string | null;
  /** Si es `true`, el SELECT del intent activo devuelve `{ id: EXISTING_INTENT_ID, status: 'pending' }`. */
  activeIntent?: { id: string; status: BookingIntentStatus } | null;
  /** Sobrescribe el `user_id` del vendor (o `null` si el vendor se borró). */
  vendorUserId?: string | null;
  now?: Date;
}

function buildFake(opts: FakeOptions = {}): UseCaseFake {
  const emitSpy = vi.fn(async (_input: EmitQuoteEventInput): Promise<void> => undefined);
  const logSpy = vi.fn();
  const now = opts.now ?? new Date('2026-07-17T15:00:00Z');
  const clock: ClockPort = { now: () => now };
  const service = { emit: emitSpy } as unknown as QuoteEventNotificationService;
  const logger: DomainEventLogger = { emit: logSpy };

  // Secuencia esperada del UC feliz (mismos pasos que en el archivo del UC):
  //   1) SELECT quote FOR UPDATE
  //   2) SELECT event.user_id
  //   3) SELECT booking_intents activo FOR UPDATE
  //   4) SELECT vendor_profiles.user_id
  // Ante branches tempranas (quote inexistente, ownership, estado, expiración, intent activo),
  // el UC lanza antes de llegar a los pasos posteriores — el responder devuelve `[]` para
  // consultas fuera de la secuencia esperada.
  const quoteRow: FakeQuoteRow | null = opts.quote === null ? null : {
    id: QUOTE_ID,
    quote_request_id: QR_ID,
    vendor_profile_id: VP_ID,
    event_id: EVENT_ID,
    service_category_id: SC_ID,
    status: QuoteStatus.sent,
    valid_until: null,
    ...(opts.quote ?? {}),
  };

  const sequence: unknown[][] = [
    quoteRow ? [quoteRow] : [],
    opts.eventOwnerId === undefined
      ? [{ organizer_user_id: ORGANIZER_ID }]
      : opts.eventOwnerId === null
        ? []
        : [{ organizer_user_id: opts.eventOwnerId }],
    opts.activeIntent ? [opts.activeIntent] : [],
    opts.vendorUserId === undefined
      ? [{ user_id: VENDOR_USER_ID }]
      : opts.vendorUserId === null
        ? []
        : [{ user_id: opts.vendorUserId }],
  ];

  let idx = 0;
  const responder = (): unknown[] => {
    const r = sequence[idx] ?? [];
    idx += 1;
    return r;
  };

  const quoteUpdates: UseCaseFake['quoteUpdates'] = [];
  const intentCreates: UseCaseFake['intentCreates'] = [];

  const CREATED_AT = new Date('2026-07-17T15:00:00Z');
  const tx = {
    async $queryRaw<T>(): Promise<T[]> {
      return responder() as T[];
    },
    quote: {
      async update(args: { where: { id: string }; data: { status: QuoteStatus; acceptedAt: Date } }): Promise<unknown> {
        quoteUpdates.push({ id: args.where.id, data: args.data });
        return { id: args.where.id, status: args.data.status };
      },
    },
    bookingIntent: {
      async create(args: {
        data: {
          quoteId: string;
          eventId: string;
          serviceCategoryId: string;
          vendorProfileId: string;
          createdBy: string;
          status: BookingIntentStatus;
          isSimulated: boolean;
        };
      }): Promise<unknown> {
        intentCreates.push({
          quoteId: args.data.quoteId,
          createdBy: args.data.createdBy,
          status: args.data.status,
        });
        return {
          id: '99999999-8888-7777-6666-555555555555',
          quoteId: args.data.quoteId,
          eventId: args.data.eventId,
          serviceCategoryId: args.data.serviceCategoryId,
          vendorProfileId: args.data.vendorProfileId,
          status: args.data.status,
          isSimulated: args.data.isSimulated,
          confirmedAt: null,
          cancelledAt: null,
          cancelledBy: null,
          cancellationReason: null,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        };
      },
    },
  };

  const prisma = {
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn(tx);
    },
  } as unknown as ConstructorParameters<typeof CreateBookingIntentUs060UseCase>[3];

  const uc = new CreateBookingIntentUs060UseCase(service, clock, logger, prisma);
  return { uc, emitSpy, logSpy, quoteUpdates, intentCreates };
}

describe('US-060 · CreateBookingIntentUs060UseCase.execute', () => {
  it('AC-02 disclaimer_accepted:false ⇒ DisclaimerRequiredError SIN abrir transacción', async () => {
    const { uc, emitSpy, quoteUpdates, intentCreates } = buildFake();
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: false }),
    ).rejects.toBeInstanceOf(DisclaimerRequiredError);
    expect(emitSpy).not.toHaveBeenCalled();
    expect(quoteUpdates).toHaveLength(0);
    expect(intentCreates).toHaveLength(0);
  });

  it('AC-01 happy path: UPDATE Quote → accepted + INSERT BookingIntent + 1 emit al vendor + log', async () => {
    const { uc, emitSpy, logSpy, quoteUpdates, intentCreates } = buildFake();
    const view = await uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }, { correlationId: 'cid-1' });
    // Efectos.
    expect(quoteUpdates).toEqual([
      { id: QUOTE_ID, data: { status: QuoteStatus.accepted, acceptedAt: new Date('2026-07-17T15:00:00Z') } },
    ]);
    expect(intentCreates).toEqual([
      { quoteId: QUOTE_ID, createdBy: ORGANIZER_ID, status: BookingIntentStatus.pending },
    ]);
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitCall = emitSpy.mock.calls[0]?.[0];
    expect(emitCall?.eventName).toBe('booking_intent.created');
    expect(emitCall?.recipientUserId).toBe(VENDOR_USER_ID);
    expect(emitCall?.tx).toBeDefined();
    expect(emitCall?.payload).toMatchObject({
      booking_intent_id: expect.any(String),
      quote_id: QUOTE_ID,
      quote_request_id: QR_ID,
      event_id: EVENT_ID,
      service_category_id: SC_ID,
    });
    // Log de dominio.
    expect(logSpy).toHaveBeenCalledWith('booking_intent.created', expect.objectContaining({
      correlationId: 'cid-1',
      actorId: ORGANIZER_ID,
      quoteId: QUOTE_ID,
      quoteRequestId: QR_ID,
    }));
    // Return view.
    expect(view.status).toBe(BookingIntentStatus.pending);
    expect(view.quoteId).toBe(QUOTE_ID);
  });

  it('EC-04 Quote inexistente ⇒ QuoteNotFoundForBookingError (uniforme)', async () => {
    const { uc, emitSpy } = buildFake({ quote: null });
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }),
    ).rejects.toBeInstanceOf(QuoteNotFoundForBookingError);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-04 Quote de otro organizer ⇒ QuoteNotFoundForBookingError (uniforme, no filtra existencia)', async () => {
    const { uc, emitSpy } = buildFake({ eventOwnerId: OTHER_ORGANIZER_ID });
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }),
    ).rejects.toBeInstanceOf(QuoteNotFoundForBookingError);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-04 evento sin fila (defensa) ⇒ QuoteNotFoundForBookingError', async () => {
    const { uc } = buildFake({ eventOwnerId: null });
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }),
    ).rejects.toBeInstanceOf(QuoteNotFoundForBookingError);
  });

  it('EC-02 status=accepted ⇒ QuoteNotAcceptableError con currentStatus="accepted"', async () => {
    const { uc } = buildFake({ quote: { status: QuoteStatus.accepted } });
    const err = await uc
      .execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(QuoteNotAcceptableError);
    expect((err as QuoteNotAcceptableError).currentStatus).toBe('accepted');
  });

  it('EC-02 status=draft ⇒ QuoteNotAcceptableError', async () => {
    const { uc } = buildFake({ quote: { status: QuoteStatus.draft } });
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }),
    ).rejects.toBeInstanceOf(QuoteNotAcceptableError);
  });

  it('EC-02 status=rejected ⇒ QuoteNotAcceptableError', async () => {
    const { uc } = buildFake({ quote: { status: QuoteStatus.rejected } });
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }),
    ).rejects.toBeInstanceOf(QuoteNotAcceptableError);
  });

  it('EC-01 Quote vencida (valid_until < now) ⇒ QuoteExpiredError', async () => {
    const { uc } = buildFake({
      quote: { valid_until: new Date('2026-01-01T00:00:00Z') },
      now: new Date('2026-07-17T15:00:00Z'),
    });
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }),
    ).rejects.toBeInstanceOf(QuoteExpiredError);
  });

  it('EC-03 intent activo (pending) ya existe ⇒ BookingIntentAlreadyExistsError con bookingIntentId', async () => {
    const { uc, emitSpy } = buildFake({ activeIntent: { id: EXISTING_INTENT_ID, status: BookingIntentStatus.pending } });
    const err = await uc
      .execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingIntentAlreadyExistsError);
    expect((err as BookingIntentAlreadyExistsError).bookingIntentId).toBe(EXISTING_INTENT_ID);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-03 intent activo (confirmed_intent) ya existe ⇒ BookingIntentAlreadyExistsError', async () => {
    const { uc } = buildFake({
      activeIntent: { id: EXISTING_INTENT_ID, status: BookingIntentStatus.confirmed_intent },
    });
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }),
    ).rejects.toBeInstanceOf(BookingIntentAlreadyExistsError);
  });

  it('Guard defensivo: vendor_profile faltante ⇒ QuoteNotFoundForBookingError (rollback implícito por throw en tx)', async () => {
    const { uc, quoteUpdates, intentCreates } = buildFake({ vendorUserId: null });
    await expect(
      uc.execute(ORGANIZER_ID, { quote_id: QUOTE_ID, disclaimer_accepted: true }),
    ).rejects.toBeInstanceOf(QuoteNotFoundForBookingError);
    // Los updates y creates ocurren antes del throw pero al lanzar dentro de $transaction el
    // caller (Prisma) revierte todo. En el fake no simulamos rollback físico — validamos que
    // el orden de operaciones respetó la política (update/create sucedieron antes del throw).
    expect(quoteUpdates).toHaveLength(1);
    expect(intentCreates).toHaveLength(1);
  });
});
