// optionalSessionAuthMiddleware (US-066 / EMERGENT-001).
//
// Variante NO-obligatoria de `createSessionAuthMiddleware` (US-094). Diseñada para endpoints
// **públicos con conducta condicional por rol** — típicamente el listado de reviews por vendor
// (US-066 D3), donde `admin` extiende el filtro a todos los `status`, pero anónimo / organizer
// / vendor obtienen el path público sin sesión.
//
// Contrato:
//   - Sin cookie de sesión o cookie inválida ⇒ `next()` sin poblar `req.user`. No emite `401`.
//   - Cookie válida ⇒ pobla `req.user` + `req.sessionId` idéntico a `sessionAuthMiddleware`.
//   - Cualquier error del `SessionRepository` (fallo de BD, etc.) ⇒ se propaga a `next(err)` —
//     no se traga el error para no ocultar fallas de infraestructura.
//
// Racional: reusa las mismas dependencias (`SessionRepository`, `ClockPort`) para no duplicar
// la lógica de validación de sesión y respetar la fuente única de verdad de auth (ADR-SEC-002).
import type { RequestHandler } from 'express';
import type { SessionRepository } from '../../auth/ports.js';
import type { ClockPort } from '../../domain/clock.port.js';
import { logSessionEvent } from '../../../infrastructure/observability/session-event-logger.js';
import { config } from '../../../config/env.js';

export interface OptionalSessionAuthDeps {
  sessions: SessionRepository;
  clock: ClockPort;
}

export function createOptionalSessionAuthMiddleware(
  deps: OptionalSessionAuthDeps,
): RequestHandler {
  const cookieName = config.SESSION_COOKIE_NAME;

  return (req, _res, next): void => {
    void (async (): Promise<void> => {
      const sid = req.signedCookies?.[cookieName] as unknown;
      if (typeof sid !== 'string' || sid.length === 0) {
        // Anónimo: continúa sin auth, sin loggear como error.
        next();
        return;
      }

      try {
        const resolved = await deps.sessions.findValid(sid, deps.clock.now());
        if (!resolved) {
          // Cookie presente pero inválida/expirada/revocada — se degrada silenciosamente a
          // anónimo. Se loguea a nivel debug para auditoría (mismo canal que sessionAuth).
          logSessionEvent('session.cookie.invalid', {
            correlationId: req.correlationId,
            reason: 'invalid_expired_or_revoked',
          });
          next();
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
