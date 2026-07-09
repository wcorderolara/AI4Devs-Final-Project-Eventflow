// notFoundMiddleware (US-091 / BE-003, Global — penúltimo). Doc 14 §8.2.
// 404 estructurado para rutas no registradas, con `correlationId` en el envelope.
import type { RequestHandler } from 'express';

export const notFoundMiddleware: RequestHandler = (req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    correlationId: req.correlationId,
  });
};
