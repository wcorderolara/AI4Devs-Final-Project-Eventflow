// CompleteGoogleSignupUseCase (US-008 / BE-003, AC-02, VR-03, NT-04). Crea la cuenta SOLO-OAuth
// (sin contraseña) con el rol elegido y emite sesión. El rol se restringe por tipo a
// `organizer`/`vendor` (`PublicRegistrationRole`): `admin` NUNCA se crea vía Google (defensa en
// profundidad además del Zod del endpoint). La creación es un único INSERT atómico (idéntico
// patrón a `RegisterUserUseCase`). Emite `auth.oauth.google.success` (outcome=signup).
import type { UserRepository, SessionRepository, AuthEventLogger } from '../../../shared/auth/ports.js';
import type { PublicRegistrationRole } from '../../../shared/auth/types.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { config } from '../../../config/env.js';
import type { SignupContinuation, OAuthSessionResult } from './oauth-flow.types.js';
import type { AuthUseCaseContext } from './register-user.use-case.js';

export interface CompleteGoogleSignupInput {
  continuation: SignupContinuation;
  role: PublicRegistrationRole;
}

export interface CompleteGoogleSignupContext extends AuthUseCaseContext {
  preferredLanguage?: SupportedLanguage;
}

export class CompleteGoogleSignupUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
  ) {}

  async execute(
    input: CompleteGoogleSignupInput,
    ctx: CompleteGoogleSignupContext = {},
  ): Promise<OAuthSessionResult> {
    const { continuation, role } = input;
    // Nombre para mostrar: el `name` de Google si vino; si no, el localpart del email.
    const name = continuation.name?.trim() || continuation.email.split('@')[0] || continuation.email;

    const user = await this.users.createOAuthUser({
      email: continuation.email,
      googleSub: continuation.googleSub,
      name,
      role,
      preferredLanguage: ctx.preferredLanguage ?? 'es-LATAM',
    });

    const sessionId = await this.createSession(user.id);
    this.events.emit('auth.oauth.google.success', {
      correlationId: ctx.correlationId,
      userId: user.id,
      role: user.role,
      reason: 'signup',
    });
    return { user, sessionId };
  }

  private async createSession(userId: string): Promise<string> {
    const maxAgeMs = config.SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(this.clock.now().getTime() + maxAgeMs);
    const session = await this.sessions.create({ userId, expiresAt });
    return session.id;
  }
}
