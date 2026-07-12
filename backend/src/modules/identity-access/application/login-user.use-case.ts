// LoginUserUseCase (US-094 / BE-004; extendido en US-003 / BE-002/BE-003). AC-01/AC-03, EC-01/EC-02.
// Verifica credenciales de forma ANTI-ENUMERACIÓN: email inexistente y password incorrecta
// producen el MISMO error genérico (UnauthorizedError → 401) y el hash SIEMPRE se verifica
// (hash dummy si el usuario no existe — mitigación de timing attacks, SEC-08). Integra el
// contador de fallos IP+email (captcha condicional N=3): registra fallo en credencial inválida
// y resetea en éxito. Al éxito crea sesión server-side (vigencia = Max-Age de la cookie, 30d).
import type {
  UserRepository,
  PasswordHasher,
  SessionRepository,
  AuthEventLogger,
} from '../../../shared/auth/ports.js';
import type { AuthUser } from '../../../shared/auth/types.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { AuthAttemptTracker } from '../../../shared/security/auth-attempts/auth-attempt-tracker.port.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { config } from '../../../config/env.js';
import type { AuthUseCaseContext } from './register-user.use-case.js';

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUseCaseContext extends AuthUseCaseContext {
  /** IP del request (clave del contador de captcha condicional — EC-02). */
  ip?: string;
}

export interface LoginResult {
  user: AuthUser;
  sessionId: string;
}

/** Mensaje genérico único para cualquier fallo de credenciales (anti-enumeración, SEC-07). */
const GENERIC_LOGIN_ERROR = 'Invalid credentials';

/**
 * Hash argon2id precalculado (password aleatorio de build, jamás usable) contra el que se
 * verifica cuando el email no existe: la rama negativa ejecuta el MISMO trabajo criptográfico
 * que la positiva (SEC-08, mitigación timing). Parámetros = Doc 19 §11.1 (m=19456,t=2,p=1).
 */
export const TIMING_DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$Ny79OJiMglxDdyBiSAU67Q$i7D/pI/T1Aa5z7QbRUt1xtk/aQVaI/C7yR/avSxoLGY';

export class LoginUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionRepository,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
    private readonly attempts?: AuthAttemptTracker,
  ) {}

  async execute(input: LoginUserInput, ctx: LoginUseCaseContext = {}): Promise<LoginResult> {
    const startedAt = this.clock.now().getTime();
    const email = input.email.toLowerCase();
    const ip = ctx.ip ?? 'unknown';
    const user = await this.users.findByEmailNormalized(email);

    // SEC-08: el hash se verifica SIEMPRE (dummy si no hay usuario) — sin rama corta.
    const passwordOk = await this.hasher.verify(input.password, user?.passwordHash ?? TIMING_DUMMY_HASH);
    const active = user?.status === 'active';

    if (!user || !passwordOk || !active) {
      // EC-02: fallo consecutivo → alimenta el umbral N=3 del captcha condicional.
      this.attempts?.recordFailure(ip, email);
      this.events.emit('auth.login.failure', {
        correlationId: ctx.correlationId,
        reason: 'invalid_credentials',
        latencyMs: this.clock.now().getTime() - startedAt,
      });
      throw new UnauthorizedError(GENERIC_LOGIN_ERROR);
    }

    // Vigencia server-side alineada con el `Max-Age` de la cookie (30 días — Decisión PO US-003 #5).
    const sessionMaxAgeMs = config.SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(this.clock.now().getTime() + sessionMaxAgeMs);
    const session = await this.sessions.create({ userId: user.id, expiresAt });

    // EC-02: éxito → reset del contador de la combinación IP+email.
    this.attempts?.resetOnSuccess(ip, email);
    this.events.emit('auth.login.success', {
      correlationId: ctx.correlationId,
      userId: user.id,
      role: user.role,
      latencyMs: this.clock.now().getTime() - startedAt,
    });

    // Se descarta `passwordHash` al construir el resultado público.
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return { user: publicUser, sessionId: session.id };
  }
}
