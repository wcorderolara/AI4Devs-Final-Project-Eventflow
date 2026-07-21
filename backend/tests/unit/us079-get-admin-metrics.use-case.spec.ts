// US-079 (PB-P1-045) / QA-001 — Unit tests del `GetAdminMetricsUseCase` con Prisma stub
// en memoria. Verifica: composición de las 7 secciones + `generated_at`, cache hit en 2ª call,
// cache miss al expirar, breakdown AI por tipo con `success_count` excluyendo fallbacks
// (D5), y ausencia de campos comerciales (AC-05 / SEC-02 — covered end-to-end in QA-005 too).
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  GetAdminMetricsUseCase,
  ADMIN_METRICS_CACHE_KEY,
  ADMIN_METRICS_TTL_MS,
} from '../../src/modules/admin-governance/application/get-admin-metrics.use-case.js';
import { MetricsCacheService } from '../../src/modules/admin-governance/infrastructure/metrics-cache.service.js';

interface StubCounts {
  users: { total: number; byRole: Array<{ role: string; count: number }> };
  vendors: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    hiddenCount: number;
  };
  events: { total: number; byStatus: Array<{ status: string; count: number }> };
  quotes: {
    requestsCreated: number;
    responded: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  bookings: { created: number; confirmed: number; cancelled: number };
  reviews: { total: number; byStatus: Array<{ status: string; count: number }> };
  ai: {
    total: number;
    byKindTotal: Array<{ kind: string; count: number }>;
    byKindSuccess: Array<{ kind: string; count: number }>;
  };
}

function stubPrisma(counts: StubCounts): PrismaClient {
  const groupByFactory =
    (rows: Array<{ [k: string]: string | number }>, key: string) =>
    async (args: { where?: unknown }) => {
      void args;
      return rows.map((r) => ({ [key]: r[key], _count: { _all: r.count as number } }));
    };
  return {
    user: {
      count: async () => counts.users.total,
      groupBy: groupByFactory(
        counts.users.byRole.map((r) => ({ role: r.role, count: r.count })),
        'role',
      ),
    },
    vendorProfile: {
      count: async ({ where }: { where?: { isHidden?: boolean } } = {}) =>
        where?.isHidden === true ? counts.vendors.hiddenCount : counts.vendors.total,
      groupBy: groupByFactory(
        counts.vendors.byStatus.map((r) => ({ status: r.status, count: r.count })),
        'status',
      ),
    },
    event: {
      count: async () => counts.events.total,
      groupBy: groupByFactory(
        counts.events.byStatus.map((r) => ({ status: r.status, count: r.count })),
        'status',
      ),
    },
    quoteRequest: {
      count: async () => counts.quotes.requestsCreated,
    },
    quote: {
      count: async ({ where }: { where?: { status?: string | { in: string[] } } } = {}) => {
        const status = where?.status;
        if (typeof status === 'object' && status && 'in' in status) return counts.quotes.responded;
        if (status === 'accepted') return counts.quotes.accepted;
        if (status === 'rejected') return counts.quotes.rejected;
        if (status === 'expired') return counts.quotes.expired;
        return 0;
      },
    },
    bookingIntent: {
      count: async ({ where }: { where?: { status?: string } } = {}) => {
        if (!where?.status) return counts.bookings.created;
        if (where.status === 'confirmed_intent') return counts.bookings.confirmed;
        if (where.status === 'cancelled') return counts.bookings.cancelled;
        return 0;
      },
    },
    review: {
      count: async () => counts.reviews.total,
      groupBy: groupByFactory(
        counts.reviews.byStatus.map((r) => ({ status: r.status, count: r.count })),
        'status',
      ),
    },
    aIRecommendation: {
      count: async () => counts.ai.total,
      groupBy: async ({ where }: { where?: unknown }) => {
        // Distinguimos por presencia de filtro JSON path `aiMeta.fallbackUsed=false`.
        const isSuccessQuery = Boolean(
          where && typeof where === 'object' && 'aiMeta' in where,
        );
        const rows = isSuccessQuery ? counts.ai.byKindSuccess : counts.ai.byKindTotal;
        return rows.map((r) => ({ kind: r.kind, _count: { _all: r.count } }));
      },
    },
  } as unknown as PrismaClient;
}

