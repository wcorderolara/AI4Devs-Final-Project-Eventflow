import { httpPost } from '@/shared/api-client';
import { mapAuthUserEnvelopeToRegisteredUser } from '../mappers/registeredUserMapper';
import type { RegisteredUser } from '../types';
import type {
  AuthUserEnvelopeDTO,
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
    const dto = await httpPost<AuthUserEnvelopeDTO, RegisterOrganizerRequestDTO>('/auth/register', {
      body: { ...input, role: 'organizer' },
    });
    return mapAuthUserEnvelopeToRegisteredUser(dto);
  },

  async registerVendor(input: Omit<RegisterVendorRequestDTO, 'role'>): Promise<RegisteredUser> {
    const dto = await httpPost<AuthUserEnvelopeDTO, RegisterVendorRequestDTO>('/auth/register', {
      body: { ...input, role: 'vendor' },
    });
    return mapAuthUserEnvelopeToRegisteredUser(dto);
  },

  /** US-003 / FE-004: login con captcha condicional; la cookie de sesión viaja en Set-Cookie. */
  async login(input: LoginRequestDTO): Promise<RegisteredUser> {
    const body: LoginRequestDTO = { email: input.email, password: input.password };
    if (input.captchaToken) body.captchaToken = input.captchaToken;
    const dto = await httpPost<AuthUserEnvelopeDTO, LoginRequestDTO>('/auth/login', { body });
    return mapAuthUserEnvelopeToRegisteredUser(dto);
  },

  /** US-004 / FE-003: siempre 202 genérico — anti-enumeración; el resultado no revela nada. */
  async forgotPassword(input: ForgotPasswordRequestDTO): Promise<void> {
    await httpPost<unknown, ForgotPasswordRequestDTO>('/auth/password/reset-request', { body: input });
  },

  /** US-004 / FE-003: 204 en éxito; errores TOKEN_INVALID/TOKEN_USED/GONE_TOKEN_EXPIRED. */
  async resetPassword(input: ResetPasswordRequestDTO): Promise<void> {
    await httpPost<unknown, ResetPasswordRequestDTO>('/auth/password/reset', { body: input });
  },
};
