// Rate limiters por endpoint público sensible (US-094 / SEC-002; US-110 / PB-P0-007 — ADR-SEC-004).
// Límites configurables (defaults MVP): login 10/IP/10min · register 5/IP/10min · reset 3/email/1h.
// El rechazo ocurre ANTES de credenciales / creación de usuario / reset token / email (VR-05). 429
// con envelope estándar + headers `X-RateLimit-*`/`Retry-After` (AC-06) y log seguro con key hasheada
// (AC-07). `skip` por `RATE_LIMIT_ENABLED` (N3): la suite global corre sin enforcement; los tests de
// US-110 lo activan. No se ubica en `shared/interface/middlewares/` (invariante estructural US-090).
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request } from 'express';
import { config } from '../../../config/env.js';
import { buildRateLimitHandler, type RateLimitKeyType } from './rate-limit-response.js';

/** Key por IP confiable (SEC-02). `req.ip` respeta el `trust proxy` de Express definido por el bootstrap. */
const ipKey = (req: Request): string => req.ip ?? 'unknown';

/** Key por email normalizado (SEC-03, anti-enumeración); fallback a IP si el email aún no existe. */
const emailKey = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' && email.length > 0 ? email.trim().toLowerCase() : ipKey(req);
};

interface AuthLimiterSpec {
  policy: string;
  keyType: RateLimitKeyType;
  windowMs: number;
  max: () => number;
  keyGenerator: (req: Request) => string;
}

function makeAuthLimiter(spec: AuthLimiterSpec): RateLimitRequestHandler {
  return rateLimit({
    windowMs: spec.windowMs,
    max: spec.max,
    standardHeaders: true,
    legacyHeaders: true, // emite `X-RateLimit-*` (AC-06) además de los `RateLimit-*` estándar
    skip: () => !config.RATE_LIMIT_ENABLED,
    keyGenerator: spec.keyGenerator,
    handler: buildRateLimitHandler({ policy: spec.policy, keyType: spec.keyType }, spec.keyGenerator),
  });
}

/** Factories (instancia aislada para tests deterministas) + singletons usados por las rutas. */
export const createLoginRateLimit = (): RateLimitRequestHandler =>
  makeAuthLimiter({
    policy: 'auth_login',
    keyType: 'ip',
    windowMs: config.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
    max: () => config.AUTH_LOGIN_RATE_LIMIT_MAX,
    keyGenerator: ipKey,
  });

export const createRegisterRateLimit = (): RateLimitRequestHandler =>
  makeAuthLimiter({
    policy: 'auth_register',
    keyType: 'ip',
    windowMs: config.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS,
    max: () => config.AUTH_REGISTER_RATE_LIMIT_MAX,
    keyGenerator: ipKey,
  });

export const createPasswordResetRequestRateLimit = (): RateLimitRequestHandler =>
  makeAuthLimiter({
    policy: 'auth_password_reset',
    keyType: 'email',
    windowMs: config.AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    max: () => config.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX,
    keyGenerator: emailKey,
  });

export const loginRateLimit = createLoginRateLimit();
export const registerRateLimit = createRegisterRateLimit();
export const passwordResetRequestRateLimit = createPasswordResetRequestRateLimit();