const SAMPLE: StubCounts = {
  users: {
    total: 12,
    byRole: [
      { role: 'organizer', count: 8 },
      { role: 'vendor', count: 3 },
      { role: 'admin', count: 1 },
    ],
  },
  vendors: {
    total: 5,
    byStatus: [
      { status: 'pending', count: 1 },
      { status: 'approved', count: 4 },
    ],
    hiddenCount: 2,
  },
  events: {
    total: 10,
    byStatus: [
      { status: 'draft', count: 2 },
      { status: 'active', count: 6 },
      { status: 'completed', count: 2 },
    ],
  },
  quotes: {
    requestsCreated: 20,
    responded: 15,
    accepted: 8,
    rejected: 4,
    expired: 3,
  },
  bookings: { created: 9, confirmed: 6, cancelled: 1 },
  reviews: {
    total: 4,
    byStatus: [
      { status: 'published', count: 3 },
      { status: 'hidden', count: 1 },
    ],
  },
  ai: {
    total: 7,
    byKindTotal: [
      { kind: 'event_plan', count: 3 },
      { kind: 'checklist', count: 4 },
    ],
    byKindSuccess: [
      { kind: 'event_plan', count: 2 },
      { kind: 'checklist', count: 4 },
    ],
  },
};

const FIXED_DATE = new Date('2026-07-20T12:34:56.000Z');
const clock = () => FIXED_DATE;

describe('GetAdminMetricsUseCase', () => {
  it('compone las 7 secciones + generated_at desde Prisma en cache miss', async () => {
    const useCase = new GetAdminMetricsUseCase({
      cache: new MetricsCacheService(),
      prisma: stubPrisma(SAMPLE),
      clock,
    });
    const { metrics, cacheHit } = await useCase.execute();
    expect(cacheHit).toBe(false);
    expect(metrics).toEqual({
      users: {
        total: 12,
        by_role: { organizer: 8, vendor: 3, admin: 1 },
      },
      vendors: {
        total: 5,
        by_status: { pending: 1, approved: 4 },
        hidden_count: 2,
      },
      events: {
        total: 10,
        by_status: { draft: 2, active: 6, completed: 2 },
      },
      quotes: {
        quote_requests_created: 20,
        quotes_responded: 15,
        quotes_accepted: 8,
        quotes_rejected: 4,
        quotes_expired: 3,
      },
      bookings: {
        booking_intents_created: 9,
        booking_intents_confirmed: 6,
        booking_intents_cancelled: 1,
      },
      reviews: {
        total: 4,
        by_status: { published: 3, hidden: 1 },
      },
      ai: {
        total_recommendations: 7,
        by_type: {
          event_plan: { total_count: 3, success_count: 2 },
          checklist: { total_count: 4, success_count: 4 },
        },
      },
      generated_at: FIXED_DATE.toISOString(),
    });
  });

  it('retorna cache hit en la 2ª call sin re-consultar Prisma', async () => {
    const cache = new MetricsCacheService();
    const prisma = stubPrisma(SAMPLE);
    const countSpy = vi.spyOn(prisma.user, 'count');
    const useCase = new GetAdminMetricsUseCase({ cache, prisma, clock });

    const first = await useCase.execute();
    expect(first.cacheHit).toBe(false);
    const callsAfterFirst = countSpy.mock.calls.length;

    const second = await useCase.execute();
    expect(second.cacheHit).toBe(true);
    expect(countSpy.mock.calls.length).toBe(callsAfterFirst); // no new hits
    // El generated_at es idéntico entre hit y miss porque el TTL no expiró.
    expect(second.metrics.generated_at).toBe(first.metrics.generated_at);
  });

  it('recomputa cuando el TTL expira y actualiza generated_at', async () => {
    const state = { now: 1_000_000 };
    const cache = new MetricsCacheService({ now: () => state.now });
    const times = [
      new Date('2026-07-20T12:00:00.000Z'),
      new Date('2026-07-20T12:01:01.000Z'),
    ];
    let call = 0;
    const walkingClock = () => times[call++]!;

    const useCase = new GetAdminMetricsUseCase({
      cache,
      prisma: stubPrisma(SAMPLE),
      clock: walkingClock,
    });

    const first = await useCase.execute();
    state.now += ADMIN_METRICS_TTL_MS + 1;
    const second = await useCase.execute();
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(false);
    expect(second.metrics.generated_at).not.toBe(first.metrics.generated_at);
  });

  it('emite exactamente las claves del contrato (sin campos comerciales, AC-05)', async () => {
    const useCase = new GetAdminMetricsUseCase({
      cache: new MetricsCacheService(),
      prisma: stubPrisma(SAMPLE),
      clock,
    });
    const { metrics } = await useCase.execute();
    expect(Object.keys(metrics).sort()).toEqual(
      ['ai', 'bookings', 'events', 'generated_at', 'quotes', 'reviews', 'users', 'vendors'].sort(),
    );
    const serialized = JSON.stringify(metrics).toLowerCase();
    for (const forbidden of ['revenue', 'gmv', 'arpu', 'conversion_rate', 'monetary', 'earnings', 'profit']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('escribe la entrada bajo la clave canónica admin:metrics:v1', async () => {
    const cache = new MetricsCacheService();
    const useCase = new GetAdminMetricsUseCase({
      cache,
      prisma: stubPrisma(SAMPLE),
      clock,
    });
    await useCase.execute();
    expect(cache.get(ADMIN_METRICS_CACHE_KEY)).not.toBeNull();
  });
});
