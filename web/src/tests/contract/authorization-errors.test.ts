// US-127 · PB-P2-015 · SEC-001
// Contratos de error de autorización (401 anónimo, 403 denegado) — el frontend
// DEBE poder observar la forma `{ error }` canónica (docs/16 §13) para reaccionar
// (login modal, toast de permisos, etc.). Los handlers MSW no son fuente de
// autorización — solo representan el contrato (SEC-04) — y este test verifica
// que:
//   - el envelope de error conforma al schema Zod compartido,
//   - `error.code` viaja como string legible,
//   - `error.message` no filtra secretos (SEC-02/03) — check textual defensivo.

import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../msw/server';
import { errorEnvelopeSchema } from './schemas';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

/** Patrones triviales que jamás deben aparecer en el body de un error MSW. */
const SECRET_TOKENS = [
  'password',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'bearer',
  'privateKey',
  'private_key',
] as const;

function assertNoSecretsInPayload(payload: string): void {
  const haystack = payload.toLowerCase();
  for (const needle of SECRET_TOKENS) {
    expect(haystack).not.toContain(needle.toLowerCase());
  }
}

describe('US-127 · contract · errores 401/403 — envelope { error } representable', () => {
  it('AUTH-TS-01 · GET /users/me sin sesión → 401 con envelope conforme', async () => {
    // Default handler ya devuelve 401 anónimo — no requiere override.
    const response = await fetch(`${API_BASE}/users/me`);
    expect(response.status).toBe(401);

    const raw = await response.text();
    assertNoSecretsInPayload(raw);

    const body: unknown = JSON.parse(raw);
    const parsed = errorEnvelopeSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed)).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(parsed.data.error.message.length).toBeGreaterThan(0);
  });

  it('403 · handler MSW puede representar denegado con envelope conforme', async () => {
    server.use(
      http.get('*/api/v1/admin/vendors', () =>
        HttpResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient role',
              correlationId: 'req_msw_forbidden',
            },
          },
          { status: 403 },
        ),
      ),
    );

    const response = await fetch(`${API_BASE}/admin/vendors`);
    expect(response.status).toBe(403);

    const raw = await response.text();
    assertNoSecretsInPayload(raw);

    const body: unknown = JSON.parse(raw);
    const parsed = errorEnvelopeSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.error.code).toBe('FORBIDDEN');
    expect(parsed.data.error.correlationId).toBeDefined();
  });

  it('SEC-04 · error 401 no puede quedarse "silencioso" — el body es JSON, no vacío', async () => {
    // Guardia contra el anti-patrón de responder 401 con body vacío
    // (rompería el manejo del frontend). Un handler que devolviera 401 sin
    // body dispararía este test.
    const response = await fetch(`${API_BASE}/users/me`);
    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text.length).toBeGreaterThan(0);
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it('error `details` (cuando existe) conforma al schema documentado', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid payload',
              correlationId: 'req_msw_val',
              details: [
                { field: 'email', message: 'Formato inválido' },
                { field: 'password', message: 'Requerida' },
              ],
            },
          },
          { status: 422 },
        ),
      ),
    );

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(422);
    const parsed = errorEnvelopeSchema.safeParse(await response.json());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.error.details?.length).toBe(2);
  });
});
