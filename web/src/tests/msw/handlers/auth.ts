import { http, HttpResponse } from 'msw';

// Por defecto: sesión anónima (401). Cada test que necesite sesión autenticada hace
// `server.use(...)` / `worker.use(...)` con un override que retorne 200.
export const authHandlers = [
  http.get('*/api/v1/auth/me', () =>
    HttpResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'No session' } }, { status: 401 }),
  ),
];
