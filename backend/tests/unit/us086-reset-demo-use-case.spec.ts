// US-086 QA-001 / QA-006 — Unit: ResetDemoUseCase con prisma/lock/seedRunner mockeados.
// Cubre: orden FK descendente de deletes, filtro surgical `is_seed=true`, lock (acquire/release en
// happy y error paths, conflicto → 409), auditoría SEED_RESET / SEED_RESET_FAILED, propagación de
// correlationId. Sin BD real (determinista).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetDemoUseCase, type SeedRunner } from '../../src/modules/seed-demo/application/reset-demo.use-case.js';
import { SeedResetLock } from '../../src/modules/seed-demo/application/seed-reset.lock.js';
import { SeedResetInProgressError, SeedResetFailedError } from '../../src/shared/domain/errors/seed-demo.errors.js';
import type { SeedReport } from '../../src/modules/seed-demo/domain/seed-report.js';

// US-042: `vendorProfileCategory` se agrega antes de `vendorProfile` (FK ON DELETE RESTRICT).
// Su where usa el filtro navegable `{ vendorProfile: { isSeed: true } }` porque la M:N no tiene
// columna `isSeed` propia — igualmente surgical (SEC-04).
// `session` y `passwordResetToken` fueron añadidos posteriormente al orden de deletes: sus FK
// `onDelete: Restrict` sobre `users` obligan a limpiarlos antes del `user.deleteMany`. Ninguna
// tabla tiene columna `isSeed` propia — se filtran por el navegable `{ user: { isSeed: true } }`.
const DELETE_MODELS = [
  'notification', 'aIRecommendation', 'review', 'bookingIntent', 'quote', 'quoteRequest',
  'budgetItem', 'budget', 'eventTask', 'attachment', 'event', 'vendorService',
  'vendorProfileCategory', 'vendorProfile',
  'adminAction', 'serviceCategory', 'eventType', 'location',
  'session', 'passwordResetToken', 'user',
] as const;

/** Construye un tx fake donde cada modelo registra las llamadas a deleteMany (con su where). */
function buildTx() {
  const calls: Array<{ model: string; where: unknown }> = [];
  const tx: Record<string, { deleteMany: (args: { where: unknown }) => Promise<{ count: number }> }> = {};
  for (const model of DELETE_MODELS) {
    tx[model] = {
      deleteMany: vi.fn(async ({ where }: { where: unknown }) => {
        calls.push({ model, where });
        return { count: 1 };
      }),
    };
  }
  return { tx, calls };
}

function seedReport(): SeedReport {
  return {
    correlationId: 'cid',
    startedAt: '2026-07-10T00:00:00Z',
    finishedAt: '2026-07-10T00:00:01Z',
    durationMs: 1,
    scriptVersion: '1.0.0',
    domains: { users: { created: 19, updated: 0, unchanged: 0, skipped: 0 } },
    exitCode: 0,
  };
}

interface AuditData {
  action: string;
  isSeed: boolean;
  adminUserId: string;
  targetEntity: string;
  metadata: { correlationId: string };
}

function buildPrisma(txHolder: { tx: unknown }, opts: { actorExists?: boolean } = {}) {
  const adminActionCreate = vi.fn(async (_args: { data: AuditData }) => ({ id: 'admin-action-1' }));
  // `writeAudit` consulta `prisma.user.count()` para decidir si el actor sobrevive al reset
  // (nullable `adminUserId` en caso contrario). Default: existe (happy path original).
  const userCount = vi.fn(async () => (opts.actorExists === false ? 0 : 1));
  const prisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(txHolder.tx)),
    adminAction: { create: adminActionCreate },
    user: { count: userCount },
  };
  return { prisma, adminActionCreate, userCount };
}

