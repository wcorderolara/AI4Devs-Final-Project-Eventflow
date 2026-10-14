// errorHandlerMiddleware (US-091 / BE-003; reescrito en US-093 / BE-006, Global — último, 4 args).
// ADR-API-002; ADR-SEC-006; AC-01/AC-03/AC-05; EC-02/EC-04.
// Captura cualquier error, lo mapea a HTTP + código de catálogo, y serializa el error envelope
// ANIDADO `{ error: { code, message, details?, correlationId } }`. Nunca expone stack/SQL/paths al
// cliente. Loguea 4xx a `warn` y 5xx a `error` (con stack). Masking 403→404 para recursos privados.
// El mapeo vive en cada error (`AppError.toHttp()` / `InfrastructureError.toHttp()`); aquí solo se
// resuelven los errores que no son de dominio (body-parser y catch-all).
import type { ErrorRequestHandler } from 'express';
import { getCorrelationId } from '../../context/correlation-id.js';
import { AppError, type ErrorDetail, type HttpErrorMapping } from '../../domain/errors/app.error.js';
import { InfrastructureError } from '../../domain/errors/infrastructure.error.js';
import { ErrorCodes } from '../../domain/errors/error-codes.js';
import { logger } from '../../infrastructure/logger/index.js';

/** Tipos de error de body-parser (express.json) que deben mapearse a 400 (excepto entity.too.large → 413). */
const BODY_PARSER_ERROR_TYPES = new Set([
  'entity.parse.failed',
  'encoding.unsupported',
  'request.aborted',
]);

/** Mapea un error a { status HTTP, código de catálogo, mensaje seguro }. */
function mapError(err: unknown): HttpErrorMapping {
  if (err instanceof AppError || err instanceof InfrastructureError) {
    return err.toHttp();
  }
  // Errores de body-parser (express.json).
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: unknown }).type;
    // US-025 EC-06: entity.too.large → 413 PAYLOAD_TOO_LARGE (body>256KB en /apply scoped).
    if (type === 'entity.too.large') {
      return { status: 413, code: ErrorCodes.PAYLOAD_TOO_LARGE, message: 'Request payload too large' };
    }
    if (typeof type === 'string' && BODY_PARSER_ERROR_TYPES.has(type)) {
      return { status: 400, code: ErrorCodes.BAD_REQUEST, message: 'Invalid request body' };
    }
  }
  // Catch-all: nunca exponer el mensaje/stack original.
  return { status: 500, code: ErrorCodes.INTERNAL_ERROR, message: 'Error interno del servidor.' };
}

export const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  // US-114 (BE-005 / D-05): fallback defensivo a `getCorrelationId()` para
  // los pocos escenarios donde el error llega aquí sin `req.correlationId`
  // seteado (p. ej. error lanzado por un middleware que aborta ANTES de
  // `correlationIdMiddleware`, o pruebas que instancian el handler
  // directamente sin `req.correlationId`). El middleware US-114 siempre
  // setea `req.correlationId` en producción — este fallback preserva la
  // invariante `error.correlationId != ''` en toda condición.
  const correlationId =
    req.correlationId ?? getCorrelationId() ?? '';
  const mapped = mapError(err);

  // ── Observabilidad ────────────────────────────────────────────────────────
  if (mapped.status >= 500) {
    logger.error({
      event: 'unexpected_error',
      correlationId,
      method: req.method,
      path: req.path,
      httpStatus: mapped.status,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else if (mapped.masked) {
    logger.warn({
      event: 'authorization_masked_as_404',
      correlationId,
      method: req.method,
      path: req.path,
      realStatus: 403,
    });
  } else {
    logger.warn({
      event: 'domain_error',
      correlationId,
      code: mapped.code,
      httpStatus: mapped.status,
      method: req.method,
      path: req.path,
    });
  }

  // ── Cabecera Retry-After para rate limit ──────────────────────────────────
  if (mapped.retryAfterSeconds !== undefined) {
    res.setHeader('Retry-After', String(mapped.retryAfterSeconds));
  }

  // ── Serialización del error envelope ANIDADO (sin stack/SQL/paths) ─────────
  const error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    correlationId: string;
  } = { code: mapped.code, message: mapped.message, correlationId };
  if (mapped.details && mapped.details.length > 0) {
    error.details = mapped.details;
  }

  res.status(mapped.status).json({ error });
};
