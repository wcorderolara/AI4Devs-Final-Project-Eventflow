// Tipos de dominio de auth compartidos entre `identity-access` y `user-profile` (US-094).
// Viven en `shared` porque ambos módulos los consumen y los boundaries prohíben imports
// cross-module (ADR-ARCH-001). El idioma se expresa SIEMPRE con el código del contrato API
// (`es-LATAM`, con guion); la traducción a/desde el enum de Prisma ocurre en el repositorio.
import type { SupportedLanguage } from '../constants/languages.js';

export type UserRoleName = 'organizer' | 'vendor' | 'admin';

/** Roles que el registro público puede crear (SEC-08: nunca `admin`). */
export type PublicRegistrationRole = 'organizer' | 'vendor';

export type UserStatusName = 'active' | 'suspended';

/** Vista pública/segura de un usuario. NUNCA incluye `passwordHash` ni secretos. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRoleName;
  status: UserStatusName;
  preferredLanguage: SupportedLanguage;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Vista interna con el hash — SOLO para verificación de credenciales; jamás se serializa.
 * US-008 (DB-001): `passwordHash` es `null` para cuentas creadas solo por OAuth Google
 * (sin contraseña). Los consumidores deben tratar `null` como "sin credencial de password".
 */
export interface AuthUserWithSecret extends AuthUser {
  passwordHash: string | null;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string | null;
  role: PublicRegistrationRole;
  preferredLanguage: SupportedLanguage;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  preferredLanguage?: SupportedLanguage;
}

/**
 * Vista de resolución de cuenta para el flujo OAuth (US-008 / BE-004). Expone lo mínimo para
 * decidir el camino login/signup/link sin serializar secretos: incluye si la cuenta tiene
 * contraseña (`hasPassword`) y su `googleSub` actual (para detectar conflictos de vinculación).
 * NUNCA se retorna al cliente; es de uso interno del `HandleGoogleCallbackUseCase`.
 */
export interface OAuthAccount {
  id: string;
  email: string;
  role: UserRoleName;
  status: UserStatusName;
  hasPassword: boolean;
  googleSub: string | null;
}

/** Alta de un usuario creado SOLO por OAuth Google (sin contraseña) — US-008 / BE-004. */
export interface CreateOAuthUserInput {
  email: string;
  googleSub: string;
  name: string;
  role: PublicRegistrationRole;
  preferredLanguage: SupportedLanguage;
}

/** Identidad resuelta desde una sesión válida (para poblar `req.user`). */
export interface ResolvedSession {
  userId: string;
  role: UserRoleName;
}
