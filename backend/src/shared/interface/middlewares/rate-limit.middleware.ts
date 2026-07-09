// rateLimitMiddleware (US-091 / BE-003, Global). ADR-SEC-004; NFR-SEC-004; VR-05.
// Rate limit global laxo. `standardHeaders: true` emite `RateLimit-*` y la respuesta 429 incluye
// `Retry-After`. `authRateLimit` (estricto) queda disponible para las feature stories de /auth/*.
import rateLimit from 'express-rate-limit';
import { config } from '../../../config/env.js';

export const rateLimitMiddleware = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      correlationId: req.correlationId,
    });
  },
});

// Límite estricto para endpoints /auth/* — lo aplican las feature stories de identity-access.
export const authRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
