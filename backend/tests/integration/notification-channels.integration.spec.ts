// PR-6 — Caracterización con Postgres real de los repositorios de notificación: fila
// persistida y consulta de idempotencia (`user_id` + `type` + `payload->>'<clave>'`),
// con y sin transacción. Se salta sin BD.
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { dbUp, getTestPrisma } from '../helpers/test-db.js';
import { REPO_CASES } from '../helpers/notification-channel-cases.js';

describe.skipIf(!dbUp)('PR-6 caracterización — idempotencia contra Postgres real', () => {
  const prisma = getTestPrisma();
  const userIds: string[] = [];

  async function createUser(): Promise<string> {
    const user = await prisma.user.create({
      data: { email: `pr6-notif-${randomUUID()}@example.test`, role: 'organizer' },
    });
    userIds.push(user.id);
    return user.id;
  }

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  for (const c of REPO_CASES) {
    it(`${c.name}: persiste la fila y exists filtra por user + type + payload.<clave>`, async () => {
      const userId = await createUser();
      const otherUserId = await createUser();
      const repo = c.makeRepo(prisma);

      expect(await repo.exists(userId, c.idempotencyKey)).toBe(false);
      await repo.create(c.input(userId) as never);

      const rows = await prisma.notification.findMany({ where: { userId } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.type).toBe(c.type);
      expect(rows[0]?.payload).toEqual(c.payload);
      expect(rows[0]?.status).toBe('unread');

      expect(await repo.exists(userId, c.idempotencyKey)).toBe(true);
      expect(await repo.exists(userId, randomUUID())).toBe(false);
      expect(await repo.exists(otherUserId, c.idempotencyKey)).toBe(false);

      // Otra notificación del mismo usuario con la misma clave pero distinto `type` no cuenta.
      const otherTypeCase = REPO_CASES.find((o) => o.type !== c.type);
      const sameKeyOtherType = await createUser();
      await prisma.notification.create({
        data: {
          userId: sameKeyOtherType,
          type: otherTypeCase?.type ?? 'other',
          payload: c.payload as Prisma.InputJsonValue,
        },
      });
      expect(await repo.exists(sameKeyOtherType, c.idempotencyKey)).toBe(false);
    });

    if (c.supportsTx) {
      it(`${c.name}: dentro de una tx, exists ve la fila creada en la misma tx`, async () => {
        const userId = await createUser();
        const repo = c.makeRepo(prisma);
        await prisma.$transaction(async (tx) => {
          await repo.create(c.input(userId) as never, { tx });
          expect(await repo.exists(userId, c.idempotencyKey, { tx })).toBe(true);
        });
        expect(await prisma.notification.count({ where: { userId } })).toBe(1);
      });
    }
  }
});
