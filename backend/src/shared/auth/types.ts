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

/** Vista interna con el hash — SOLO para verificación de credenciales; jamás se serializa. */
export interface AuthUserWithSecret extends AuthUser {
  passwordHash: string;
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

/** Identidad resuelta desde una sesión válida (para poblar `req.user`). */
export interface ResolvedSession {
  userId: string;
  role: UserRoleName;
}
