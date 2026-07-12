// noActiveSessionGuard (US-001 / BE-002, SEC-01). Endpoints solo-anónimos (register; login en
// US-003): si el request ya trae una sesión FIRMADA y VIGENTE → 409 ALREADY_AUTHENTICATED (catálogo
// formalizado por US-003); el frontend redirige al dashboard. Cookie ausente, mal firmada, expirada
// o revocada → continúa como anónimo (no es un error en estos endpoints). No se ubica en
// `shared/interface/middlewares/` para preservar el invariante estructural de US-090.
import type { RequestHandler } from 'express';
import type { SessionRepository } from '../../auth/ports.js';
import type { ClockPort } from '../../domain/clock.port.js';
import { AlreadyAuthenticatedError } from '../../domain/errors/already-authenticated.error.js';
import { config } from '../../../config/env.js';

export interface NoActiveSessionDeps {
  sessions: SessionRepository;
  clock: ClockPort;
}

/** Factory: construye el guard con las dependencias inyectadas en el composition root. */
export function createNoActiveSessionGuard(deps: NoActiveSessionDeps): RequestHandler {
  const cookieName = config.SESSION_COOKIE_NAME;

  return (req, _res, next): void => {
    const sid = req.signedCookies?.[cookieName] as unknown;
    if (typeof sid !== 'string' || sid.length === 0) {
      next();
      return;
    }
    void (async (): Promise<void> => {
      try {
        const resolved = await deps.sessions.findValid(sid, deps.clock.now());
        next(resolved ? new AlreadyAuthenticatedError() : undefined);
      } catch (err) {
        next(err);
      }
    })();
  };
}
