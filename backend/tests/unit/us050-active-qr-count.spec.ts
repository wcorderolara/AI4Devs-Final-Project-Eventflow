// US-050 (PB-P1-030 / QA-001 + BE-005) — Unit tests.
// Cobertura:
//   - DTO `activeQrCountUs050QuerySchema`: shape estricto + uuid + rechazo de campos extra.
//   - `GetActiveQrCountUs050UseCase`: branches happy/EventNotFound/InvalidCategory + cálculo
//     de `available_slots` con `limit=5`.
//   - `PrismaQuoteRequestActiveCounterAdapter`: query WHERE con filtro lazy `expires_at`.
//   - Logger `quote_request.limit_reached` emitido en 409 (US-049 UC).
import { describe, expect, it, vi } from 'vitest';
import { activeQrCountUs050QuerySchema } from '../../src/modules/quote-flow/dto/active-qr-count.us050.query.js';
import {
  GetActiveQrCountUs050UseCase,
  QR_CATEGORY_LIMIT,
} from '../../src/modules/quote-flow/application/get-active-qr-count.us050.use-case.js';
import { CreateQuoteRequestUs049UseCase } from '../../src/modules/quote-flow/application/create-quote-request.us049.use-case.js';
import {
  EventNotFoundError,
  ServiceCategoryUnavailableError,
  QuoteRequestCategoryLimitReachedError,
} from '../../src/modules/quote-flow/domain/us049.errors.js';
import { PrismaQuoteRequestActiveCounterAdapter } from '../../src/infrastructure/quote-flow/prisma-quote-request-active-counter.adapter.js';
import type { QuoteRequestActiveCounterPort } from '../../src/shared/application/quote-request-active-counter.port.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { QuoteNotificationSenderPort } from '../../src/shared/application/quote-notification-sender.port.js';

