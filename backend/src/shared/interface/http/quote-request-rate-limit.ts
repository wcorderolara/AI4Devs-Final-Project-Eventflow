// Rate limiter del endpoint `POST /api/v1/quote-requests` (US-049 / BE-005). ADR-SEC-004; D8.
// Cuota por usuario autenticado (organizer) — `10 req/min` según decisión D8 del refinement de
// US-049. Corre DESPUÉS de `sessionAuth` + `organizerRoleGuard` (VR-05); rechazo emite `429
// TOO_MANY_REQUESTS` con envelope estándar y `Retry-After`. `skip` por `RATE_LIMIT_ENABLED` (N3).
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request } from 'express';
import { config } from '../../../config/env.js';
import { buildRateLimitHandler } from './rate-limit-response.js';

const QUOTE_REQUEST_WINDOW_MS = 60 * 1000; // 1 minuto (D8).
const QUOTE_REQUEST_MAX = 10; // 10 req/min (D8).

const quoteRequestUserKey = (req: Request): string =>
  req.user?.id ? `org:quote_request:${req.user.id}` : `org:quote_request:ip:${req.ip ?? 'unknown'}`;

export const createQuoteRequestRateLimit = (): RateLimitRequestHandler =>
  rateLimit({
    windowMs: QUOTE_REQUEST_WINDOW_MS,
    max: () => QUOTE_REQUEST_MAX,
    standardHeaders: true,
    legacyHeaders: true,
    skip: () => !config.RATE_LIMIT_ENABLED,
    keyGenerator: quoteRequestUserKey,
    handler: buildRateLimitHandler(
      { policy: 'quote_request_create', keyType: 'user' },
      quoteRequestUserKey,
    ),
  });

export const quoteRequestRateLimit = createQuoteRequestRateLimit();
