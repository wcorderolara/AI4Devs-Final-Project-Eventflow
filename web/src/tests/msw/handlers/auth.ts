import { http, HttpResponse } from 'msw';

/** Fixture 201 del contrato `POST /api/v1/auth/register` (US-001; envelope Doc 16 §13). */
export const registerSuccessEnvelope = {
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
  meta: { correlationId: 'req_msw_register', timestamp: '2026-07-10T00:00:00.000Z' },
} as const;

/** Fixture 200 del path canónico de sesión `GET /api/v1/users/me` (US-003 / Doc 16 §23). */
export const usersMeEnvelope = {
  data: { ...registerSuccessEnvelope.data },
  meta: { correlationId: 'req_msw_users_me', timestamp: '2026-07-10T00:00:00.000Z' },
} as const;

/** Fixture 200 del login (US-003; mismo envelope AuthUserResponse que register). */
export const loginSuccessEnvelope = {
  data: { ...registerSuccessEnvelope.data },
  meta: { correlationId: 'req_msw_login', timestamp: '2026-07-10T00:00:00.000Z' },
} as const;

// Por defecto: sesión anónima (401), registro y login exitosos. Cada test que necesite otro
// caso hace `server.use(...)` / `worker.use(...)` con un override.
export const authHandlers = [
  http.get('*/api/v1/users/me', () =>
    HttpResponse.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'No session' }, meta: { correlationId: 'req_msw' } },
      { status: 401 },
    ),
  ),
  // US-001/US-003: la cookie de sesión viaja en Set-Cookie (HttpOnly) — nunca en el JSON.
  http.post('*/api/v1/auth/register', () =>
    HttpResponse.json(registerSuccessEnvelope, { status: 201 }),
  ),
  http.post('*/api/v1/auth/login', () => HttpResponse.json(loginSuccessEnvelope, { status: 200 })),
  // US-005: logout 204 sin body (la limpieza de cookie HttpOnly ocurre vía Set-Cookie real).
  http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
  // US-004: reset-request SIEMPRE 202 genérico (anti-enumeración); reset 204 sin body.
  http.post('*/api/v1/auth/password/reset-request', () =>
    HttpResponse.json(
      { data: { message: 'If the email exists, a password reset link has been sent.' }, meta: { correlationId: 'req_msw_forgot' } },
      { status: 202 },
    ),
  ),
  http.post('*/api/v1/auth/password/reset', () => new HttpResponse(null, { status: 204 })),
];
