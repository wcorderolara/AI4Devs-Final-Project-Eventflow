import { httpGet } from '@/shared/api-client';
import { mapAuthSessionResponseToAuthSession } from './authMappers';
import type { AuthSession, AuthSessionResponseDTO } from './types';

/**
 * Primer cliente real bajo el patrón `featureApi → mapper → frontend model` (Doc 15 §24).
 * Por excepción foundation vive en `shared/auth-session/` (transversal, consumido por
 * `<SessionProvider>`). Login/register/logout → US-AUTH-*.
 */
export const authApi = {
  async me(): Promise<AuthSession> {
    const dto = await httpGet<AuthSessionResponseDTO>('/auth/me');
    return mapAuthSessionResponseToAuthSession(dto);
  },
};
