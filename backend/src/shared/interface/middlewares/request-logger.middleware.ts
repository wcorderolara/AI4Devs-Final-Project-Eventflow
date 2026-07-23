// requestLoggerMiddleware (US-091 / BE-003 → US-113 / BE-006 → US-114 / D4,
// Global). Doc 14 §14; NFR-OBS-003; US-113 D4 (AsyncLocalStorage) + D3
// (redacción de headers) + AC-05/AC-07.
//
// Comportamiento (US-114 update — D4 execution record):
//   * El middleware `correlationIdMiddleware` upstream (US-114 / BE-004)
//     ya ejecutó `correlationContext.run({correlationId}, next)`. Los logs
//     emitidos aquí heredan el `correlationId` via el `mixin` del Pino logger
//     — sin necesidad de re-envolver.
//   * Emite `request received` al inicio (con `req.headers` REDACTADOS por
//     `redactHeaders` — SEC-03, AC-07) y `request completed` al `finish`
//     (status + ms).
//   * NO emite `authorization`, `cookie`, `password`, `captchaToken` —
//     cubierto por `redactHeaders` y por el `formatters.log` del logger que
//     aplica `redactSecrets` a todo el payload (AC-03/04).
import type { RequestHandler } from 'express';
import { logger } from '../../logger.js';
import { redactHeaders } from '../../infrastructure/logger/redactors.js';

export const requestLoggerMiddleware: RequestHandler = (req, res, next) => {
  const start = Date.now();
  logger.info(
    {
      req: {
        method: req.method,
        url: req.originalUrl ?? req.url,
        headers: redactHeaders(req.headers as Record<string, unknown>),
      },
    },
    'request received',
  );
  res.on('finish', () => {
    logger.info(
      {
        res: {
          status: res.statusCode,
          ms: Date.now() - start,
        },
      },
      'request completed',
    );
  });
  next();
};
