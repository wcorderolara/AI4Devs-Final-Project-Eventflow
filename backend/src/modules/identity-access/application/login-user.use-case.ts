// LoginUserUseCase (US-094 / BE-004). AC-02, EC-03; SEC-03/SEC-06.
// Verifica credenciales de forma ANTI-ENUMERACIÓN: email inexistente y password incorrecta
// producen el MISMO error genérico (UnauthorizedError → 401). Al éxito crea una sesión
// server-side y devuelve su `sid`; el controller lo emite como cookie HTTP-only firmada.
import type {
  UserRepository,
  PasswordHasher,
  SessionRepository,
  AuthEventLogger,
} from '../../../shared/auth/ports.js';
import type { AuthUser } from '../../../shared/auth/types.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { config } from '../../../config/env.js';
import type { AuthUseCaseContext } from './register-user.use-case.js';

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: AuthUser;
  sessionId: string;
}

/** Mensaje genérico único para cualquier fallo de credenciales (anti-enumeración, SEC-06). */
const GENERIC_LOGIN_ERROR = 'Invalid credentials';

export class LoginUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionRepository,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
  ) {}

  async execute(input: LoginUserInput, ctx: AuthUseCaseContext = {}): Promise<LoginResult> {
    const email = input.email.toLowerCase();
    const user = await this.users.findByEmailNormalized(email);

    // Anti-enumeración: siempre verificamos contra un hash (real o inexistente) y devolvemos el
    // mismo error. No distinguir email inexistente de password incorrecta (EC-03, NT-04/NT-05).
    const passwordOk = user ? await this.hasher.verify(input.password, user.passwordHash) : false;
    const active = user?.status === 'active';

    if (!user || !passwordOk || !active) {
      this.events.emit('auth.login.failed', {
        correlationId: ctx.correlationId,
        reason: 'invalid_credentials',
      });
      throw new UnauthorizedError(GENERIC_LOGIN_ERROR);
    }

    // Vigencia server-side alineada con el `Max-Age` de la cookie (US-108: 30 días por default).
    const sessionMaxAgeMs = config.SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(this.clock.now().getTime() + sessionMaxAgeMs);
    const session = await this.sessions.create({ userId: user.id, expiresAt });

    this.events.emit('auth.login.succeeded', {
      correlationId: ctx.correlationId,
      userId: user.id,
    });

    // Se descarta `passwordHash` al construir el resultado público.
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return { user: publicUser, sessionId: session.id };
  }
}
