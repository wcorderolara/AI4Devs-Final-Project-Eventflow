/** DTOs espejo del contrato REST de auth (Doc 16; backend `AuthUserResponseSchema`, US-001). */

/** Variant organizer (US-001). */
export interface RegisterOrganizerRequestDTO {
  role: 'organizer';
  name: string;
  email: string;
  password: string;
  acceptedTerms: true;
  captchaToken: string;
}

/** Variant vendor (US-002): `businessName` espeja `users.name` hasta US-040. */
export interface RegisterVendorRequestDTO {
  role: 'vendor';
  businessName: string;
  email: string;
  password: string;
  acceptedTerms: true;
  captchaToken: string;
}

/** Discriminated union del contrato `POST /api/v1/auth/register`. */
export type RegisterUserRequestDTO = RegisterOrganizerRequestDTO | RegisterVendorRequestDTO;

/** Contrato `POST /api/v1/auth/login` (US-003): captcha condicional (N=3). */
export interface LoginRequestDTO {
  email: string;
  password: string;
  captchaToken?: string;
}

/** Contrato `POST /api/v1/auth/password/reset-request` (US-004): siempre 202 genérico. */
export interface ForgotPasswordRequestDTO {
  email: string;
  captchaToken: string;
}

/** Contrato `POST /api/v1/auth/password/reset` (US-004): 204 sin body. */
export interface ResetPasswordRequestDTO {
  token: string;
  newPassword: string;
}

export interface AuthUserDTO {
  id: string;
  email: string;
  name: string;
  role: 'organizer' | 'vendor' | 'admin';
  status: 'active' | 'suspended';
  preferredLanguage: 'es-LATAM' | 'es-ES' | 'pt' | 'en';
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Envelope de éxito estándar (Doc 16 §13). */
export interface AuthUserEnvelopeDTO {
  data: AuthUserDTO;
  meta: { correlationId: string; timestamp?: string };
}
