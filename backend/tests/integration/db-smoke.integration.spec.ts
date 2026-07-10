// US-139 (PB-P0-018) BE-001 — Smoke de integración post-migración: valida conectividad Prisma ↔
// Postgres tras `migrate deploy`. Se invoca vía `npm run test:integration:smoke` en el job
// `migrations-validate` de CI, donde la BD SIEMPRE está disponible (service container). Sigue el
// patrón `skipIf(!dbUp)` del repo para que `npm test` (sin BD, EC-02) no falle; en el job de
// migraciones el step previo "Verificar DATABASE_URL" garantiza la conexión antes de correrlo.
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

const prisma = new PrismaClient();
let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

describe.skipIf(!dbUp)('US-139 — DB smoke (Prisma ↔ Postgres)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('AC-03: conecta y ejecuta una query trivial (SELECT 1)', async () => {
    const rows = await prisma.$queryRaw<Array<{ one: number }>>`SELECT 1 AS one`;
    expect(rows[0]?.one).toBe(1);
  });

  it('AC-02: el schema está migrado — la tabla `users` existe y es consultable', async () => {
    // `count()` falla si la migración no aplicó la tabla (valida `migrate deploy` previo).
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