describe('US-086 — ResetDemoUseCase', () => {
  let lock: SeedResetLock;
  beforeEach(() => {
    lock = new SeedResetLock();
  });

  it('happy path: 202 report con conteos, seedVersion y correlationId; audita SEED_RESET', async () => {
    const { tx, calls } = buildTx();
    const { prisma, adminActionCreate } = buildPrisma({ tx });
    const runnerExecute = vi.fn(async () => seedReport());
    const seedRunnerFactory = vi.fn((_cid: string): SeedRunner => ({ execute: runnerExecute }));

    const useCase = new ResetDemoUseCase({ prisma: prisma as never, lock, seedRunnerFactory });
    const report = await useCase.execute({ actorAdminId: 'admin-1', correlationId: 'corr-42', reason: 'demo' });

    expect(report.correlationId).toBe('corr-42');
    expect(report.seedVersion).toBe('1.0.0');
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.entitiesReseeded.users).toBe(19);
    // Todos los deletes filtran por is_seed=true (surgical, SEC-04). Excepciones documentadas:
    // - `vendorProfileCategory` (US-042) usa el filtro navegable `{ vendorProfile: { isSeed: true } }`
    //   porque la tabla M:N no tiene columna `isSeed` propia.
    // - `session` y `passwordResetToken` usan `{ user: { isSeed: true } }` por la misma razón.
    // - `adminAction` usa `{ OR: [{ isSeed: true }, { adminUser: { isSeed: true } }] }` para incluir
    //   auditorías creadas sobre usuarios seed durante la operación (p. ej. el propio reset).
    // Todas son igualmente surgical.
    const allowedWheres = [
      JSON.stringify({ isSeed: true }),
      JSON.stringify({ vendorProfile: { isSeed: true } }),
      JSON.stringify({ user: { isSeed: true } }),
      JSON.stringify({ OR: [{ isSeed: true }, { adminUser: { isSeed: true } }] }),
    ];
    expect(calls.every((c) => allowedWheres.includes(JSON.stringify(c.where)))).toBe(true);
    // Orden FK descendente: notification primero, user último.
    expect(calls[0]!.model).toBe('notification');
    expect(calls[calls.length - 1]!.model).toBe('user');
    // seedRunner recibió el correlationId del reset.
    expect(seedRunnerFactory).toHaveBeenCalledWith('corr-42');
    // Auditoría SEED_RESET con isSeed=false y correlationId en metadata.
    expect(adminActionCreate).toHaveBeenCalledTimes(1);
    const auditArg = adminActionCreate.mock.calls[0]![0];
    expect(auditArg.data.action).toBe('SEED_RESET');
    expect(auditArg.data.isSeed).toBe(false);
    expect(auditArg.data.adminUserId).toBe('admin-1');
    expect(auditArg.data.targetEntity).toBe('seed-demo');
    expect(auditArg.data.metadata.correlationId).toBe('corr-42');
    // Lock liberado al final.
    expect(lock.isLocked()).toBe(false);
  });

  it('EC-03: segundo reset concurrente → SeedResetInProgressError, sin tocar la BD', async () => {
    const { tx } = buildTx();
    const { prisma } = buildPrisma({ tx });
    const seedRunnerFactory = (_cid: string): SeedRunner => ({ execute: async () => seedReport() });
    lock.acquire(); // simula un reset ya en curso

    const useCase = new ResetDemoUseCase({ prisma: prisma as never, lock, seedRunnerFactory });
    await expect(useCase.execute({ actorAdminId: 'a', correlationId: 'c' })).rejects.toBeInstanceOf(SeedResetInProgressError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('EC-02: falla parcial → SeedResetFailedError, audita SEED_RESET_FAILED y libera el lock', async () => {
    const { tx } = buildTx();
    const { prisma, adminActionCreate } = buildPrisma({ tx });
    prisma.$transaction = vi.fn(async () => {
      throw new Error('boom en lote intermedio');
    });
    const seedRunnerFactory = (_cid: string): SeedRunner => ({ execute: async () => seedReport() });

    const useCase = new ResetDemoUseCase({ prisma: prisma as never, lock, seedRunnerFactory });
    await expect(useCase.execute({ actorAdminId: 'admin-9', correlationId: 'corr-err' })).rejects.toBeInstanceOf(SeedResetFailedError);

    const auditArg = adminActionCreate.mock.calls[0]![0];
    expect(auditArg.data.action).toBe('SEED_RESET_FAILED');
    expect(lock.isLocked()).toBe(false);
  });
});
