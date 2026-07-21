// US-080 / QA-001 — Unit tests del UseCase `ListAdminActionsUseCase`. Prisma stub en memoria.
// Verifica: filtros combinados (admin_id → adminUserId, target_type → targetEntity, target_id,
// action, rango fechas), cursor decode inválido, encode del nextCursor, forma del envelope
// `{items, pagination}` y AC-04 (NO llama a `adminAction.create`).
import { describe, expect, it, vi } from 'vitest';
import { ListAdminActionsUseCase } from '../../src/modules/admin-governance/application/list-admin-actions.use-case.js';
import { encodeAdminActionsCursor } from '../../src/modules/admin-governance/application/admin-actions-cursor.js';
import { Us080InvalidCursorError } from '../../src/modules/admin-governance/domain/us080.errors.js';
import type { AdminActionsQuery } from '../../src/modules/admin-governance/interface/admin-actions-query.dto.js';
import type { PrismaClient } from '@prisma/client';

interface StubRow {
  id: string;
  adminUserId: string | null;
  targetEntity: string;
  targetId: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  adminUser: { id: string; email: string; fullName: string | null } | null;
}

interface FindManyArgs {
  where?: {
    adminUserId?: string;
    targetEntity?: string;
    targetId?: string;
    action?: string;
    createdAt?: { gte?: Date; lte?: Date };
    AND?: unknown[];
  };
  take?: number;
}

function stub(
  rows: StubRow[],
  recorder?: (args: FindManyArgs) => void,
): { prisma: PrismaClient; createSpy: ReturnType<typeof vi.fn> } {
  const createSpy = vi.fn();
  const prisma = {
    adminAction: {
      findMany: async (args: FindManyArgs) => {
        recorder?.(args);
        const take = args.take ?? rows.length;
        return rows.slice(0, take);
      },
      create: createSpy,
    },
  } as unknown as PrismaClient;
  return { prisma, createSpy };
}

function row(id: string, over: Partial<StubRow> = {}): StubRow {
  return {
    id,
    adminUserId: over.adminUserId ?? 'ad000001-0000-0000-0000-000000000001',
    targetEntity: over.targetEntity ?? 'review',
    targetId: over.targetId ?? '22222222-2222-2222-2222-222222222222',
    action: over.action ?? 'hide',
    metadata: over.metadata ?? null,
    createdAt: over.createdAt ?? new Date('2026-07-20T00:00:00.000Z'),
    adminUser: over.adminUser ?? {
      id: 'ad000001-0000-0000-0000-000000000001',
      email: 'admin@eventflow.test',
      fullName: 'Admin Demo',
    },
  };
}

const UUID_A = 'aaaaaaaa-1111-1111-1111-111111111111';
const UUID_B = 'bbbbbbbb-2222-2222-2222-222222222222';

const QUERY = (over: Partial<AdminActionsQuery> = {}): AdminActionsQuery =>
  ({ pageSize: 25, ...over }) as AdminActionsQuery;

describe('US-080 / QA-001 — ListAdminActionsUseCase', () => {
  it('AC-01 happy path: devuelve items mapeados y sin nextCursor cuando no hay más', async () => {
    const { prisma } = stub([row(UUID_A), row(UUID_B)]);
    const uc = new ListAdminActionsUseCase(prisma);
    const result = await uc.execute(QUERY());
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.id).toBe(UUID_A);
    expect(result.pagination.nextCursor).toBeNull();
    expect(result.pagination.pageSize).toBe(25);
  });

  it('AC-01 filtros combinados se traducen a WHERE Prisma', async () => {
    let captured: FindManyArgs | undefined;
    const { prisma } = stub([], (args) => {
      captured = args;
    });
    const uc = new ListAdminActionsUseCase(prisma);
    await uc.execute(
      QUERY({
        admin_id: UUID_A,
        target_type: 'vendor_profile',
        target_id: UUID_B,
        action: 'approve',
        created_at_from: new Date('2026-07-01T00:00:00.000Z'),
        created_at_to: new Date('2026-07-31T23:59:59.999Z'),
      }),
    );
    expect(captured?.where?.adminUserId).toBe(UUID_A);
    expect(captured?.where?.targetEntity).toBe('vendor_profile');
    expect(captured?.where?.targetId).toBe(UUID_B);
    expect(captured?.where?.action).toBe('approve');
    expect(captured?.where?.createdAt?.gte).toEqual(new Date('2026-07-01T00:00:00.000Z'));
    expect(captured?.where?.createdAt?.lte).toEqual(new Date('2026-07-31T23:59:59.999Z'));
  });

  it('AC-01 emite nextCursor cuando hay más páginas (take = pageSize + 1)', async () => {
    const rows = [
      row(UUID_A, { createdAt: new Date('2026-07-20T00:00:00.000Z') }),
      row(UUID_B, { createdAt: new Date('2026-07-19T00:00:00.000Z') }),
      row('cccccccc-3333-3333-3333-333333333333', {
        createdAt: new Date('2026-07-18T00:00:00.000Z'),
      }),
    ];
    const { prisma } = stub(rows);
    const uc = new ListAdminActionsUseCase(prisma);
    const result = await uc.execute(QUERY({ pageSize: 2 }));
    expect(result.items).toHaveLength(2);
    expect(result.pagination.nextCursor).not.toBeNull();
  });

  it('EC-02: cursor malformado ⇒ Us080InvalidCursorError', async () => {
    const { prisma } = stub([row(UUID_A)]);
    const uc = new ListAdminActionsUseCase(prisma);
    await expect(uc.execute(QUERY({ cursor: '!!!bad!!!' }))).rejects.toBeInstanceOf(
      Us080InvalidCursorError,
    );
  });

  it('EC-02: cursor válido se traduce a AND clause', async () => {
    let captured: FindManyArgs | undefined;
    const { prisma } = stub([], (args) => {
      captured = args;
    });
    const uc = new ListAdminActionsUseCase(prisma);
    const cursor = encodeAdminActionsCursor({
      createdAt: new Date('2026-07-20T00:00:00.000Z'),
      id: UUID_A,
    });
    await uc.execute(QUERY({ cursor }));
    expect(Array.isArray(captured?.where?.AND)).toBe(true);
  });

  it('AC-04: NO se llama a prisma.adminAction.create al ejecutar (self-log evitado)', async () => {
    const { prisma, createSpy } = stub([row(UUID_A)]);
    const uc = new ListAdminActionsUseCase(prisma);
    await uc.execute(QUERY());
    expect(createSpy).not.toHaveBeenCalled();
  });
});
