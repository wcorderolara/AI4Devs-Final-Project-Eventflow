// Puertos (interfaces) de auth compartidos (US-094 / BE-002). Clean/Hexagonal: los use cases
// dependen de estas abstracciones; los adapters concretos (Prisma, bcrypt, crypto) viven en
// `src/infrastructure` y se inyectan en el composition root de cada módulo.
import type {
  AuthUser,
  AuthUserWithSecret,
  CreateUserInput,
  UpdateProfileInput,
  ResolvedSession,
} from './types.js';

export interface UserRepository {
  /** Busca por email normalizado (lowercase). Incluye hash para verificación de login. */
  findByEmailNormalized(email: string): Promise<AuthUserWithSecret | null>;
  /** Vista pública por id (sin hash). */
  findById(id: string): Promise<AuthUser | null>;
  /** Vista con hash por id — SOLO para change-password (verificación de contraseña actual). */
  findByIdWithSecret(id: string): Promise<AuthUserWithSecret | null>;
  /** Crea un usuario activo (organizer/vendor). Falla con conflicto si el email ya existe. */
  create(input: CreateUserInput): Promise<AuthUser>;
  /** Actualiza solo campos de perfil permitidos (name/phone/preferredLanguage). */
  updateProfile(userId: string, fields: UpdateProfileInput): Promise<AuthUser>;
  /** Actualiza el hash de contraseña (change-password directo, no reset). */
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}

export interface SessionRepository {
  /** Crea una sesión server-side y devuelve su id opaco (sid). */
  create(input: { userId: string; expiresAt: Date }): Promise<{ id: string }>;
  /** Resuelve una sesión vigente (no revocada, no expirada) → identidad; null si inválida. */
  findValid(sessionId: string, now: Date): Promise<ResolvedSession | null>;
  /** Revoca una sesión (logout). Idempotente. */
  revoke(sessionId: string, now: Date): Promise<void>;
}

export interface PasswordResetTokenRepository {
  /** Persiste SOLO el hash del token (nunca el valor crudo). */
  create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  /** Busca un token vigente (no consumido, no expirado) por su hash. */
  findValidByTokenHash(tokenHash: string, now: Date): Promise<{ id: string; userId: string } | null>;
  /**
   * Busca el token por hash SIN filtrar estado (US-004 EC-01..03): permite distinguir
   * inexistente (null) vs consumido (`consumedAt`) vs expirado (`expiresAt`).
   */
  findByTokenHash(
    tokenHash: string,
  ): Promise<{ id: string; userId: string; expiresAt: Date; consumedAt: Date | null } | null>;
  /**
   * Consume el token y actualiza el hash de contraseña de forma ATÓMICA (una transacción):
   * evita reuso del token y estados intermedios (AC-07). Falla si el token ya fue consumido.
   */
  consumeAndUpdatePassword(input: {
    tokenId: string;
    userId: string;
    passwordHash: string;
    now: Date;
  }): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

/** Genera/deriva el token de reset. El crudo se entrega por canal simulado; se persiste el hash. */
export interface ResetTokenGenerator {
  /** Genera un token crudo aleatorio y su hash (SHA-256). */
  generate(): { raw: string; hash: string };
  /** Deriva el hash de un token crudo recibido (para lookup en reset). */
  hash(raw: string): string;
}

/** Entrega del token de reset por canal simulado (MVP: log/notification). Nunca en la respuesta HTTP. */
export interface PasswordResetNotifier {
  deliver(input: { userId: string; email: string; rawToken: string }): Promise<void>;
}

/** Entrega simulada del email de bienvenida (US-001 / OBS-001; MVP: log estructurado
 * `event='email_simulated'`, template `welcome.<role>`). Nunca incluye tokens ni contraseñas. */
export interface WelcomeEmailNotifier {
  deliver(input: {
    userId: string;
    email: string;
    role: 'organizer' | 'vendor';
    correlationId?: string;
  }): Promise<void>;
}

/** Eventos de seguridad de auth (OBS-001; nombres de registro alineados a US-001 §14:
 * `auth.register.success` / `auth.register.failure`). */
export type AuthEventName =
  | 'auth.register.success'
  | 'auth.register.failure'
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout.success'
  | 'auth.logout.no_session'
  | 'auth.password_reset.requested'
  | 'auth.password_reset.completed'
  | 'auth.password_reset.failed'
  | 'auth.captcha.failed'
  | 'auth.rate_limited';

/**
 * Logger de eventos de seguridad de auth (OBS-001). El adapter DEBE redactar/omitir secretos:
 * jamás password, hash, token, cookie ni captcha token (SEC-07). Solo metadatos seguros.
 */
export interface AuthEventLogger {
  emit(
    event: AuthEventName,
    data: {
      correlationId?: string;
      userId?: string;
      reason?: string;
      latencyMs?: number;
      /** US-002 / OBS-001: etiqueta de rol para métricas por flujo (organizer | vendor). */
      role?: string;
    },
  ): void;
}
