// US-139 (PB-P0-018) BE-001 — Smoke de integración post-migración: valida conectividad Prisma ↔
// Postgres tras `migrate deploy`. A diferencia de las suites de dominio, este smoke NO se auto-omite:
// se invoca vía `npm run test:integration:smoke` en el job `migrations-validate` de CI, donde la BD
// SIEMPRE está disponible (service container). Falla explícitamente si no hay BD alcanzable.
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

const prisma = new PrismaClient();

describe('US-139 — DB smoke (Prisma ↔ Postgres)', () => {
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
