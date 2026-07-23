// US-127 · PB-P2-015 · QA-004
// Determinismo de la suite de contrato. Verifica los tres pilares de VR-04:
//   1. `onUnhandledRequest: 'error'`: cualquier request `/api/v1/*` sin
//      handler dedicado cae en el catch-all → HTTP 501 NOT_MOCKED. No hay
//      red real.
//   2. Reset de handlers entre tests: overrides con `server.use()` en un
//      `it` no filtran al siguiente (garantizado por `afterEach:
//      server.resetHandlers()` en `vitest.setup.ts`).
//   3. Estabilidad de forma: correr un endpoint clave N veces produce
//      exactamente el mismo shape (mismos keys de nivel top).

import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../msw/server';
import { authUserEnvelope, healthResponseSchema } from './schemas';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
const REPEATS = 10;

describe('US-127 · contract · determinismo', () => {
  it('VR-04 · request no manejada cae en catch-all 501 (sin red real)', async () => {
    // El catch-all vive en `web/src/tests/msw/handlers/index.ts` y devuelve
    // 501 NOT_MOCKED. Si en el futuro se removiera, `onUnhandledRequest:
    // 'error'` levantaría un throw — este test capturaría el cambio.
    const response = await fetch(`${API_BASE}/does-not-exist-${Math.random()}`);
    expect(response.status).toBe(501);
    const body: { error?: { code?: string } } = await response.json();
    expect(body.error?.code).toBe('NOT_MOCKED');
  });

  it(`estabilidad · /health devuelve el mismo shape en ${REPEATS} corridas consecutivas`, async () => {
    const shapes = new Set<string>();
    for (let i = 0; i < REPEATS; i += 1) {
      const response = await fetch(`${API_BASE}/health`);
      const body: unknown = await response.json();
      const parsed = healthResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);
      if (!parsed.success) continue;
      shapes.add(Object.keys(parsed.data).sort().join(','));
    }
    // Un único shape observado en N corridas → determinismo.
    expect(shapes.size).toBe(1);
  });

  it('aislamiento · overrides con server.use no filtran al siguiente test (parte 1: setup)', async () => {
    // Handler tóxico: si filtrara al próximo test, `/users/me` vería 418 en
    // vez del 401 default y el test siguiente fallaría — MSW garantiza el
    // reset via `afterEach → server.resetHandlers()` en vitest.setup.ts.
    server.use(
      http.get('*/api/v1/users/me', () => HttpResponse.json({ tainted: true }, { status: 418 })),
    );
    const response = await fetch(`${API_BASE}/users/me`);
    expect(response.status).toBe(418);
  });

  it('aislamiento · handlers reseteados: /users/me vuelve al 401 default', async () => {
    // Si el reset no ocurriera, este test recibiría el 418 sembrado arriba.
    const response = await fetch(`${API_BASE}/users/me`);
    expect(response.status).toBe(401);
    const parsed = authUserEnvelope.safeParse(await response.json().catch(() => ({})));
    // El default es un error envelope, no un envelope de éxito — success debe
    // ser false porque el shape es distinto.
    expect(parsed.success).toBe(false);
  });
});
