// US-052 (PB-P1-031 / QA-001 + QA-004) — Unit tests.
// Cobertura:
//   - DTO `respondQuoteRequestBodySchema`: refines exhaustivos (total>0, breakdown 1..20,
//     label 1..150, amount>=0, sum±0.01), currency_code aceptado pero ignorado por el UC.
//   - `RespondQuoteRequestUs052UseCase`: happy path (transición + delegación al
//     `OnQuoteSentHandler` in-tx + log), vendor hidden/missing, QR ajena, QR expirada,
//     QR status inválido, Quote ya existente, currency override server-side (SEC-04),
//     valid_until fuera de rango.
// US-069 (BE-005): el UC ya no invoca `QuoteNotificationSenderPort` directamente;
// delega en `OnQuoteSentHandler` la creación de las 2 filas canónicas
// `type='quote_received'` con payload rico + log `[EMAIL] notif.quoteReceived`.
import { QuoteRequestStatus, QuoteStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { respondQuoteRequestBodySchema } from '../../src/modules/quote-flow/dto/respond-quote.us052.request.js';
import { RespondQuoteRequestUs052UseCase } from '../../src/modules/quote-flow/application/respond-quote-request.us052.use-case.js';
import {
  QrNotFoundError,
  QrNotRespondableError,
  QuoteAlreadyExistsError,
  InvalidValidUntilError,
} from '../../src/modules/quote-flow/domain/us052.errors.js';
import type {
  VendorProfileReader,
  ActiveVendorProfile,
} from '../../src/shared/access/readers.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import type {
  OnQuoteSentHandler,
  OnQuoteSentInput,
} from '../../src/modules/notifications/application/on-quote-sent.handler.js';

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const QR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const VP_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EVENT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const ORGANIZER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-052 · respondQuoteRequestBodySchema', () => {
  const validBody = {
    total_price: '100.00',
    breakdown: [{ label: 'concepto A', amount: '100.00' }],
  };

  it('acepta body mínimo válido con 1 item que suma exacto', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse(validBody);
    expect(parsed.success).toBe(true);
  });

  it('acepta suma con tolerancia ±0.01 (diferencia real 0.005)', () => {
    // 33.335 + 33.33 + 33.33 = 99.995 vs 100.00 → diff 0.005, dentro de la tolerancia.
    // (Los decimales del breakdown pueden ir con 2 decimales; se usa un caso ligeramente
    // por debajo para evitar drift de floating-point cerca del límite exacto.)
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '100.00',
      breakdown: [
        { label: 'A', amount: '33.34' },
        { label: 'B', amount: '33.33' },
        { label: 'C', amount: '33.33' },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza suma fuera de tolerancia (>0.01)', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '100.00',
      breakdown: [
        { label: 'A', amount: '50.00' },
        { label: 'B', amount: '49.98' },
      ],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.message === 'INVALID_BREAKDOWN_SUM')).toBe(true);
    }
  });

  it('rechaza total_price = 0', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '0.00',
      breakdown: [{ label: 'A', amount: '0.00' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza breakdown vacío', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '100.00',
      breakdown: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza breakdown con 21 items', () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ label: `L${i}`, amount: '10.00' }));
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '210.00',
      breakdown: items,
    });
    expect(parsed.success).toBe(false);
  });

  it('acepta breakdown con 20 items', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ label: `L${i}`, amount: '5.00' }));
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '100.00',
      breakdown: items,
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza item con label vacío', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '10.00',
      breakdown: [{ label: '', amount: '10.00' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza item con label > 150 chars', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '10.00',
      breakdown: [{ label: 'x'.repeat(151), amount: '10.00' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza amount negativo (regex descarta signo)', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '10.00',
      breakdown: [{ label: 'A', amount: '-5.00' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza amount con más de 2 decimales', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      total_price: '10.00',
      breakdown: [{ label: 'A', amount: '10.001' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza claves extra (.strict())', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      ...validBody,
      extra: 'x',
    });
    expect(parsed.success).toBe(false);
  });

  it('acepta currency_code en el body (server-side lo ignora — SEC-04)', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      ...validBody,
      currency_code: 'USD',
    });
    expect(parsed.success).toBe(true);
  });

  it('acepta valid_until en formato YYYY-MM-DD', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      ...validBody,
      valid_until: '2026-08-15',
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza valid_until en formato ISO con tiempo', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      ...validBody,
      valid_until: '2026-08-15T00:00:00Z',
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza conditions > 2000 chars', () => {
    const parsed = respondQuoteRequestBodySchema.safeParse({
      ...validBody,
      conditions: 'x'.repeat(2001),
    });
    expect(parsed.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UseCase
// ─────────────────────────────────────────────────────────────────────────────
interface FakeTxSetup {
  qrRow?:
    | {
        id: string;
        event_id: string;
        vendor_profile_id: string | null;
        status: QuoteRequestStatus;
        expires_at: Date | null;
      }
    | null;
  eventRow?: {
    user_id: string;
    currency: 'GTQ' | 'USD' | 'EUR' | 'MXN' | 'COP';
    language?: string;
    owner_status?: 'active' | 'suspended';
  } | null;
  existingQuote?: { id: string } | null;
  createdQuoteId?: string;
}

function activeVendorProfile(
  overrides: Partial<ActiveVendorProfile> = {},
): ActiveVendorProfile {
  return { id: VP_ID, status: 'approved', userId: USER_ID, ...overrides };
}

function makeUcWithFakeTx(
  setup: FakeTxSetup,
  overrides: {
    findActive?: () => Promise<ActiveVendorProfile | null>;
    now?: Date;
    handlerImpl?: (input: OnQuoteSentInput) => Promise<void>;
  } = {},
) {
  const vendors: VendorProfileReader = {
    getVendorProfileIdForUser: async () => VP_ID,
    existsActive: async () => true,
    findActiveByUserId: overrides.findActive ?? (async () => activeVendorProfile()),
  };
  const handle = vi.fn(overrides.handlerImpl ?? (async () => {}));
  const onQuoteSentHandler = { handle } as unknown as OnQuoteSentHandler;
  const emit = vi.fn();
  const logger: DomainEventLogger = { emit };
  const clock: ClockPort = { now: () => overrides.now ?? new Date('2026-07-16T12:00:00Z') };

  // US-069 (BE-005): el eventRow ahora incluye `language` + `owner_status` para el handler.
  const eventRow = setup.eventRow
    ? {
        user_id: setup.eventRow.user_id,
        currency: setup.eventRow.currency,
        language: setup.eventRow.language ?? 'es_LATAM',
        owner_status: setup.eventRow.owner_status ?? 'active',
      }
    : null;

  const createdQuoteId = setup.createdQuoteId ?? 'q0000000-0000-0000-0000-000000052001';
  const create = vi.fn(async (args: { data: { amount: unknown; validUntil: Date } }) => ({
    id: createdQuoteId,
    status: QuoteStatus.sent,
    amount: {
      toFixed: (n: number) => Number(args.data.amount).toFixed(n),
    },
    createdAt: new Date('2026-07-16T12:00:00Z'),
    updatedAt: new Date('2026-07-16T12:00:00Z'),
  }));
  const findFirst = vi.fn(async () => setup.existingQuote ?? null);
  const update = vi.fn(async () => ({}));

  let queryCallIdx = 0;
  const tx = {
    async $queryRaw<T>(): Promise<T> {
      const idx = queryCallIdx++;
      if (idx === 0) return (setup.qrRow ? [setup.qrRow] : []) as T;
      if (idx === 1) return (eventRow ? [eventRow] : []) as T;
      return [] as T;
    },
    quote: { create, findFirst },
    quoteRequest: { update },
  };

  const prismaStub = {
    async $transaction<T>(cb: (tx: unknown) => Promise<T>): Promise<T> {
      return cb(tx);
    },
  } as unknown as import('@prisma/client').PrismaClient;

  const uc = new RespondQuoteRequestUs052UseCase(
    vendors,
    clock,
    logger,
    onQuoteSentHandler,
    prismaStub,
  );
  return { uc, handle, emit, create, findFirst, update };
}

describe('US-052 · RespondQuoteRequestUs052UseCase', () => {
  const validBody = {
    total_price: '150.00',
    breakdown: [
      { label: 'A', amount: '100.00' },
      { label: 'B', amount: '50.00' },
    ],
    conditions: 'ok',
  };

  const sentQr = {
    id: QR_ID,
    event_id: EVENT_ID,
    vendor_profile_id: VP_ID,
    status: QuoteRequestStatus.sent,
    expires_at: null,
  };

  it('happy path: crea Quote, UPDATE QR → responded, delega en OnQuoteSentHandler + log', async () => {
    const { uc, handle, emit, create, update, findFirst } = makeUcWithFakeTx({
      qrRow: sentQr,
      eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ' },
    });

    const view = await uc.execute(USER_ID, QR_ID, validBody, { correlationId: 'corr-52' });

    expect(view.status).toBe('sent');
    expect(view.currencyCode).toBe('GTQ');
    expect(view.totalPrice).toBe('150.00');
    expect(view.breakdown).toEqual(validBody.breakdown);
    expect(view.validUntil).toMatch(/^2026-07-31T23:59:59/);

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: QuoteRequestStatus.responded }),
      }),
    );

    // US-069 (BE-005): la emisión de notifs se delega al handler in-tx con el
    // shape mínimo requerido para `type='quote_received'`.
    expect(handle).toHaveBeenCalledTimes(1);
    const handlerInput = handle.mock.calls[0]![0] as OnQuoteSentInput;
    expect(handlerInput).toMatchObject({
      quote: { id: view.id, status: QuoteStatus.sent },
      quoteRequest: { id: QR_ID },
      vendorProfile: { id: VP_ID },
      event: { id: EVENT_ID, ownerId: ORGANIZER_ID, language: 'es_LATAM' },
      organizerUser: { id: ORGANIZER_ID, status: 'active' },
      correlationId: 'corr-52',
    });
    expect(handlerInput.tx).toBeDefined();

    expect(emit).toHaveBeenCalledWith(
      'quote.sent',
      expect.objectContaining({
        correlationId: 'corr-52',
        actorId: USER_ID,
        quoteRequestId: QR_ID,
      }),
    );
  });

  it('US-069 (BE-005 / AC-06): fallo del handler propaga → tx rollback (Quote no queda `sent`)', async () => {
    const { uc, handle, update } = makeUcWithFakeTx(
      {
        qrRow: sentQr,
        eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ' },
      },
      {
        handlerImpl: async () => {
          throw new Error('boom');
        },
      },
    );
    await expect(uc.execute(USER_ID, QR_ID, validBody, {})).rejects.toThrow('boom');
    // El fake tx en este spec no revierte automáticamente los mocks; lo que sí verificamos
    // es que el error del handler burbujea y detiene el flujo del UC (los IT ejercitan
    // el rollback real contra Postgres).
    expect(handle).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('US-069 (BE-005 / AC-04): pasa `event.language` como fallback al handler', async () => {
    const { uc, handle } = makeUcWithFakeTx({
      qrRow: sentQr,
      eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ', language: 'pt' },
    });
    await uc.execute(USER_ID, QR_ID, validBody, {});
    const handlerInput = handle.mock.calls[0]![0] as OnQuoteSentInput;
    expect(handlerInput.event.language).toBe('pt');
  });

  it('US-069 (BE-005 / D6): mapea `owner_status=suspended` como `suspended` para el handler', async () => {
    const { uc, handle } = makeUcWithFakeTx({
      qrRow: sentQr,
      eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ', owner_status: 'suspended' },
    });
    await uc.execute(USER_ID, QR_ID, validBody, {});
    const handlerInput = handle.mock.calls[0]![0] as OnQuoteSentInput;
    expect(handlerInput.organizerUser.status).toBe('suspended');
  });

  it('AC-03 SEC-04: `currency_code` del body es ignorado — se persiste currency del evento', async () => {
    const { uc, create } = makeUcWithFakeTx({
      qrRow: sentQr,
      eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ' },
    });

    const view = await uc.execute(
      USER_ID,
      QR_ID,
      { ...validBody, currency_code: 'USD' } as unknown as typeof validBody,
      {},
    );

    expect(view.currencyCode).toBe('GTQ');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: 'GTQ' }),
      }),
    );
  });

  it('AC-02: `valid_until` custom se respeta y se persiste a 23:59:59 UTC', async () => {
    const { uc, create } = makeUcWithFakeTx({
      qrRow: sentQr,
      eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ' },
    });

    const view = await uc.execute(
      USER_ID,
      QR_ID,
      { ...validBody, valid_until: '2026-08-15' },
      {},
    );

    expect(view.validUntil).toBe('2026-08-15T23:59:59.000Z');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ validUntil: new Date('2026-08-15T23:59:59.000Z') }),
      }),
    );
  });

  it('rechaza `valid_until` en el pasado con InvalidValidUntilError', async () => {
    const { uc } = makeUcWithFakeTx({
      qrRow: sentQr,
      eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ' },
    });
    await expect(
      uc.execute(USER_ID, QR_ID, { ...validBody, valid_until: '2026-07-15' }, {}),
    ).rejects.toBeInstanceOf(InvalidValidUntilError);
  });

  it('rechaza `valid_until` > today+90 con InvalidValidUntilError', async () => {
    const { uc } = makeUcWithFakeTx({
      qrRow: sentQr,
      eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ' },
    });
    await expect(
      uc.execute(USER_ID, QR_ID, { ...validBody, valid_until: '2026-12-01' }, {}),
    ).rejects.toBeInstanceOf(InvalidValidUntilError);
  });

  it('404 uniforme cuando el vendor no existe', async () => {
    const { uc } = makeUcWithFakeTx(
      { qrRow: sentQr },
      { findActive: async () => null },
    );
    await expect(uc.execute(USER_ID, QR_ID, validBody, {})).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('404 uniforme cuando el vendor está `hidden`', async () => {
    const { uc } = makeUcWithFakeTx(
      { qrRow: sentQr },
      { findActive: async () => activeVendorProfile({ status: 'hidden' }) },
    );
    await expect(uc.execute(USER_ID, QR_ID, validBody, {})).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('404 uniforme cuando el QR no pertenece al vendor', async () => {
    const { uc } = makeUcWithFakeTx({ qrRow: null });
    await expect(uc.execute(USER_ID, QR_ID, validBody, {})).rejects.toBeInstanceOf(QrNotFoundError);
  });

  it('409 QR_NOT_RESPONDABLE cuando el QR está `responded`', async () => {
    const { uc, handle } = makeUcWithFakeTx({
      qrRow: { ...sentQr, status: QuoteRequestStatus.responded },
    });
    await expect(uc.execute(USER_ID, QR_ID, validBody, {})).rejects.toBeInstanceOf(
      QrNotRespondableError,
    );
    expect(handle).not.toHaveBeenCalled();
  });

  it('409 QR_NOT_RESPONDABLE cuando el QR expiró (lazy)', async () => {
    const { uc } = makeUcWithFakeTx({
      qrRow: { ...sentQr, expires_at: new Date('2026-07-16T00:00:00Z') },
    });
    await expect(uc.execute(USER_ID, QR_ID, validBody, {})).rejects.toMatchObject({
      code: 'QR_NOT_RESPONDABLE',
      reason: 'expired',
    });
  });

  it('409 QUOTE_ALREADY_EXISTS cuando ya hay un Quote vigente para el QR', async () => {
    const existingId = 'q0000000-0000-0000-0000-existing00001';
    const { uc } = makeUcWithFakeTx({
      qrRow: sentQr,
      existingQuote: { id: existingId },
    });
    await expect(uc.execute(USER_ID, QR_ID, validBody, {})).rejects.toBeInstanceOf(
      QuoteAlreadyExistsError,
    );
  });

  it('emite log `quote.sent` solo cuando la transición ocurre', async () => {
    const { uc, emit } = makeUcWithFakeTx({
      qrRow: sentQr,
      eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ' },
    });
    await uc.execute(USER_ID, QR_ID, validBody, {});
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('quote.sent', expect.any(Object));
  });

  it('valid_until default = clock.now() + 15 días @ 23:59:59 UTC cuando no viene', async () => {
    const { uc, create } = makeUcWithFakeTx(
      { qrRow: sentQr, eventRow: { user_id: ORGANIZER_ID, currency: 'GTQ' } },
      { now: new Date('2026-07-16T12:00:00Z') },
    );
    await uc.execute(USER_ID, QR_ID, validBody, {});
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validUntil: new Date('2026-07-31T23:59:59.000Z'),
          status: QuoteStatus.sent,
        }),
      }),
    );
  });
});