const UUID_A = '11111111-1111-1111-1111-111111111111';
const UUID_B = '22222222-2222-2222-2222-222222222222';
const UUID_C = '33333333-3333-3333-3333-333333333333';

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-050 · activeQrCountUs050QuerySchema', () => {
  it('acepta query válido con dos UUIDs', () => {
    const parsed = activeQrCountUs050QuerySchema.safeParse({
      event_id: UUID_A,
      service_category_id: UUID_C,
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza event_id no-UUID', () => {
    const parsed = activeQrCountUs050QuerySchema.safeParse({
      event_id: 'not-uuid',
      service_category_id: UUID_C,
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza service_category_id ausente', () => {
    const parsed = activeQrCountUs050QuerySchema.safeParse({ event_id: UUID_A });
    expect(parsed.success).toBe(false);
  });

  it('rechaza claves extra (.strict())', () => {
    const parsed = activeQrCountUs050QuerySchema.safeParse({
      event_id: UUID_A,
      service_category_id: UUID_C,
      extra: 'x',
    });
    expect(parsed.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UseCase — GetActiveQrCountUs050UseCase
// ─────────────────────────────────────────────────────────────────────────────
interface MockPrisma {
  event: { findFirst: ReturnType<typeof vi.fn> };
  serviceCategory: { findFirst: ReturnType<typeof vi.fn> };
}

function makePrisma(overrides: { event?: unknown; category?: unknown } = {}): MockPrisma {
  return {
    event: {
      findFirst: vi
        .fn()
        .mockResolvedValue(overrides.event === undefined ? { id: UUID_A } : overrides.event),
    },
    serviceCategory: {
      findFirst: vi
        .fn()
        .mockResolvedValue(overrides.category === undefined ? { id: UUID_C } : overrides.category),
    },
  };
}

function makeCounter(count: number): QuoteRequestActiveCounterPort & {
  countActiveByEventAndCategory: ReturnType<typeof vi.fn>;
} {
  return { countActiveByEventAndCategory: vi.fn().mockResolvedValue(count) };
}

describe('US-050 · GetActiveQrCountUs050UseCase', () => {
  const query = { event_id: UUID_A, service_category_id: UUID_C };

  it('AC-03 happy path: 0 activas ⇒ available_slots=5', async () => {
    const counter = makeCounter(0);
    const prisma = makePrisma();
    const uc = new GetActiveQrCountUs050UseCase(counter, prisma as never);
    const response = await uc.execute('org-1', query);
    expect(response).toEqual({
      active_count: 0,
      limit: 5,
      available_slots: 5,
      statuses_counted: ['sent', 'viewed', 'responded'],
    });
    expect(counter.countActiveByEventAndCategory).toHaveBeenCalledWith({
      eventId: UUID_A,
      serviceCategoryId: UUID_C,
      activeStatuses: ['sent', 'viewed', 'responded'],
      notExpired: true,
    });
  });

  it('AC-01: 4 activas ⇒ available_slots=1', async () => {
    const uc = new GetActiveQrCountUs050UseCase(makeCounter(4), makePrisma() as never);
    const response = await uc.execute('org-1', query);
    expect(response.active_count).toBe(4);
    expect(response.available_slots).toBe(1);
  });

  it('AC-02: 5 activas ⇒ available_slots=0', async () => {
    const uc = new GetActiveQrCountUs050UseCase(makeCounter(5), makePrisma() as never);
    const response = await uc.execute('org-1', query);
    expect(response.available_slots).toBe(0);
  });

  it('defensa: count > limit ⇒ available_slots nunca negativo', async () => {
    const uc = new GetActiveQrCountUs050UseCase(makeCounter(7), makePrisma() as never);
    const response = await uc.execute('org-1', query);
    expect(response.available_slots).toBe(0);
  });

  it('EC-02: evento inexistente/ajeno ⇒ EventNotFoundError (SEC-05 uniforme)', async () => {
    const uc = new GetActiveQrCountUs050UseCase(makeCounter(0), makePrisma({ event: null }) as never);
    await expect(uc.execute('org-1', query)).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('EC-03: categoría inexistente/inactiva ⇒ ServiceCategoryUnavailableError', async () => {
    const uc = new GetActiveQrCountUs050UseCase(makeCounter(0), makePrisma({ category: null }) as never);
    await expect(uc.execute('org-1', query)).rejects.toBeInstanceOf(ServiceCategoryUnavailableError);
  });

  it('QR_CATEGORY_LIMIT export es 5 (BR-QUOTE-009 / C-016)', () => {
    expect(QR_CATEGORY_LIMIT).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adapter — PrismaQuoteRequestActiveCounterAdapter (traduce el filtro lazy)
// ─────────────────────────────────────────────────────────────────────────────
describe('US-050 · PrismaQuoteRequestActiveCounterAdapter', () => {
  it('WHERE incluye status IN activos y filtro lazy `expires_at IS NULL OR expires_at > NOW()`', async () => {
    const count = vi.fn().mockResolvedValue(3);
    const adapter = new PrismaQuoteRequestActiveCounterAdapter({
      quoteRequest: { count },
    } as never);
    const result = await adapter.countActiveByEventAndCategory({
      eventId: UUID_A,
      serviceCategoryId: UUID_C,
      activeStatuses: ['sent', 'viewed', 'responded'],
      notExpired: true,
    });
    expect(result).toBe(3);
    expect(count).toHaveBeenCalledTimes(1);
    const arg = count.mock.calls[0]?.[0];
    expect(arg?.where?.eventId).toBe(UUID_A);
    expect(arg?.where?.serviceCategoryId).toBe(UUID_C);
    expect(arg?.where?.status?.in).toEqual(['sent', 'viewed', 'responded']);
    expect(arg?.where?.OR).toEqual([
      { expiresAt: null },
      { expiresAt: { gt: expect.any(Date) as unknown as Date } },
    ]);
  });

  it('sin `notExpired` NO agrega el filtro OR sobre expires_at', async () => {
    const count = vi.fn().mockResolvedValue(0);
    const adapter = new PrismaQuoteRequestActiveCounterAdapter({
      quoteRequest: { count },
    } as never);
    await adapter.countActiveByEventAndCategory({
      eventId: UUID_A,
      serviceCategoryId: UUID_C,
      activeStatuses: ['sent'],
      notExpired: false,
    });
    const arg = count.mock.calls[0]?.[0];
    expect(arg?.where?.OR).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Logger — quote_request.limit_reached emitido por US-049 UC
// ─────────────────────────────────────────────────────────────────────────────
describe('US-050 · quote_request.limit_reached (US-049 UC BE-005)', () => {
  it('emite el warning con event_id/service_category_id/active_count/limit y luego throw 409', async () => {
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: UUID_A,
            user_id: 'org-1',
            status: 'active',
            currency: 'GTQ',
            event_type_id: 'et-1',
            event_date: null,
            location_id: null,
            guests_count: null,
          },
        ])
        .mockResolvedValueOnce([
          { id: UUID_B, user_id: 'vendor-1', status: 'approved', deleted_at: null },
        ]),
      serviceCategory: { findFirst: vi.fn().mockResolvedValue({ id: UUID_C }) },
      quoteRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(5),
        create: vi.fn(),
      },
    };
    const prisma = { $transaction: (cb: (tx: unknown) => Promise<unknown>) => cb(tx) };
    const notifications = { notify: vi.fn() } as unknown as QuoteNotificationSenderPort;
    const logger = { emit: vi.fn() } as unknown as DomainEventLogger;
    const uc = new CreateQuoteRequestUs049UseCase(prisma as never, notifications, logger);

    await expect(
      uc.execute(
        'org-1',
        {
          event_id: UUID_A,
          vendor_profile_id: UUID_B,
          service_category_id: UUID_C,
          brief: { budget: '100', message: '' },
          source: 'manual',
        },
        { correlationId: 'cid-1' },
      ),
    ).rejects.toBeInstanceOf(QuoteRequestCategoryLimitReachedError);

    expect((logger.emit as ReturnType<typeof vi.fn>).mock.calls).toContainEqual([
      'quote_request.limit_reached',
      expect.objectContaining({
        correlationId: 'cid-1',
        actorId: 'org-1',
        eventId: UUID_A,
        serviceCategoryId: UUID_C,
        activeCount: 5,
        limit: 5,
      }),
    ]);
    // Notifications no deben dispararse porque el rollback ocurre por el throw.
    expect((notifications.notify as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});
