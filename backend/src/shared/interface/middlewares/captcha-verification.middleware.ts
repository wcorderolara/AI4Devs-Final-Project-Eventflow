// captchaVerificationMiddleware (US-091 / BE-008; reescrito en US-109 / BE-006, Por ruta —
// /auth/* sensibles). ADR-SEC-004; BR-AUTH-011; AC-01/02/03/05/07; VR-01/VR-02/VR-07.
// Verifica `req.body.captchaToken` server-side vía `CaptchaVerifier` ANTES de credenciales,
// creación de usuario, reset token o emisión de cookie (SEC-05). Token ausente → CAPTCHA_REQUIRED;
// inválido/expirado/action mismatch/score bajo/provider error/timeout → CAPTCHA_INVALID. La causa
// exacta jamás se revela al cliente (SEC-07); se registra como outcome interno.
//
// GUARD CRÍTICO: el token mock '__test__' se rechaza cuando CAPTCHA_PROVIDER !== 'mock' (SEC-06,
// no bypass en prod). El provider se resuelve por request desde la factory (config vigente).
import type { RequestHandler } from 'express';
import { config } from '../../../config/env.js';
import { CaptchaRequiredError, CaptchaInvalidError } from '../../domain/errors/captcha.errors.js';
import { captchaProviderFactory } from '../../../infrastructure/captcha/captcha-provider.factory.js';
import { MOCK_CAPTCHA_TOKEN } from '../../../infrastructure/captcha/mock-captcha-provider.js';
import { logCaptchaEvent } from '../../../infrastructure/observability/captcha-event-logger.js';
import type { CaptchaAction } from '../../security/captcha/captcha-verifier.port.js';

function extractToken(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'captchaToken' in body) {
    const token = (body as { captchaToken?: unknown }).captchaToken;
    if (typeof token === 'string') return token;
  }
  return '';
}

/** Mapea el endpoint a la acción esperada del captcha (VR-07). `undefined` si no aplica. */
function expectedActionFor(path: string): CaptchaAction | undefined {
  if (path.endsWith('/register')) return 'register';
  if (path.endsWith('/login')) return 'login';
  if (path.endsWith('/password/reset-request')) return 'password_reset_request';
  return undefined;
}

export const captchaVerificationMiddleware: RequestHandler = (req, _res, next) => {
  const token = extractToken(req.body);
  const endpoint = req.path;
  const provider = config.CAPTCHA_PROVIDER;
  const expectedAction = expectedActionFor(endpoint);

  // EC-01 / VR-01: token ausente → no se llama al proveedor.
  if (token.length === 0) {
    logCaptchaEvent('captcha.verify.failed', {
      correlationId: req.correlationId, endpoint, provider, outcome: 'missing_token', expectedAction, env: config.NODE_ENV,
    });
    next(new CaptchaRequiredError());
    return;
  }

  // SEC-06: el token de test NUNCA es válido con un proveedor real (guard antes de llamar red).
  if (token === MOCK_CAPTCHA_TOKEN && provider !== 'mock') {
    logCaptchaEvent('captcha.verify.failed', {
      correlationId: req.correlationId, endpoint, provider, outcome: 'invalid_token', expectedAction, env: config.NODE_ENV,
    });
    next(new CaptchaInvalidError());
    return;
  }

  void (async (): Promise<void> => {
    try {
      const verifier = captchaProviderFactory.resolve();
      const result = await verifier.verify({ token, expectedAction, remoteIp: req.ip });

      if (result.success) {
        logCaptchaEvent('captcha.verify.succeeded', {
          correlationId: req.correlationId, endpoint, provider: result.provider, outcome: 'success', expectedAction, env: config.NODE_ENV,
        });
        next();
        return;
      }

      const eventName = result.outcome === 'provider_timeout' ? 'captcha.provider.timeout' : 'captcha.verify.failed';
      logCaptchaEvent(eventName, {
        correlationId: req.correlationId, endpoint, provider: result.provider, outcome: result.outcome, expectedAction, env: config.NODE_ENV,
      });
      next(new CaptchaInvalidError());
    } catch {
      // Fallo inesperado del adapter → error controlado (no se procesa la operación protegida).
      logCaptchaEvent('captcha.verify.failed', {
        correlationId: req.correlationId, endpoint, provider, outcome: 'provider_error', expectedAction, env: config.NODE_ENV,
      });
      next(new CaptchaInvalidError());
    }
  })();
};
