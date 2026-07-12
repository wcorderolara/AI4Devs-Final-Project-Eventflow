import { http, HttpResponse } from 'msw';

/**
 * Fixtures y handlers MSW de la feature profile (US-006 / US-007). El `GET /users/me` por defecto
 * sigue siendo 401 (sesión anónima) vía `authHandlers`; los tests que necesiten sesión activa
 * hacen `server.use(authenticatedMeHandler)`. Aquí se registran las MUTACIONES (PATCH/POST) con
 * respuestas por defecto de éxito; los casos negativos se sobreescriben por test.
 */
export const profileEnvelope = {
  data: {
    id: '3f2c1a4e-9b7d-4e2a-8c5f-1d0e6a7b8c9d',
    email: 'ana@eventflow.test',
    name: 'Ana Pérez',
    role: 'organizer',
    status: 'active',
    preferredLanguage: 'es-LATAM',
    phone: null,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  },
  meta: { correlationId: 'req_msw_profile', timestamp: '2026-07-10T00:00:00.000Z' },
} as const;

/** Handler opcional de sesión autenticada — los tests lo activan con `server.use(...)`. */
export const authenticatedMeHandler = http.get('*/api/v1/users/me', () =>
  HttpResponse.json(profileEnvelope, { status: 200 }),
);

export const profileHandlers = [
  // AC-02: PATCH /users/me devuelve el perfil actualizado (echo del body sobre el fixture base).
  http.patch('*/api/v1/users/me', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return HttpResponse.json(
      { data: { ...profileEnvelope.data, ...body }, meta: profileEnvelope.meta },
      { status: 200 },
    );
  }),
  // AC-03: PATCH /users/me/preferred-language.
  http.patch('*/api/v1/users/me/preferred-language', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { preferredLanguage?: string };
    return HttpResponse.json(
      {
        data: { ...profileEnvelope.data, preferredLanguage: body.preferredLanguage ?? 'es-LATAM' },
        meta: profileEnvelope.meta,
      },
      { status: 200 },
    );
  }),
  // AC-04: POST /users/me/change-password → 204 sin body.
  http.post('*/api/v1/users/me/change-password', () => new HttpResponse(null, { status: 204 })),
];
