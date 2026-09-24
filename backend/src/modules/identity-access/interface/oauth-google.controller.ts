// Controlador OAuth Google (US-008 / API-001, SEC-001, OBS-001). Controlador DELGADO: delega a los
// use cases y traduce el resultado a redirects 302 (flujo server-driven) o JSON (continuaciones).
// SEC-001/SEC-05: el `id_token` NUNCA llega al cliente; solo se emite la cookie de sesión HTTP-only
// firmada en éxito. Mensajes neutros ante fallo (el errorHandler mapea los errores OAuth a 400/409/410).
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { config } from '../../../config/env.js';
import {
  issueSessionCookie,
  issueRoleCookie,
} from '../../../infrastructure/security/session-cookie.js';
import {
  issueOAuthStateCookie,
  readOAuthStateCookie,
  clearOAuthStateCookie,
} from '../../../infrastructure/security/oauth-state-cookie.js';
import {
  issueContinuationCookie,
  readContinuationCookie,
  clearContinuationCookie,
} from '../../../infrastructure/security/oauth-continuation-cookie.js';
import { logSessionEvent } from '../../../infrastructure/observability/session-event-logger.js';
import { resolvePreferredLanguage } from '../../../shared/interface/http/accept-language.js';
import { toAuthUserResponse } from '../../../shared/dto/auth-user.response.js';
import { OAuthContinuationInvalidError } from '../../../shared/domain/errors/oauth.errors.js';
import type { UserRoleName } from '../../../shared/auth/types.js';
import type { StartGoogleOAuthUseCase } from '../application/start-google-oauth.use-case.js';
import type { HandleGoogleCallbackUseCase } from '../application/handle-google-callback.use-case.js';
import type { CompleteGoogleSignupUseCase } from '../application/complete-google-signup.use-case.js';
import type { ConfirmGoogleLinkUseCase } from '../application/confirm-google-link.use-case.js';
import type { GoogleCallbackQuery, CompleteGoogleSignupBody } from '../dto/oauth-google.request.js';

export interface OAuthGoogleUseCases {
  start: StartGoogleOAuthUseCase;
  callback: HandleGoogleCallbackUseCase;
  completeSignup: CompleteGoogleSignupUseCase;
  confirmLink: ConfirmGoogleLinkUseCase;
}

/** Une la base del frontend con un path relativo (evita dobles slashes). */
function webUrl(pathname: string): string {
  return new URL(pathname, config.GOOGLE_OAUTH_WEB_APP_URL).toString();
}

/**
 * Home del workspace por rol (mismo mapa que el frontend `shared/navigation/roleHome`). Admin
 * NUNCA se crea vía Google, por lo que solo aplican `vendor`/`organizer`.
 */
function roleHome(role: UserRoleName): string {
  return role === 'vendor' ? '/vendor' : '/organizer';
}

export class OAuthGoogleController {
  constructor(private readonly useCases: OAuthGoogleUseCases) {}

  /** GET /auth/google → 302 a Google. Emite la cookie firmada de state/nonce (AUTH-TS-01). */
  start = (req: Request, res: Response): void => {
    const { authorizationUrl, stateNonce } = this.useCases.start.execute();
    issueOAuthStateCookie(res, stateNonce);
    res.redirect(302, authorizationUrl);
  };

  /** GET /auth/google/callback → procesa y redirige por camino, o responde error neutro. */
  callback = async (req: Request, res: Response): Promise<void> => {
    const query = (req.validated?.query as GoogleCallbackQuery | undefined) ?? (req.query as GoogleCallbackQuery);

    // EC-02: el usuario canceló el consentimiento (o Google devolvió `error`) → redirect neutro.
    if (query.error || !query.code || !query.state) {
      clearOAuthStateCookie(res);
      res.redirect(302, webUrl('/login?oauth=cancelled'));
      return;
    }

    const stateNonceCookie = readOAuthStateCookie(req);
    const outcome = await this.useCases.callback.execute(
      { code: query.code, stateFromQuery: query.state, stateNonceCookie },
      { correlationId: req.correlationId },
    );
    // El `state` es de un solo uso: se consume siempre tras un procesamiento válido.
    clearOAuthStateCookie(res);

    if (outcome.kind === 'login') {
      issueSessionCookie(res, outcome.sessionId);
      issueRoleCookie(res, outcome.user.role);
      logSessionEvent('session.cookie.issued', { correlationId: req.correlationId, userId: outcome.user.id });
      res.redirect(302, webUrl(roleHome(outcome.user.role)));
      return;
    }

    if (outcome.kind === 'signup_required') {
      issueContinuationCookie(res, outcome.continuation);
      res.redirect(302, webUrl('/auth/google/select-role'));
      return;
    }

    // link_required
    issueContinuationCookie(res, outcome.continuation);
    res.redirect(302, webUrl('/auth/google/confirm-link'));
  };

  /** POST /auth/google/complete-signup → crea la cuenta con el rol elegido y emite sesión. */
  completeSignup = async (req: Request, res: Response): Promise<void> => {
    const continuation = readContinuationCookie(req);
    if (!continuation || continuation.action !== 'signup') {
      throw new OAuthContinuationInvalidError('missing_signup_continuation');
    }
    const body = req.validated?.body as CompleteGoogleSignupBody;
    const { user, sessionId } = await this.useCases.completeSignup.execute(
      { continuation, role: body.role },
      {
        correlationId: req.correlationId,
        preferredLanguage: resolvePreferredLanguage(req.headers['accept-language']),
      },
    );
    clearContinuationCookie(res);
    issueSessionCookie(res, sessionId);
    issueRoleCookie(res, user.role);
    logSessionEvent('session.cookie.issued', { correlationId: req.correlationId, userId: user.id });
    res.status(201).json(success(toAuthUserResponse(user), req.correlationId ?? ''));
  };

  /** POST /auth/google/confirm-link → vincula google_sub (tras confirmación) y emite sesión. */
  confirmLink = async (req: Request, res: Response): Promise<void> => {
    const continuation = readContinuationCookie(req);
    if (!continuation || continuation.action !== 'link') {
      throw new OAuthContinuationInvalidError('missing_link_continuation');
    }
    const { user, sessionId } = await this.useCases.confirmLink.execute(
      { continuation },
      { correlationId: req.correlationId },
    );
    clearContinuationCookie(res);
    issueSessionCookie(res, sessionId);
    issueRoleCookie(res, user.role);
    logSessionEvent('session.cookie.issued', { correlationId: req.correlationId, userId: user.id });
    res.status(200).json(success(toAuthUserResponse(user), req.correlationId ?? ''));
  };
}
