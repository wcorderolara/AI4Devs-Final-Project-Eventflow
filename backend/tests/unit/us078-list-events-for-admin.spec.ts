// US-078 / QA-001 — Unit tests del use case `ListEventsForAdminUseCase` con Prisma stub en
// memoria. Verifica: filtros combinados (status multi, event_type_id, rango de fechas,
// organizer_search), cursor decode inválido, encode del nextCursor cuando hay más páginas, y
// forma del envelope `{items, pagination}`.
import { describe, expect, it } from 'vitest';
import { ListEventsForAdminUseCase } from '../../src/modules/admin-governance/application/list-events-for-admin.use-case.js';
import { encodeAdminEventsCursor } from '../../src/modules/admin-governance/application/admin-events-cursor.js';
import { Us078InvalidCursorError } from '../../src/modules/admin-governance/domain/us078.errors.js';
import type { AdminEventsQuery } from '../../src/modules/admin-governance/interface/admin-events-query.dto.js';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface StubRow {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  eventDate: Date | null;
  guestsCount: number | null;
  estimatedBudget: Decimal | null;
  currency: string;
  createdAt: Date;
  deletedAt: Date | null;
  user: { id: string; email: string; fullName: string | null };
  eventType: { id: string; code: string; label: string };
}

interface FindManyArgs {
  where?: {
    status?: { in: string[] };
    eventTypeId?: string;
    eventDate?: { gte?: Date; lte?: Date };
    user?: { OR: Array<{ email?: unknown; fullName?: unknown }> };
    AND?: unknown[];
  };
  take?: number;
}

function stub(rows: StubRow[], recorder?: (args: FindManyArgs) => void): PrismaClient {
  return {
    event: {
      findMany: async (args: FindManyArgs) => {
        recorder?.(args);
        const take = args.take ?? rows.length;
        return rows.slice(0, take);
      },
    },
  } as unknown as PrismaClient;
}

function row(id: string, over: Partial<StubRow> = {}): StubRow {
  return {
    id,
    title: over.title ?? `Event ${id}`,
    status: over.status ?? 'active',
    eventDate: over.eventDate ?? new Date('2026-08-01T00:00:00.000Z'),
    guestsCount: over.guestsCount ?? 100,
    estimatedBudget: over.estimatedBudget ?? new Decimal('1000.00'),
    currency: over.currency ?? 'GTQ',
    createdAt: over.createdAt ?? new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: over.deletedAt ?? null,
    user: over.user ?? {
      id: `u-${id}`,
      email: `owner+${id}@eventflow.test`,
      fullName: `Owner ${id}`,
    },
    eventType: over.eventType ?? { id: 'et-1', code: 'wedding', label: 'Wedding' },
  };
}

const QUERY = (over: Partial<AdminEventsQuery> = {}): AdminEventsQuery =>
  ({
    pageSize: 25,
    ...over,
  }) as AdminEventsQuery;

describe('US-078 / QA-001 — ListEventsForAdminUseCase', () => {
  it('AC-01: happy path devuelve items mapeados y sin nextCursor cuando no hay más páginas', async () => {
    const uc = new ListEventsForAdminUseCase(stub([row('a'), row('b')]));
    const result = await uc.execute(QUERY({ pageSize: 25 }));
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'a',
      title: 'Event a',
      status: 'active',
      currency: 'GTQ',
      owner: { email: 'owner+a@eventflow.test' },
      eventType: { code: 'wedding' },
    });
    expect(result.pagination).toEqual({ nextCursor: null, pageSize: 25 });
  });

  it('AC-01: emite nextCursor cuando la BD devuelve más filas de las solicitadas', async () => {
    const uc = new ListEventsForAdminUseCase(stub([row('a'), row('b'), row('c')]));
    const result = await uc.execute(QUERY({ pageSize: 2 }));
    expect(result.items).toHaveLength(2);
    expect(result.pagination.nextCursor).toBeTruthy();
  });

  it('D3: compone where con filtros combinados (status multi, event_type_id, rango fechas, organizer_search)', async () => {
    let captured: FindManyArgs | undefined;
    const uc = new ListEventsForAdminUseCase(stub([], (a) => (captured = a)));
    await uc.execute(
      QUERY({
        status: ['draft', 'active'],
        event_type_id: '11111111-1111-4111-8111-111111111111',
        event_date_from: new Date('2026-08-01T00:00:00Z'),
        event_date_to: new Date('2026-09-01T00:00:00Z'),
        organizer_search: 'jane',
      }),
    );
    expect(captured?.where?.status).toEqual({ in: ['draft', 'active'] });
    expect(captured?.where?.eventTypeId).toBe('11111111-1111-4111-8111-111111111111');
    expect(captured?.where?.eventDate?.gte).toEqual(new Date('2026-08-01T00:00:00Z'));
    expect(captured?.where?.eventDate?.lte).toEqual(new Date('2026-09-01T00:00:00Z'));
    expect(captured?.where?.user?.OR).toEqual([
      { email: { contains: 'jane', mode: 'insensitive' } },
      { fullName: { contains: 'jane', mode: 'insensitive' } },
    ]);
  });

  it('EC-04: cursor malformado lanza Us078InvalidCursorError', async () => {
    const uc = new ListEventsForAdminUseCase(stub([]));
    await expect(uc.execute(QUERY({ cursor: '!!!not-base64!!!' }))).rejects.toBeInstanceOf(
      Us078InvalidCursorError,
    );
  });

  it('cursor válido añade el keyset AND a la query', async () => {
    let captured: FindManyArgs | undefined;
    const uc = new ListEventsForAdminUseCase(stub([], (a) => (captured = a)));
    const cursor = encodeAdminEventsCursor({
      eventDate: new Date('2026-07-15T00:00:00Z'),
      id: '22222222-2222-4222-8222-222222222222',
    });
    await uc.execute(QUERY({ cursor }));
    expect(Array.isArray(captured?.where?.AND)).toBe(true);
  });

  it('take = pageSize + 1 para detectar hasMore', async () => {
    let captured: FindManyArgs | undefined;
    const uc = new ListEventsForAdminUseCase(stub([], (a) => (captured = a)));
    await uc.execute(QUERY({ pageSize: 10 }));
    expect(captured?.take).toBe(11);
  });
});
