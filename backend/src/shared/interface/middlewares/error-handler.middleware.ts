// errorHandlerMiddleware (US-091 / BE-003, Global — último, 4 args). ADR-SEC-006; AC-07; VR-04.
// Error envelope { code, message, correlationId } sin stack trace. 5xx → mensaje genérico y stack
// solo a stderr (nunca en la respuesta). Mapea las clases de error de dominio a HTTP status.
import type { ErrorRequestHandler } from 'express';
import { AppError } from '../../domain/errors/app.error.js';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error.js';
import { ForbiddenError } from '../../domain/errors/forbidden.error.js';
import { NotFoundError } from '../../domain/errors/not-found.error.js';
import { ValidationError } from '../../domain/errors/validation.error.js';
import { TooManyRequestsError } from '../../domain/errors/too-many-requests.error.js';
import { logger } from '../../infrastructure/logger/index.js';

/** Tipos de error de body-parser (express.json) que deben mapearse a 400. */
const BODY_PARSER_ERROR_TYPES = new Set([
  'entity.too.large',
  'entity.parse.failed',
  'encoding.unsupported',
  'request.aborted',
]);

function statusForError(err: unknown): number {
  if (err instanceof UnauthorizedError) return 401;
  if (err instanceof ForbiddenError) return 403;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof TooManyRequestsError) return 429;
  // ValidationError, BadRequestError y cualquier otro AppError de dominio → 400.
  if (err instanceof AppError) return 400;
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: unknown }).type;
    if (typeof type === 'string' && BODY_PARSER_ERROR_TYPES.has(type)) return 400;
  }
  return 500;
}

export const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  const status = statusForError(err);
  const correlationId = req.correlationId;

  const code =
    err instanceof AppError ? err.code : status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST';

  // 5xx: mensaje genérico (nunca el mensaje real). 4xx: mensaje del error.
  const message =
    status >= 500 ? 'Internal server error' : err instanceof Error ? err.message : 'Request error';

  const body: Record<string, unknown> = { code, message, correlationId };
  if (err instanceof ValidationError && err.details) {
    body.details = err.details;
  }

  // Errores 5xx: stack a stderr para debugging — NUNCA en la respuesta.
  if (status >= 500) {
    logger.error({
      correlationId,
      message: 'Unhandled error',
      stack: err instanceof Error ? err.stack : String(err),
    });
  }

  res.status(status).json(body);
};
