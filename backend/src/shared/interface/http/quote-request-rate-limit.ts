// Rate limiter del endpoint `POST /api/v1/quote-requests` (US-049 / BE-005). ADR-SEC-004; D8.
// Cuota por usuario autenticado (organizer) — `10 req/min` según decisión D8 del refinement de
// US-049. Corre DESPUÉS de `sessionAuth` + `organizerRoleGuard` (VR-05); rechazo emite `429
// TOO_MANY_REQUESTS` con envelope estándar y `Retry-After`. `skip` por `RATE_LIMIT_ENABLED` (N3).
import type { RateLimitRequestHandler } from 'express-rate-limit';
import type { Request } from 'express';
import { makeRateLimiter } from './rate-limit-response.js';

const QUOTE_REQUEST_WINDOW_MS = 60 * 1000; // 1 minuto (D8).
const QUOTE_REQUEST_MAX = 10; // 10 req/min (D8).

const quoteRequestUserKey = (req: Request): string =>
  req.user?.id ? `org:quote_request:${req.user.id}` : `org:quote_request:ip:${req.ip ?? 'unknown'}`;

export const createQuoteRequestRateLimit = (): RateLimitRequestHandler =>
  makeRateLimiter({
    policy: 'quote_request_create',
    keyType: 'user',
    windowMs: QUOTE_REQUEST_WINDOW_MS,
    max: () => QUOTE_REQUEST_MAX,
    keyGenerator: quoteRequestUserKey,
  });

export const quoteRequestRateLimit = createQuoteRequestRateLimit();
