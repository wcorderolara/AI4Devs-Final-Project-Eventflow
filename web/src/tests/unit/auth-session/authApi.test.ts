import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api-client';
import { authApi } from '@/shared/auth-session';
import { server } from '@/tests/msw/server';

describe('authApi.me', () => {
  it('mapea la sesión cuando el backend responde 200', async () => {
    server.use(
      http.get('*/api/v1/users/me', () =>
        HttpResponse.json({
          data: { id: 'u1', email: 'a@b.com', name: 'Ana', role: 'organizer', status: 'active', preferredLanguage: 'es-LATAM', phone: null, createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z' },
          meta: { correlationId: 'req_test_me' },
        }),
      ),
    );
    const session = await authApi.me();
    expect(session.user.email).toBe('a@b.com');
    expect(session.role).toBe('organizer');
  });

  it('lanza ApiError 401 cuando la sesión es anónima (handler por defecto)', async () => {
    await expect(authApi.me()).rejects.toMatchObject({ status: 401 });
    await expect(authApi.me()).rejects.toBeInstanceOf(ApiError);
  });
});
