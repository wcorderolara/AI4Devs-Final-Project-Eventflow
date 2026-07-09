// Respuesta 429 estándar + observabilidad segura de rate limiting (US-110 / BE-003, OBS-001, SEC-003).
// ADR-SEC-004; AC-06/AC-07. Un único builder de `handler` para express-rate-limit que:
//  - emite headers `X-RateLimit-Limit`/`X-RateLimit-Remaining`/`Retry-After` (AC-06),
//  - responde el error envelope anidado estándar con `RATE_LIMIT_EXCEEDED` (ADR-API-002),
//  - registra `security.rate_limit.exceeded` con metadata SEGURA y un identificador de key HASHEADO
//    (nunca IP/email crudo, password, token, cookie, prompt ni PII — AC-07/SEC-06).
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { logger } from '../../infrastructure/logger/index.js';

/** Metadata que express-rate-limit adjunta a `req.rateLimit` (v7). */
interface RateLimitInfo {
  limit: number;
  used: number;
  remaining: number;
  resetTime?: Date;
}

/** Tipo de key de una policy (para observabilidad; no expone el valor). */
export type RateLimitKeyType = 'ip' | 'email' | 'user';

export interface RateLimitPolicyMeta {
  /** Nombre estable de la policy, p. ej. `auth_login`, `ai_generation`. */
  policy: string;
  keyType: RateLimitKeyType;
}

/** Identificador NO reversible de la key para logs (sha256 truncado). Nunca el valor crudo. */
export function hashKeyIdentifier(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 12);
}

/** Segundos hasta el reset de la ventana (para `Retry-After`), o undefined si no se conoce. */
function retryAfterSeconds(resetTime: Date | undefined, now: number): number | undefined {
  if (!resetTime) return undefined;
  return Math.max(0, Math.ceil((resetTime.getTime() - now) / 1000));
}

/**
 * Construye el `handler` de express-rate-limit para una policy. `keyForLog` deriva el mismo valor
 * que el keyGenerator para poder hashearlo en el log (sin exponerlo).
 */
export function buildRateLimitHandler(
  meta: RateLimitPolicyMeta,
  keyForLog: (req: Request) => string,
) {
  return (req: Request, res: Response): void => {
    const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
    const now = Date.now();
    const retryAfter = retryAfterSeconds(info?.resetTime, now);

    if (info) {
      res.setHeader('X-RateLimit-Limit', String(info.limit));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, info.remaining)));
    }
    if (retryAfter !== undefined) res.setHeader('Retry-After', String(retryAfter));

    // Log seguro (warning/security event, no excepción). Sólo metadata mínima; key hasheada.
    logger.warn({
      event: 'security.rate_limit.exceeded',
      correlationId: req.correlationId,
      route: req.originalUrl?.split('?')[0] ?? req.path,
      policy: meta.policy,
      keyType: meta.keyType,
      keyId: hashKeyIdentifier(keyForLog(req)),
      limit: info?.limit,
      remaining: info ? Math.max(0, info.remaining) : undefined,
      retryAfterSeconds: retryAfter,
      status: 429,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        correlationId: req.correlationId ?? '',
      },
    });
  };
}
