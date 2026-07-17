// US-057 (PB-P1-035 / QA-001) — Unit tests del `PrismaQuoteRepository.findComparableByEventAndCategory`.
// Verifica el orden estable requerido por AC-01: `is_preferred DESC, activos primero (sent,
// accepted), total_price ASC`. La query en sí (joins, whereRaw) queda cubierta por QA-002
// (integration test contra Postgres real) — aquí sólo se ejercita el post-processing en JS.
import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { PrismaQuoteRepository } from '../../src/modules/quote-flow/infrastructure/prisma-quote.repository.js';

const EVENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const SC_ID = '99999999-9999-9999-9999-999999999999';

// Registro Prisma parcial (sólo campos consumidos por `findComparableByEventAndCategory`).
interface FakeVendor {
  id: string;
  businessName: string;
  slug: string | null;
  ratingAvg: Prisma.Decimal | null;
  reviewsCount: number;
}

interface FakeQuoteRow {
  id: string;
  amount: Prisma.Decimal;
  status: 'sent' | 'accepted' | 'rejected' | 'expired';
  breakdown: unknown;
  conditions: string | null;
  validUntil: Date | null;
  isPreferred: boolean;
  createdAt: Date;
  vendorProfile: FakeVendor;
}

interface QOverrides {
  id: string;
  amount: string;
  status?: 'sent' | 'accepted' | 'rejected' | 'expired';
  breakdown?: unknown;
  conditions?: string | null;
  validUntil?: Date | null;
  isPreferred?: boolean;
  createdAt?: Date;
  vendorProfile?: FakeVendor;
}

function q(overrides: QOverrides): FakeQuoteRow {
  return {
    id: overrides.id,
    amount: new Prisma.Decimal(overrides.amount),
    status: overrides.status ?? 'sent',
    breakdown: overrides.breakdown ?? null,
    conditions: overrides.conditions ?? null,
    validUntil: overrides.validUntil ?? null,
    isPreferred: overrides.isPreferred ?? false,
    createdAt: overrides.createdAt ?? new Date('2026-07-01T12:00:00.000Z'),
    vendorProfile: overrides.vendorProfile ?? {
      id: `${overrides.id}-v`,
      businessName: `Vendor ${overrides.id}`,
      slug: null,
      ratingAvg: null,
      reviewsCount: 0,
    },
  };
}

function makeFakePrisma(rows: FakeQuoteRow[]): {
  quote: { findMany: (args: unknown) => Promise<FakeQuoteRow[]> };
} {
  return {
    quote: {
      findMany: async () => rows,
    },
  };
}

describe('US-057 · PrismaQuoteRepository.findComparableByEventAndCategory sort', () => {
  it('preferred primero, luego activos ASC por total_price, luego expired/rejected ASC', async () => {
    const fake = makeFakePrisma([
      q({ id: 'q-expired-cheap', status: 'expired', amount: '1000.00' }),
      q({ id: 'q-sent-mid', status: 'sent', amount: '4500.00' }),
      q({ id: 'q-preferred-high', status: 'sent', amount: '9000.00', isPreferred: true }),
      q({ id: 'q-accepted-low', status: 'accepted', amount: '2500.00' }),
      q({ id: 'q-rejected-mid', status: 'rejected', amount: '3000.00' }),
    ]);
    const repo = new PrismaQuoteRepository(
      fake as unknown as Parameters<typeof PrismaQuoteRepository.prototype.findComparableByEventAndCategory>[0] extends never
        ? never
        : ConstructorParameters<typeof PrismaQuoteRepository>[0],
    );
    const rows = await repo.findComparableByEventAndCategory({
      eventId: EVENT_ID,
      serviceCategoryId: SC_ID,
    });
    expect(rows.map((r) => r.quoteId)).toEqual([
      'q-preferred-high',
      'q-accepted-low',
      'q-sent-mid',
      'q-expired-cheap',
      'q-rejected-mid',
    ]);
  });

  it('dos preferred: se ordenan entre sí por total_price ASC (mismo bucket)', async () => {
    const fake = makeFakePrisma([
      q({ id: 'q-preferred-high', status: 'sent', amount: '9000.00', isPreferred: true }),
      q({ id: 'q-preferred-low', status: 'accepted', amount: '5000.00', isPreferred: true }),
      q({ id: 'q-non-preferred', status: 'sent', amount: '1000.00' }),
    ]);
    const repo = new PrismaQuoteRepository(
      fake as unknown as ConstructorParameters<typeof PrismaQuoteRepository>[0],
    );
    const rows = await repo.findComparableByEventAndCategory({
      eventId: EVENT_ID,
      serviceCategoryId: SC_ID,
    });
    expect(rows.map((r) => r.quoteId)).toEqual([
      'q-preferred-low',
      'q-preferred-high',
      'q-non-preferred',
    ]);
  });

  it('mapea campos del vendor whitelisteados (business_name, slug, rating_avg, reviews_count)', async () => {
    const fake = makeFakePrisma([
      q({
        id: 'q1',
        amount: '5000.00',
        vendorProfile: {
          id: 'vp1',
          businessName: 'Catering Aurora',
          slug: 'catering-aurora',
          ratingAvg: new Prisma.Decimal('4.60'),
          reviewsCount: 24,
        },
      }),
    ]);
    const repo = new PrismaQuoteRepository(
      fake as unknown as ConstructorParameters<typeof PrismaQuoteRepository>[0],
    );
    const rows = await repo.findComparableByEventAndCategory({
      eventId: EVENT_ID,
      serviceCategoryId: SC_ID,
    });
    expect(rows[0]?.vendor).toEqual({
      profileId: 'vp1',
      businessName: 'Catering Aurora',
      slug: 'catering-aurora',
      ratingAvg: 4.6,
      reviewsCount: 24,
    });
    // Campos sensibles del vendor NO están presentes en el shape (SEC-09).
    expect(Object.keys(rows[0]?.vendor ?? {})).toEqual([
      'profileId',
      'businessName',
      'slug',
      'ratingAvg',
      'reviewsCount',
    ]);
  });

  it('preserva `null` en rating_avg cuando el vendor no tiene reviews', async () => {
    const fake = makeFakePrisma([
      q({
        id: 'q1',
        amount: '1000.00',
        vendorProfile: {
          id: 'vp1',
          businessName: 'Sin reseñas',
          slug: null,
          ratingAvg: null,
          reviewsCount: 0,
        },
      }),
    ]);
    const repo = new PrismaQuoteRepository(
      fake as unknown as ConstructorParameters<typeof PrismaQuoteRepository>[0],
    );
    const rows = await repo.findComparableByEventAndCategory({
      eventId: EVENT_ID,
      serviceCategoryId: SC_ID,
    });
    expect(rows[0]?.vendor.ratingAvg).toBeNull();
    expect(rows[0]?.vendor.slug).toBeNull();
  });
});
