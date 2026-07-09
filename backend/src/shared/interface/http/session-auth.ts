// sessionAuthMiddleware (US-094 / SEC-001). ADR-SEC-002; AC-02/AC-03/AC-05.
// Auth canónica por COOKIE de sesión HTTP-only FIRMADA (no Bearer). Lee el `sid` firmado desde
// `req.signedCookies` (verificado por cookie-parser con `SESSION_SECRET`), resuelve la sesión
// server-side (no revocada, no expirada) y puebla `req.user`/`req.sessionId`. Cualquier fallo →
// UnauthorizedError → 401 (nunca 403). No se ubica en `shared/interface/middlewares/` para
// preservar el invariante estructural de US-090 (14 middlewares exactos).
//
// NOTA: el `authMiddleware` (Bearer JWT) del bootstrap US-091 se retiene para compatibilidad de
// sus tests, pero la auth de US-094 y siguientes usa esta cookie de sesión (ADR-SEC-002).
import type { RequestHandler } from 'express';
import type { SessionRepository } from '../../auth/ports.js';
import type { ClockPort } from '../../domain/clock.port.js';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error.js';
import { logger } from '../../infrastructure/logger/index.js';
import { config } from '../../../config/env.js';

export interface SessionAuthDeps {
  sessions: SessionRepository;
  clock: ClockPort;
}

/** Factory: construye el middleware con las dependencias inyectadas en el composition root. */
export function createSessionAuthMiddleware(deps: SessionAuthDeps): RequestHandler {
  const cookieName = config.SESSION_COOKIE_NAME;

  return (req, _res, next): void => {
    void (async (): Promise<void> => {
      const sid = req.signedCookies?.[cookieName] as unknown;
      if (typeof sid !== 'string' || sid.length === 0) {
        logger.warn({
          event: 'AUTH_FAILURE',
          correlationId: req.correlationId,
          reason: 'Missing session cookie',
        });
        next(new UnauthorizedError());
        return;
      }

      try {
        const resolved = await deps.sessions.findValid(sid, deps.clock.now());
        if (!resolved) {
          logger.warn({
            event: 'AUTH_FAILURE',
            correlationId: req.correlationId,
            reason: 'Invalid or expired session',
          });
          next(new UnauthorizedError());
          return;
        }
        req.user = { id: resolved.userId, role: resolved.role };
        req.sessionId = sid;
        next();
      } catch (err) {
        next(err);
      }
    })();
  };
}
