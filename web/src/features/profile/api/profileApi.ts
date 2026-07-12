import { httpGet, httpPatch, httpPost } from '@/shared/api-client';
import type {
  ChangePasswordRequestDTO,
  PreferredLanguage,
  UpdateProfileRequestDTO,
  UserProfile,
  UserProfileEnvelopeDTO,
} from './profileApi.types';

/**
 * API client de la feature profile (US-006 / US-007). Patrón `featureApi → modelo` (Doc 15 §24)
 * sobre `shared/api-client/httpClient`. La cookie de sesión HTTP-only viaja automáticamente
 * (`credentials: 'include'`); nunca se envía userId — el backend deriva la identidad de la sesión.
 */
export const profileApi = {
  /** AC-01: perfil propio. */
  async getMyProfile(): Promise<UserProfile> {
    const dto = await httpGet<UserProfileEnvelopeDTO>('/users/me');
    return dto.data;
  },

  /** AC-02: edición parcial de `name`/`phone`/`preferredLanguage`. */
  async updateProfile(input: UpdateProfileRequestDTO): Promise<UserProfile> {
    const dto = await httpPatch<UserProfileEnvelopeDTO, UpdateProfileRequestDTO>('/users/me', {
      body: input,
    });
    return dto.data;
  },

  /** US-007 / AC-03: atajo dedicado de cambio de idioma preferido. */
  async updatePreferredLanguage(preferredLanguage: PreferredLanguage): Promise<UserProfile> {
    const dto = await httpPatch<UserProfileEnvelopeDTO, { preferredLanguage: PreferredLanguage }>(
      '/users/me/preferred-language',
      { body: { preferredLanguage } },
    );
    return dto.data;
  },

  /** AC-04: cambio de contraseña (mantiene la sesión actual). 204 sin body. */
  async changePassword(input: ChangePasswordRequestDTO): Promise<void> {
    await httpPost<void, ChangePasswordRequestDTO>('/users/me/change-password', { body: input });
  },
};
