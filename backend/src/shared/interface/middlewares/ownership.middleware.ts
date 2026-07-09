// ownershipMiddleware (US-091 / BE-007, Por ruta — factory). ADR-SEC-003; Doc 14 §17.2; VR-03.
// Resuelve la propiedad del recurso vía un `OwnershipResolver` inyectable. Si el actor no es
// propietario → NotFoundError → 404 ENMASCARADO (no 403), para prevenir enumeración de IDs.
import type { Request, RequestHandler } from 'express';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error.js';
import { NotFoundError } from '../../domain/errors/not-found.error.js';

/** Resuelve si el actor del request es propietario del recurso solicitado. */
export type OwnershipResolver = (req: Request) => Promise<boolean>;

export const ownershipMiddleware =
  (resolver: OwnershipResolver): RequestHandler =>
  (req, _res, next) => {
    if (req.user === undefined) {
      next(new UnauthorizedError());
      return;
    }
    resolver(req)
      .then((isOwner) => {
        next(isOwner ? undefined : new NotFoundError());
      })
      .catch((err: unknown) => {
        next(err);
      });
  };
