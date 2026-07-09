// notFoundMiddleware (US-091 / BE-003, Global — penúltimo; envelope anidado en US-093 / BE-006).
// Doc 14 §8.2; ADR-API-002. 404 estructurado para rutas no registradas, con el error envelope
// canónico `{ error: { code, message, correlationId } }`.
import type { RequestHandler } from 'express';
import { ErrorCodes } from '../../domain/errors/error-codes.js';

export const notFoundMiddleware: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: ErrorCodes.RESOURCE_NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
      correlationId: req.correlationId ?? '',
    },
  });
};
