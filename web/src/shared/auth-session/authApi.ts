import { httpGet } from '@/shared/api-client';
import { mapUsersMeEnvelopeToAuthSession } from './authMappers';
import type { AuthSession, UsersMeEnvelopeDTO } from './types';

/**
 * Cliente de sesión bajo el patrón `featureApi → mapper → frontend model` (Doc 15 §24). Por
 * excepción foundation vive en `shared/auth-session/` (transversal, consumido por
 * `<SessionProvider>`). Path canónico `GET /api/v1/users/me` (Doc 16 §23 — alineado por
 * US-003 / API-001; el `/auth/me` de US-106 era un mock provisional).
 */
export const authApi = {
  async me(): Promise<AuthSession> {
    const dto = await httpGet<UsersMeEnvelopeDTO>('/users/me');
    return mapUsersMeEnvelopeToAuthSession(dto);
  },
};
