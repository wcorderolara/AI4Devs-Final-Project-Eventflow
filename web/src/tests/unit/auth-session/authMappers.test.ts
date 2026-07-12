import { describe, expect, it } from 'vitest';
import { mapUsersMeEnvelopeToAuthSession, type UsersMeEnvelopeDTO } from '@/shared/auth-session';

describe('mapUsersMeEnvelopeToAuthSession (US-003 EMERGENT-001: envelope de GET /users/me)', () => {
  it('mapea el envelope AuthUserResponse al frontend model', () => {
    const dto: UsersMeEnvelopeDTO = {
      data: {
        id: 'u1',
        email: 'a@b.com',
        name: 'Ana',
        role: 'organizer',
        status: 'active',
        preferredLanguage: 'es-LATAM',
        phone: null,
        createdAt: '2026-07-10T00:00:00.000Z',
        updatedAt: '2026-07-10T00:00:00.000Z',
      },
      meta: { correlationId: 'req_x' },
    };
    expect(mapUsersMeEnvelopeToAuthSession(dto)).toEqual({
      user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
      role: 'organizer',
      locale: 'es-LATAM',
    });
  });
});
