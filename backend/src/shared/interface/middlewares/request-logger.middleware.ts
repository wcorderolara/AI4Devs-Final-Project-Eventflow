// requestLoggerMiddleware (US-091 / BE-003 → US-113 / BE-006, Global).
// Doc 14 §14; NFR-OBS-003; US-113 D4 (AsyncLocalStorage) + D3 (redacción de
// headers) + AC-05/AC-07.
//
// Comportamiento US-113:
//   1. Toma `req.correlationId` (seteado por `correlationIdMiddleware` upstream —
//      US-091 / equivalente US-114). Si falta, usa `null` explícito (AC-06).
//   2. Ejecuta el resto de la cadena de middlewares DENTRO de
//      `correlationContext.run({ correlationId }, next)` — así cualquier
//      `logger.info(...)` emitido río abajo hereda el `correlationId` via el
//      `mixin` del Pino logger (D4).
//   3. Emite un log `request received` al comenzar y `request completed` al
//      finalizar la respuesta con `req.headers` REDACTADOS (SEC-03, AC-07).
//   4. NO emite `authorization`, `cookie`, `password`, `captchaToken` — cubierto
//      por `redactHeaders` (AC-07) y por el `formatters.log` del logger que
//      aplica `redactSecrets` a todo el payload (AC-03/04).
import type { RequestHandler } from 'express';
import { logger, correlationContext } from '../../logger.js';
import { redactHeaders } from '../../infrastructure/logger/redactors.js';

export const requestLoggerMiddleware: RequestHandler = (req, res, next) => {
  const correlationId = req.correlationId ?? null;
  correlationContext.run({ correlationId }, () => {
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
  });
};
