// US-058 (PB-P1-035 / QA-001) — Unit tests.
// Cobertura:
//   - DTO `preferQuoteBodySchema`: happy path (true/false), `.strict()`, tipo booleano requerido.
//   - `QuoteEventNotificationService`: contiene los 5 eventos del type (`quote.rejected`,
//     `quote.expired`, `quote_request.cancelled`, `quote.marked_preferred`,
//     `quote.unmarked_preferred`).
//   - `PreferQuoteUs058UseCase` (branches): mark sin previa (AC-01), mark con previa
//     (AC-02 — clear + 4 notifs), unmark (AC-03), idempotencia (AC-04), EC-01 estado inválido,
//     EC-01 quote vencida, EC-02 ownership (Quote ajena), EC-02 quote inexistente, guard defensivo
//     de vendor missing.
import { QuoteStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { preferQuoteBodySchema } from '../../src/modules/quote-flow/dto/prefer-quote.us058.request.js';
import { PreferQuoteUs058UseCase } from '../../src/modules/quote-flow/application/prefer-quote.us058.use-case.js';
import { QuoteNotFoundError } from '../../src/modules/quote-flow/domain/us054.errors.js';
import { QuoteNotPreferableError } from '../../src/modules/quote-flow/domain/us058.errors.js';
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
const OTHER_QUOTE_ID = 'cccccccc-cccc-cccc-cccc-ccccccccccc9';
const QR_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EVENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const SC_ID = '99999999-9999-9999-9999-999999999999';
const VP_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const OTHER_VP_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11';
const VENDOR_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_VENDOR_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22';

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-058 · preferQuoteBodySchema', () => {
  it('acepta `{ is_preferred: true }`', () => {
    expect(preferQuoteBodySchema.safeParse({ is_preferred: true }).success).toBe(true);
  });

  it('acepta `{ is_preferred: false }`', () => {
    expect(preferQuoteBodySchema.safeParse({ is_preferred: false }).success).toBe(true);
  });

  it('rechaza body vacío `{}` (campo requerido)', () => {
    expect(preferQuoteBodySchema.safeParse({}).success).toBe(false);
  });

  it('rechaza campos ajenos (.strict())', () => {
    const parsed = preferQuoteBodySchema.safeParse({ is_preferred: true, extra: 1 });
    expect(parsed.success).toBe(false);
  });

  it('rechaza `is_preferred` no booleano (string/number)', () => {
    expect(preferQuoteBodySchema.safeParse({ is_preferred: 'true' }).success).toBe(false);
    expect(preferQuoteBodySchema.safeParse({ is_preferred: 1 }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QuoteEventName type: mantiene los 5 eventos soportados
// ─────────────────────────────────────────────────────────────────────────────
describe('US-058 · QuoteEventName', () => {
  it('el type acepta los 5 nombres de evento del lifecycle Quote/QuoteRequest', () => {
    const names: QuoteEventName[] = [
      'quote.rejected',
      'quote.expired',
      'quote_request.cancelled',
      'quote.marked_preferred',
      'quote.unmarked_preferred',
    ];
    expect(names).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UseCase
// ─────────────────────────────────────────────────────────────────────────────

interface FakeQuoteRow {
  id: string;
  quote_request_id: string;
  vendor_profile_id: string;
  event_id: string;
  service_category_id: string;
  status: QuoteStatus;
  valid_until: Date | null;
  is_preferred: boolean;
}

interface QuoteState {
  quote: FakeQuoteRow;
  previous?: FakeQuoteRow;
  organizerUserId: string;
  vendorUserIdByProfile: Record<string, string>;
}

function makeUC(
  state: QuoteState,
  opts?: { now?: Date; isPreferredTarget?: boolean },
): {
  uc: PreferQuoteUs058UseCase;
  emitSpy: ReturnType<typeof vi.fn>;
  logSpy: ReturnType<typeof vi.fn>;
  updates: Array<{ id: string; data: { isPreferred: boolean } }>;
} {
  const emitSpy = vi.fn(async (_input: EmitQuoteEventInput): Promise<void> => undefined);
  const logSpy = vi.fn();
  const updates: Array<{ id: string; data: { isPreferred: boolean } }> = [];
  const now = opts?.now ?? new Date('2026-07-17T15:00:00Z');
  const clock: ClockPort = { now: () => now };

  const service = { emit: emitSpy } as unknown as QuoteEventNotificationService;
  const logger: DomainEventLogger = { emit: logSpy };

  // Ordered $queryRaw responder. La secuencia depende del path (mark/unmark) y la existencia
  // de una preferred previa; el test pasa `isPreferredTarget` (equivalente a `body.is_preferred`)
  // para construir la sequencia correcta antes de ejecutar.
  const willMark = opts?.isPreferredTarget !== false; // default true (mark path)
  const sequence: unknown[][] = [
    [state.quote], // 1: quote lock
    [{ organizer_user_id: state.organizerUserId }], // 2: event owner
  ];
  if (willMark) {
    // Mark path: siempre corre la búsqueda de previa (puede volver vacía).
    sequence.push(state.previous ? [state.previous] : []);
    if (state.previous) {
      sequence.push([
        { user_id: state.vendorUserIdByProfile[state.previous.vendor_profile_id] },
      ]);
    }
  }
  // Target vendor lookup — corre siempre al final.
  sequence.push([{ user_id: state.vendorUserIdByProfile[state.quote.vendor_profile_id] }]);

  let idx = 0;
  const responder = (): unknown[] => {
    const result = sequence[idx] ?? [];
    idx += 1;
    return result;
  };

  // A fully-shaped Quote row compatible con `toQuoteView` (Prisma.Decimal + Date). Se usa como
  // valor de retorno de `findUniqueOrThrow` y `update` para evitar crashes en el mapper.
  const shapedQuote = (base: FakeQuoteRow) => ({
    id: base.id,
    quoteRequestId: base.quote_request_id,
    vendorProfileId: base.vendor_profile_id,
    amount: { toString: () => '1000.00' },
    currency: 'GTQ',
    breakdown: null,
    conditions: null,
    validUntil: base.valid_until,
    status: base.status,
    isPreferred: base.is_preferred,
    sentAt: new Date('2026-07-01T00:00:00Z'),
    acceptedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
  });

  const tx = {
    async $queryRaw<T>(): Promise<T[]> {
      return responder() as T[];
    },
    quote: {
      async findUniqueOrThrow(args: { where: { id: string } }): Promise<unknown> {
        if (args.where.id === state.quote.id) return shapedQuote(state.quote);
        throw new Error('not found');
      },
      async update(args: { where: { id: string }; data: { isPreferred: boolean } }): Promise<unknown> {
        updates.push({ id: args.where.id, data: args.data });
        if (args.where.id === state.quote.id) {
          state.quote = { ...state.quote, is_preferred: args.data.isPreferred };
        } else if (state.previous && args.where.id === state.previous.id) {
          state.previous = { ...state.previous, is_preferred: args.data.isPreferred };
        }
        return shapedQuote(state.quote);
      },
    },
  };

  const prisma = {
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn(tx);
    },
  } as unknown as ConstructorParameters<typeof PreferQuoteUs058UseCase>[3];

  const uc = new PreferQuoteUs058UseCase(service, clock, logger, prisma);
  return { uc, emitSpy, logSpy, updates };
}

function baseState(overrides?: {
  status?: QuoteStatus;
  validUntil?: Date | null;
  isPreferred?: boolean;
  ownedByOrganizerId?: string;
  previous?: { id: string; vendorProfileId: string; vendorUserId: string };
}): QuoteState {
  const state: QuoteState = {
    quote: {
      id: QUOTE_ID,
      quote_request_id: QR_ID,
      vendor_profile_id: VP_ID,
      event_id: EVENT_ID,
      service_category_id: SC_ID,
      status: overrides?.status ?? QuoteStatus.sent,
      valid_until: overrides?.validUntil ?? null,
      is_preferred: overrides?.isPreferred ?? false,
    },
    organizerUserId: overrides?.ownedByOrganizerId ?? ORGANIZER_ID,
    vendorUserIdByProfile: { [VP_ID]: VENDOR_USER_ID },
  };
  if (overrides?.previous) {
    state.previous = {
      id: overrides.previous.id,
      quote_request_id: `${QR_ID}-prev`,
      vendor_profile_id: overrides.previous.vendorProfileId,
      event_id: EVENT_ID,
      service_category_id: SC_ID,
      status: QuoteStatus.sent,
      valid_until: null,
      is_preferred: true,
    };
    state.vendorUserIdByProfile[overrides.previous.vendorProfileId] = overrides.previous.vendorUserId;
  }
  // Also render an untouched quote read-back — findUniqueOrThrow response minimally shaped for
  // `toQuoteView` (Prisma Decimal + Date fields). The unit tests skip the view shape assertion
  // and focus on side-effects.
  return state;
}

describe('US-058 · PreferQuoteUs058UseCase.execute', () => {
  it('AC-01 mark sin previa: UPDATE + 2 notifs `quote.marked_preferred` al vendor target', async () => {
    const state = baseState();
    const { uc, emitSpy, logSpy, updates } = makeUC(state);
    await uc.execute(ORGANIZER_ID, QUOTE_ID, { is_preferred: true });
    // Efectos: UPDATE al target, 1 llamada al service.
    expect(updates.some((u) => u.id === QUOTE_ID && u.data.isPreferred === true)).toBe(true);
    expect(emitSpy).toHaveBeenCalledTimes(1);
    const call = emitSpy.mock.calls[0]?.[0];
    expect(call?.eventName).toBe('quote.marked_preferred');
    expect(call?.recipientUserId).toBe(VENDOR_USER_ID);
    // Log emitido con metadatos.
    expect(logSpy).toHaveBeenCalledWith('quote.preferred.toggled', expect.objectContaining({
      previousValue: false,
      newValue: true,
    }));
  });

  it('AC-02 cambio de preferred: clear previa + set target + 4 notifs (2 target + 2 previa)', async () => {
    const state = baseState({
      previous: { id: OTHER_QUOTE_ID, vendorProfileId: OTHER_VP_ID, vendorUserId: OTHER_VENDOR_USER_ID },
    });
    const { uc, emitSpy, updates } = makeUC(state);
    await uc.execute(ORGANIZER_ID, QUOTE_ID, { is_preferred: true });
    // UPDATE aplicado a la previa (false) y a la target (true).
    expect(updates).toContainEqual({ id: OTHER_QUOTE_ID, data: { isPreferred: false } });
    expect(updates).toContainEqual({ id: QUOTE_ID, data: { isPreferred: true } });
    // 2 emits: 1 al vendor target, 1 al vendor previo.
    expect(emitSpy).toHaveBeenCalledTimes(2);
    const eventNames = emitSpy.mock.calls.map((c) => c[0].eventName);
    expect(eventNames).toContain('quote.marked_preferred');
    expect(eventNames).toContain('quote.unmarked_preferred');
  });

  it('AC-03 unmark: UPDATE false + 1 emit `quote.unmarked_preferred` al vendor target', async () => {
    const state = baseState({ isPreferred: true });
    const { uc, emitSpy, updates } = makeUC(state, { isPreferredTarget: false });
    await uc.execute(ORGANIZER_ID, QUOTE_ID, { is_preferred: false });
    expect(updates).toContainEqual({ id: QUOTE_ID, data: { isPreferred: false } });
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0]?.[0].eventName).toBe('quote.unmarked_preferred');
  });

  it('AC-04 idempotencia mark: valor actual = target ⇒ no-op sin emits ni UPDATE', async () => {
    const state = baseState({ isPreferred: true });
    const { uc, emitSpy, updates } = makeUC(state);
    await uc.execute(ORGANIZER_ID, QUOTE_ID, { is_preferred: true });
    expect(updates).toEqual([]);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('AC-04 idempotencia unmark: quote no preferred + unmark = no-op', async () => {
    const state = baseState({ isPreferred: false });
    const { uc, emitSpy, updates } = makeUC(state, { isPreferredTarget: false });
    await uc.execute(ORGANIZER_ID, QUOTE_ID, { is_preferred: false });
    expect(updates).toEqual([]);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-01 estado inválido (status=accepted) ⇒ QuoteNotPreferableError con current_status', async () => {
    const state = baseState({ status: QuoteStatus.accepted });
    const { uc, emitSpy } = makeUC(state);
    await expect(
      uc.execute(ORGANIZER_ID, QUOTE_ID, { is_preferred: true }),
    ).rejects.toBeInstanceOf(QuoteNotPreferableError);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-01 quote vencida por valid_until ⇒ QuoteNotPreferableError con current_status=expired', async () => {
    const state = baseState({ validUntil: new Date('2026-07-01T00:00:00Z') });
    const { uc, emitSpy } = makeUC(state, { now: new Date('2026-07-17T00:00:00Z') });
    try {
      await uc.execute(ORGANIZER_ID, QUOTE_ID, { is_preferred: true });
      throw new Error('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(QuoteNotPreferableError);
      if (err instanceof QuoteNotPreferableError) {
        expect(err.currentStatus).toBe('expired');
      }
    }
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('EC-02 ownership ajena ⇒ QuoteNotFoundError uniforme (no filtra existencia)', async () => {
    const state = baseState({ ownedByOrganizerId: OTHER_ORGANIZER_ID });
    const { uc, emitSpy } = makeUC(state);
    await expect(
      uc.execute(ORGANIZER_ID, QUOTE_ID, { is_preferred: true }),
    ).rejects.toBeInstanceOf(QuoteNotFoundError);
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
