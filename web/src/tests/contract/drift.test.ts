// US-127 · PB-P2-015 · QA-002
// Tests de detección de drift — el objetivo es demostrar que la suite falla
// explícitamente cuando el DTO/handler no conforma con el schema de contrato
// (NT-01, NT-02, EC-02).
//
// La estrategia es negativa: sobrescribo intencionalmente un handler MSW con
// una respuesta MAL formada, invoco el endpoint y espero que el schema Zod
// LO RECHACE con un mensaje que identifica el endpoint/campo afectado. Si el
// schema aceptara la respuesta rota, la suite no detectaría drift real en
// producción; por eso este test es guardián del guardián.

import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../msw/server';
import {
  authUserEnvelope,
  errorEnvelopeSchema,
  healthResponseSchema,
  KEY_ENDPOINTS,
  passwordResetRequestEnvelope,
} from './schemas';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

describe('US-127 · contract · drift — detección de respuestas no conformes', () => {
  it('NT-02 · /health sin `version` falla y el error identifica el campo faltante', async () => {
    server.use(
      http.get('*/api/v1/health', () =>
        HttpResponse.json({ status: 'ok', uptimeMs: 0, timestamp: '2026-07-23T00:00:00.000Z' }),
      ),
    );

    const response = await fetch(`${API_BASE}/health`);
    const body: unknown = await response.json();
    const parsed = healthResponseSchema.safeParse(body);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    // NT-02 (mensaje claro): al menos un issue apunta al campo removido.
    expect(parsed.error.issues.some((i) => i.path.join('.') === 'version')).toBe(true);
  });

  it('NT-01 · /auth/login pierde el envelope `meta.correlationId` → drift detectado', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            data: {
              id: '3f2c1a4e-9b7d-4e2a-8c5f-1d0e6a7b8c9d',
              email: 'a@b.co',
              name: 'A',
              role: 'organizer',
              status: 'active',
              preferredLanguage: 'es-LATAM',
              phone: null,
              createdAt: '2026-07-10T00:00:00.000Z',
              updatedAt: '2026-07-10T00:00:00.000Z',
            },
            // `meta.correlationId` faltante intencionalmente — simula backend
            // que rompió el contrato de envelope.
            meta: { timestamp: '2026-07-10T00:00:00.000Z' },
          },
          { status: 200 },
        ),
      ),
    );

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.co', password: 'x' }),
    });
    const body: unknown = await response.json();
    const parsed = authUserEnvelope.safeParse(body);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((i) => i.path.join('.') === 'meta.correlationId')).toBe(
      true,
    );
  });

  it('DTO backend cambia el tipo (`status: "wat"`) → schema falla en el enum', async () => {
    server.use(
      http.get('*/api/v1/health', () =>
        HttpResponse.json({
          status: 'wat', // valor fuera del enum documentado ({ok,degraded,error}).
          version: 'msw-test',
          uptimeMs: 0,
          timestamp: '2026-07-23T00:00:00.000Z',
        }),
      ),
    );

    const response = await fetch(`${API_BASE}/health`);
    const body: unknown = await response.json();
    const parsed = healthResponseSchema.safeParse(body);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((i) => i.path.join('.') === 'status')).toBe(true);
  });

  it('envelope de éxito recibido en un endpoint que espera 202 con `message` → schema falla', async () => {
    server.use(
      http.post('*/api/v1/auth/password/reset-request', () =>
        // Falta `data.message`: el 202 anti-enumeración exige el mensaje
        // genérico en el contrato (docs/16 · US-004).
        HttpResponse.json(
          {
            data: {},
            meta: { correlationId: 'req_msw', timestamp: '2026-07-10T00:00:00.000Z' },
          },
          { status: 202 },
        ),
      ),
    );

    const response = await fetch(`${API_BASE}/auth/password/reset-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@y.z', captchaToken: 't' }),
    });
    const body: unknown = await response.json();
    const parsed = passwordResetRequestEnvelope.safeParse(body);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.some((i) => i.path.join('.') === 'data.message')).toBe(true);
  });

  it('drift-guard listo: cada endpoint clave tiene un schema (o `null` para 204)', () => {
    // Meta-check: la lista de endpoints clave no puede tener huecos. Si en el
    // futuro se agrega un endpoint sin schema, este test lo detecta antes de
    // que el gate CI lo pase de largo.
    for (const endpoint of KEY_ENDPOINTS) {
      if (endpoint.successStatus === 204) {
        expect(endpoint.successSchema, `${endpoint.path} 204 esperado sin body`).toBeNull();
      } else {
        expect(endpoint.successSchema, `${endpoint.path} requiere schema`).not.toBeNull();
      }
    }
    // Y el error envelope canónico debe existir para representar 4xx/5xx.
    expect(errorEnvelopeSchema).toBeDefined();
  });
});
