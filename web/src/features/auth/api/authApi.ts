import { httpPost, httpPostData } from '@/shared/api-client';
import { mapAuthUserToRegisteredUser } from '../mappers/registeredUserMapper';
import type { RegisteredUser } from '../types';
import type {
  AuthUserDTO,
  ForgotPasswordRequestDTO,
  LoginRequestDTO,
  RegisterOrganizerRequestDTO,
  RegisterVendorRequestDTO,
  ResetPasswordRequestDTO,
} from './authApi.types';

/**
 * API client de la feature auth (US-001 / FE-004; US-002 / FE-003). Patrón `featureApi → mapper
 * → modelo` (Doc 15 §24) sobre `shared/api-client/httpClient`. La cookie de sesión la emite el
 * backend (`Set-Cookie`; credentials: 'include' ya configurado en el httpClient) — nunca se
 * persiste token alguno en el navegador (SEC-06).
 */
export const authRegisterApi = {
  async registerOrganizer(input: Omit<RegisterOrganizerRequestDTO, 'role'>): Promise<RegisteredUser> {
    const dto = await httpPostData<AuthUserDTO, RegisterOrganizerRequestDTO>('/auth/register', {
      body: { ...input, role: 'organizer' },
    });
    return mapAuthUserToRegisteredUser(dto);
  },

  async registerVendor(input: Omit<RegisterVendorRequestDTO, 'role'>): Promise<RegisteredUser> {
    const dto = await httpPostData<AuthUserDTO, RegisterVendorRequestDTO>('/auth/register', {
      body: { ...input, role: 'vendor' },
    });
    return mapAuthUserToRegisteredUser(dto);
  },

  /** US-003 / FE-004: login con captcha condicional; la cookie de sesión viaja en Set-Cookie. */
  async login(input: LoginRequestDTO): Promise<RegisteredUser> {
    const body: LoginRequestDTO = { email: input.email, password: input.password };
    if (input.captchaToken) body.captchaToken = input.captchaToken;
    const dto = await httpPostData<AuthUserDTO, LoginRequestDTO>('/auth/login', { body });
    return mapAuthUserToRegisteredUser(dto);
  },

  /** US-004 / FE-003: siempre 202 genérico — anti-enumeración; el resultado no revela nada. */
  async forgotPassword(input: ForgotPasswordRequestDTO): Promise<void> {
    await httpPost<unknown, ForgotPasswordRequestDTO>('/auth/password/reset-request', { body: input });
  },

  /** US-004 / FE-003: 204 en éxito; errores TOKEN_INVALID/TOKEN_USED/GONE_TOKEN_EXPIRED. */
  async resetPassword(input: ResetPasswordRequestDTO): Promise<void> {
    await httpPost<unknown, ResetPasswordRequestDTO>('/auth/password/reset', { body: input });
  },

  /**
   * US-008 / FE-002: completa el signup OAuth con el rol elegido. La continuación viaja en la
   * cookie HTTP-only emitida por el callback (`credentials: 'include'`); el backend responde 201
   * con la sesión emitida. Errores: 410 OAUTH_CONTINUATION_INVALID (continuación ausente/expirada).
   */
  async completeGoogleSignup(role: 'organizer' | 'vendor'): Promise<RegisteredUser> {
    const dto = await httpPostData<AuthUserDTO, { role: 'organizer' | 'vendor' }>(
      '/auth/google/complete-signup',
      { body: { role } },
    );
    return mapAuthUserToRegisteredUser(dto);
  },

  /**
   * US-008 / FE-003: confirma la vinculación de la cuenta Google a una cuenta email/password
   * existente (AC-03). Solo procede con confirmación explícita; el backend responde 200 con sesión.
   */
  async confirmGoogleLink(): Promise<RegisteredUser> {
    const dto = await httpPostData<AuthUserDTO, { confirm: true }>('/auth/google/confirm-link', {
      body: { confirm: true },
    });
    return mapAuthUserToRegisteredUser(dto);
  },
};
