// roleMiddleware (US-091 / BE-006, Por ruta — factory). ADR-SEC-003; AC-03; VR-02.
// Verifica `req.user.role` contra los roles permitidos. Rol incorrecto → ForbiddenError → 403.
// Requiere `authMiddleware` aplicado antes; sin `req.user` → UnauthorizedError → 401.
import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error.js';
import { ForbiddenError } from '../../domain/errors/forbidden.error.js';

export const roleMiddleware =
  (allowedRoles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (req.user === undefined) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
