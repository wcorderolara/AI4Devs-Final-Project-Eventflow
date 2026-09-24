// HandleGoogleCallbackUseCase (US-008 / BE-003). Orquesta el callback OAuth: valida `state`
// (anti-CSRF), intercambia el `code` y verifica el `id_token` (delegado al provider), y resuelve
// uno de tres caminos según la identidad verificada:
//   - login    → `google_sub` ya vinculado: emite sesión de inmediato (AC-01).
//   - signup   → email inexistente: requiere selección de rol (AC-02) → continuación.
//   - link     → email existente sin `google_sub`: requiere confirmación (AC-03) → continuación.
// Emite `auth.oauth.google.failure` en cada rechazo y `auth.oauth.google.success` cuando se crea
// sesión (login). Los caminos signup/link emiten `success` en sus use cases al emitir sesión.
// El `id_token` jamás sale de la capa de verificación (SEC-05).
import type { OAuthProvider } from '../../../shared/auth/oauth.js';
import type { UserRepository, SessionRepository, AuthEventLogger } from '../../../shared/auth/ports.js';
import type { OAuthStateNonce } from '../../../shared/auth/oauth.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import {
  OAuthStateInvalidError,
  OAuthVerificationError,
  OAuthAccountConflictError,
} from '../../../shared/domain/errors/oauth.errors.js';
import { safeEqual } from '../../../infrastructure/security/oauth-state-cookie.js';
import { config } from '../../../config/env.js';
import type { CallbackOutcome } from './oauth-flow.types.js';
import type { AuthUseCaseContext } from './register-user.use-case.js';

export interface HandleGoogleCallbackInput {
  code: string;
  stateFromQuery: string;
  /** `{state, nonce}` leído de la cookie firmada (o null si ausente/alterada). */
  stateNonceCookie: OAuthStateNonce | null;
}

export class HandleGoogleCallbackUseCase {
  constructor(
    private readonly provider: OAuthProvider,
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
  ) {}

  async execute(input: HandleGoogleCallbackInput, ctx: AuthUseCaseContext = {}): Promise<CallbackOutcome> {
    // 1. Anti-CSRF: la cookie debe existir y su `state` coincidir con el de la query (single-use).
    if (!input.stateNonceCookie || !safeEqual(input.stateFromQuery, input.stateNonceCookie.state)) {
      this.fail(ctx.correlationId, 'state_invalid');
      throw new OAuthStateInvalidError('state_mismatch');
    }

    // 2. Intercambio + verificación del `id_token` (firma/aud/iss/exp/nonce/email_verified).
    let identity;
    try {
      const { idToken } = await this.provider.exchangeCode(input.code);
      identity = await this.provider.verifyIdToken(idToken, {
        expectedNonce: input.stateNonceCookie.nonce,
      });
    } catch (err) {
      const reason = err instanceof OAuthVerificationError ? err.reason : 'verification_failed';
      this.fail(ctx.correlationId, reason);
      throw err instanceof OAuthVerificationError ? err : new OAuthVerificationError('verification_failed');
    }

    // 3. Login: `google_sub` ya vinculado.
    const existing = await this.users.findByGoogleSub(identity.sub);
    if (existing) {
      if (existing.status !== 'active') {
        this.fail(ctx.correlationId, 'account_inactive');
        throw new OAuthVerificationError('account_inactive');
      }
      const sessionId = await this.createSession(existing.id);
      this.events.emit('auth.oauth.google.success', {
        correlationId: ctx.correlationId,
        userId: existing.id,
        role: existing.role,
        reason: 'login',
      });
      return { kind: 'login', user: existing, sessionId };
    }

    // 4. Resolución por email: link (cuenta existente) o signup (inexistente).
    const account = await this.users.findOAuthAccountByEmail(identity.email);
    if (account) {
      // La cuenta ya tiene OTRA identidad Google → conflicto (no re-vincular en silencio).
      if (account.googleSub && account.googleSub !== identity.sub) {
        this.fail(ctx.correlationId, 'account_conflict');
        throw new OAuthAccountConflictError('email_linked_to_other_google');
      }
      if (account.status !== 'active') {
        this.fail(ctx.correlationId, 'account_inactive');
        throw new OAuthVerificationError('account_inactive');
      }
      // Requiere confirmación explícita (AC-03): aún no se emite sesión.
      return {
        kind: 'link_required',
        continuation: {
          action: 'link',
          userId: account.id,
          googleSub: identity.sub,
          email: identity.email,
        },
      };
    }

    // 5. Signup: requiere selección de rol (AC-02): aún no se emite sesión.
    return {
      kind: 'signup_required',
      continuation: {
        action: 'signup',
        googleSub: identity.sub,
        email: identity.email,
        name: identity.name,
      },
    };
  }

  private async createSession(userId: string): Promise<string> {
    const maxAgeMs = config.SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(this.clock.now().getTime() + maxAgeMs);
    const session = await this.sessions.create({ userId, expiresAt });
    return session.id;
  }

  private fail(correlationId: string | undefined, reason: string): void {
    // NUNCA se registra `id_token`, email ni tokens (SEC-05): solo el `reason` acotado.
    this.events.emit('auth.oauth.google.failure', { correlationId, reason });
  }
}
