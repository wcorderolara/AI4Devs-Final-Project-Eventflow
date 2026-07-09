// Rate limiter de generación AI por usuario (US-097 / SEC-002, EC-10). Se omite en `test` (como los
// limiters de auth) para no contaminar estado; el 429 se prueba con un limiter dedicado (QA-003).
import rateLimit from 'express-rate-limit';
import { logger } from '../../infrastructure/logger/index.js';
import { config } from '../../../config/env.js';

export const aiGenerationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: config.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  keyGenerator: (req): string => req.user?.id ?? req.ip ?? 'unknown',
  handler: (req, res) => {
    logger.warn({ event: 'ai.rate_limited', correlationId: req.correlationId, path: req.path });
    res.status(429).json({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', correlationId: req.correlationId ?? '' },
    });
  },
});
