import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api-client';
import { authApi } from '@/shared/auth-session';
import { server } from '@/tests/msw/server';

describe('authApi.me', () => {
  it('mapea la sesión cuando el backend responde 200', async () => {
    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
          role: 'organizer',
          locale: 'es-LATAM',
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
