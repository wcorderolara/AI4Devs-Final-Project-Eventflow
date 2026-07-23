// US-127 · PB-P2-015 · QA-001
// Tests de contrato — validación de forma vía Zod para cada endpoint clave.
//
// El test hace `fetch` directo contra la URL interceptada por MSW (el server
// global se levanta en `vitest.setup.ts` con `onUnhandledRequest: 'error'`) y
// valida el cuerpo de la respuesta contra el schema Zod compartido
// (`./schemas.ts`). La suite falla ante:
//   - status HTTP ≠ el `successStatus` esperado (drift de código);
//   - body que no cumple `successSchema` (drift de forma) — AC-02 / VR-02;
//   - request no interceptada por ningún handler (VR-04, `onUnhandledRequest`).
//
// El objetivo NO es cobertura de todos los endpoints; es verificar que los
// endpoints clave (auth + health · docs/16 §21 y §Auth) exponen la forma
// documentada. La lista viaja en `KEY_ENDPOINTS`.

import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../msw/server';
import { usersMeEnvelope } from '../msw/handlers/auth';
import { KEY_ENDPOINTS, type KeyEndpoint } from './schemas';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

function endpointUrl(endpoint: KeyEndpoint): string {
  // KEY_ENDPOINTS.path es `/api/v1/...`; API_BASE ya contiene `/api/v1`.
  // Recorto el prefijo duplicado para construir una URL absoluta consistente.
  const rest = endpoint.path.replace(/^\/api\/v1/, '');
  return `${API_BASE}${rest}`;
}

async function callEndpoint(endpoint: KeyEndpoint): Promise<Response> {
  const init: RequestInit = { method: endpoint.method };
  if (endpoint.method === 'POST') {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(minimalRequestBodyFor(endpoint));
  }
  return fetch(endpointUrl(endpoint), init);
}

/**
 * Aplica overrides MSW cuando el contrato de éxito de un endpoint no es el
 * default del handler (p. ej. `GET /users/me` default es 401 anónimo — el
 * shape del 200 autenticado se cubre aquí; el 401 se cubre en el suite de
 * errores SEC-001). No muta la lista `KEY_ENDPOINTS`; el reset lo hace
 * `vitest.setup.ts:afterEach → server.resetHandlers()`.
 */
function applySuccessOverride(endpoint: KeyEndpoint): void {
  if (endpoint.method === 'GET' && endpoint.path === '/api/v1/users/me') {
    server.use(
      http.get('*/api/v1/users/me', () => HttpResponse.json(usersMeEnvelope, { status: 200 })),
    );
  }
}

/** Cuerpo mínimo para satisfacer los handlers MSW (que no validan input real). */
function minimalRequestBodyFor(endpoint: KeyEndpoint): Record<string, unknown> {
  switch (endpoint.path) {
    case '/api/v1/auth/register':
      return {
        email: 'test@eventflow.test',
        password: 'a-strong-password',
        name: 'Test',
        role: 'organizer',
        preferredLanguage: 'es-LATAM',
        captchaToken: 'msw-captcha',
        acceptedTerms: true,
      };
    case '/api/v1/auth/login':
      return { email: 'test@eventflow.test', password: 'a-strong-password' };
    case '/api/v1/auth/password/reset-request':
      return { email: 'test@eventflow.test', captchaToken: 'msw-captcha' };
    case '/api/v1/auth/password/reset':
      return { token: 'msw-token', newPassword: 'a-strong-password' };
    default:
      return {};
  }
}

describe('US-127 · contract · endpoints — forma de respuesta vía Zod', () => {
  for (const endpoint of KEY_ENDPOINTS) {
    const label = `${endpoint.method} ${endpoint.path} → ${endpoint.successStatus}`;

    it(`${label} conforma al schema compartido`, async () => {
      applySuccessOverride(endpoint);
      const response = await callEndpoint(endpoint);

      // AC-02 VR-02: primero el status; el shape es irrelevante si el código no
      // conforma al contrato documentado.
      expect(response.status, `status esperado ${endpoint.successStatus}`).toBe(
        endpoint.successStatus,
      );

      if (endpoint.successSchema === null) {
        // Contrato 204 · docs/16 §Auth (logout/reset): sin body. Verifico que
        // no llega un JSON con contenido — un handler que devolviera `{}` con
        // 204 rompería este assert.
        const text = await response.text();
        expect(text).toBe('');
        return;
      }

      const body: unknown = await response.json();
      const result = endpoint.successSchema.safeParse(body);

      if (!result.success) {
        // Mensaje ruidoso para NT-01/NT-02: identifica claramente el endpoint
        // que rompe el contrato para acelerar el fix.
        const detail = result.error.issues
          .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
          .join('; ');
        throw new Error(
          `Contract drift en ${endpoint.method} ${endpoint.path} — ${detail}`,
        );
      }
    });
  }
});
