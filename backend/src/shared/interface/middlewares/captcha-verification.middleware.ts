// captchaVerificationMiddleware (US-091 / BE-008, Por ruta — /auth/* sensibles). ADR-SEC-004;
// BR-AUTH-011; AC-05. Verifica `req.body.captchaToken`. En modo mock acepta '__test__'.
// GUARD CRÍTICO: '__test__' se rechaza cuando CAPTCHA_PROVIDER !== 'mock' (no bypass en prod).
import type { RequestHandler } from 'express';
import { config } from '../../../config/env.js';
import { BadRequestError } from '../../domain/errors/bad-request.error.js';

const MOCK_TOKEN = '__test__';

function extractToken(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'captchaToken' in body) {
    const token = (body as { captchaToken?: unknown }).captchaToken;
    if (typeof token === 'string') return token;
  }
  return '';
}

export const captchaVerificationMiddleware: RequestHandler = (req, _res, next) => {
  const token = extractToken(req.body);

  if (config.CAPTCHA_PROVIDER === 'mock') {
    if (token === MOCK_TOKEN) {
      next();
      return;
    }
    next(new BadRequestError('Invalid captcha'));
    return;
  }

  // Modo no-mock: el token de test NUNCA es válido (guard de seguridad).
  if (token === MOCK_TOKEN) {
    next(new BadRequestError('Invalid captcha'));
    return;
  }
  // Stub de verificación externa para MVP: acepta un token no vacío. La verificación real
  // contra la API de captcha pertenece a las feature stories de identity-access.
  if (token.length > 0) {
    next();
    return;
  }
  next(new BadRequestError('Invalid captcha'));
};
