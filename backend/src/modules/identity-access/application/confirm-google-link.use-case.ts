// ConfirmGoogleLinkUseCase (US-008 / BE-003, AC-03). Vincula el `google_sub` a una cuenta
// email/password existente SOLO tras confirmación explícita del usuario, y emite sesión. Si el
// usuario no confirma, el frontend simplemente no invoca este caso de uso (la sesión queda
// anónima — AC-03). El link es un único UPDATE atómico; una colisión de `google_sub` (UNIQUE) se
// traduce en `OAuthAccountConflictError` desde el repositorio. Emite `auth.oauth.google.success`
// (outcome=link).
import type { UserRepository, SessionRepository, AuthEventLogger } from '../../../shared/auth/ports.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { config } from '../../../config/env.js';
import type { LinkContinuation, OAuthSessionResult } from './oauth-flow.types.js';
import type { AuthUseCaseContext } from './register-user.use-case.js';

export interface ConfirmGoogleLinkInput {
  continuation: LinkContinuation;
}

export class ConfirmGoogleLinkUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
  ) {}

  async execute(input: ConfirmGoogleLinkInput, ctx: AuthUseCaseContext = {}): Promise<OAuthSessionResult> {
    const { continuation } = input;
    const user = await this.users.linkGoogleSub(continuation.userId, continuation.googleSub);

    const sessionId = await this.createSession(user.id);
    this.events.emit('auth.oauth.google.success', {
      correlationId: ctx.correlationId,
      userId: user.id,
      role: user.role,
      reason: 'link',
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
