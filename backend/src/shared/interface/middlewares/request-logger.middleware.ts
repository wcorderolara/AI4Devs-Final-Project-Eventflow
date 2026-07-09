// requestLoggerMiddleware (US-091 / BE-003, Global). Doc 14 §14; NFR-OBS-003.
// Log estructurado al finalizar la respuesta. Solo campos whitelisted: NUNCA `authorization`,
// `password` ni `captchaToken` (sin secrets/PII en logs).
import type { RequestHandler } from 'express';
import { logger } from '../../infrastructure/logger/index.js';

export const requestLoggerMiddleware: RequestHandler = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
};
