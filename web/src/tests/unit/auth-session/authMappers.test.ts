import { describe, expect, it } from 'vitest';
import { mapAuthSessionResponseToAuthSession, type AuthSessionResponseDTO } from '@/shared/auth-session';

describe('mapAuthSessionResponseToAuthSession', () => {
  it('mapea el DTO backend al frontend model', () => {
    const dto: AuthSessionResponseDTO = {
      user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
      role: 'organizer',
      locale: 'es-LATAM',
    };
    expect(mapAuthSessionResponseToAuthSession(dto)).toEqual({
      user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
      role: 'organizer',
      locale: 'es-LATAM',
    });
  });
});
