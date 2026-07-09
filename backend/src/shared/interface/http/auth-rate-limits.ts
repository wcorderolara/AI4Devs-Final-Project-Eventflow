// Rate limiters por endpoint público sensible (US-094 / SEC-002). ADR-SEC-004; EC-05.
// Límites (Doc 16/Doc 19): login 10/IP/10min · register 5/IP/10min · reset-request 3/email/h.
// El rechazo ocurre ANTES de procesar credenciales o crear usuarios. Respuesta 429 con el error
// envelope anidado estándar (ADR-API-002). No se ubica en `shared/interface/middlewares/` para
// preservar el invariante estructural de US-090.
import rateLimit, { type Options } from 'express-rate-limit';
import { logger } from '../../infrastructure/logger/index.js';
import { config } from '../../../config/env.js';

function makeAuthLimiter(opts: Pick<Options, 'windowMs' | 'max'> & Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    // En `test` se omite el límite para evitar contaminación de estado entre specs (el store es
    // in-memory y proceso-global). El comportamiento 429 se verifica con un limiter dedicado en
    // los security negative tests (QA-003). Producción/desarrollo aplican los límites reales.
    skip: () => config.NODE_ENV === 'test',
    ...opts,
    handler: (req, res) => {
      logger.warn({ event: 'auth.rate_limited', correlationId: req.correlationId, path: req.path });
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          correlationId: req.correlationId ?? '',
        },
      });
    },
  });
}

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

export const loginRateLimit = makeAuthLimiter({ windowMs: TEN_MINUTES, max: 10 });

export const registerRateLimit = makeAuthLimiter({ windowMs: TEN_MINUTES, max: 5 });

export const passwordResetRequestRateLimit = makeAuthLimiter({
  windowMs: ONE_HOUR,
  max: 3,
  // Límite por email (anti-abuso dirigido). Fallback a IP si el email aún no está disponible.
  keyGenerator: (req): string => {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    return typeof email === 'string' && email.length > 0 ? email.toLowerCase() : (req.ip ?? 'unknown');
  },
});
