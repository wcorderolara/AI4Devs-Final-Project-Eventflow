// validateRequestMiddleware (US-091 / BE-009; US-092 / BE-002, Por ruta — factory). AC-01/AC-02; VR-01.
// Valida { body, params, query } con un schema Zod. Falla → ValidationError con `details`
// { field, message } por campo → 400. Éxito → `req.validated` disponible para el handler.
// US-092: loguea a nivel `warn` los errores de validación con { event, correlationId, method,
// path, fields } — SOLO los nombres de los campos fallidos, nunca sus valores (prevención de PII).
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../../domain/errors/validation.error.js';
import { logger } from '../../infrastructure/logger/index.js';

export const validateRequestMiddleware =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      // Log estructurado sin valores de campos (US-092 §14; sin PII: password, captchaToken, etc.).
      logger.warn({
        event: 'validation_failed',
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        fields: details.map((d) => d.field),
      });
      next(new ValidationError('Validation failed', details));
      return;
    }
    req.validated = result.data as { body?: unknown; params?: unknown; query?: unknown };
    next();
  };
