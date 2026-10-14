// rateLimitMiddleware (US-091 / BE-003, Global). ADR-SEC-004; NFR-SEC-004; VR-05.
// Rate limit global laxo. `standardHeaders: true` emite `RateLimit-*` y la respuesta 429 incluye
// `Retry-After`. Los límites estrictos por endpoint de /auth/* viven en `auth-rate-limits.ts` (US-110).
//
// US-116 (PB-P2-013 · AC-05 · SEC-04): `skip` excluye `/health` y `/health/ready` — probes
// externos (monitoreo, health checks) no deben ser rate-limitados. La lista canónica de paths
// vive en `HEALTH_PATHS` (`platform-health/domain/types.ts`) para preservar single source of truth.
import rateLimit from 'express-rate-limit';
import { config } from '../../../config/env.js';
import { HEALTH_PATHS } from '../../constants/health-paths.js';

export const rateLimitMiddleware = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => HEALTH_PATHS.includes(req.path),
  handler: (req, res) => {
    // Error envelope anidado (US-093 / BE-006; ADR-API-002).
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        correlationId: req.correlationId ?? '',
      },
    });
  },
});
