// validateRequestMiddleware (US-091 / BE-009, Por ruta — factory). AC-06; VR-06.
// Valida { body, params, query } con un schema Zod. Falla → ValidationError con `details`
// { field, message } por campo → 400. Éxito → `req.validated` disponible para el handler.
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../../domain/errors/validation.error.js';

export const validateRequestMiddleware =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      next(new ValidationError('Validation failed', details));
      return;
    }
    req.validated = result.data as { body?: unknown; params?: unknown; query?: unknown };
    next();
  };
