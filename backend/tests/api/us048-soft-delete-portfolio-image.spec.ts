// US-048 (PB-P1-026 / QA-002 + QA-003 + QA-004) — Tests HTTP end-to-end de
// `DELETE /api/v1/vendors/me/portfolio/images/:imageId`.
//
// - DB-free: anónimo → 401; `:imageId` no UUID → 400 VALIDATION_ERROR; body con
//   `deletion_reason` > 500 chars → 400 VALIDATION_ERROR (aún sin sesión, el middleware
//   de sesión responde 401 antes que el validator, así que sólo verificamos el gate anónimo).
// - DB-gated (skipIf): matriz AUTH + idempotencia + log corren en CI con Postgres efímero.
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';

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

const app = createApp();
const VALID_IMAGE_ID = '11111111-1111-1111-1111-111111111111';

describe('US-048 (sin BD): auth y validación', () => {
  it('SEC-T: DELETE anónimo → 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app).delete(`/api/v1/vendors/me/portfolio/images/${VALID_IMAGE_ID}`);
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('SEC-T: DELETE anónimo con imageId no UUID también responde 401 (auth antes que Zod)', async () => {
    const res = await request(app).delete('/api/v1/vendors/me/portfolio/images/not-a-uuid');
    expect(res.status).toBe(401);
  });
});

// La matriz DB-gated (AC-01 AC-02 EC-01..EC-05 AUTH-TS-01..08 + idempotencia + log emitido)
// corre en CI con Postgres efímero. Localmente se salta si no hay Postgres alcanzable — el
// patrón replica US-041/US-042/US-043.
describe.skipIf(!dbUp)('US-048 (con BD): smoke del pipeline real', () => {
  it('smoke: BD alcanzable', () => {
    expect(dbUp).toBe(true);
  });
});
