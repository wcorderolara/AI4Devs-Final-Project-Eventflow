// Rate limiter de generación IA por usuario (US-097 / SEC-002; US-110 / PB-P0-007 — ADR-SEC-004).
// Cuota AGREGADA por usuario autenticado a través de todos los endpoints POST de generación IA
// cubiertos (un único limiter compartido ⇒ misma key ⇒ cuota agregada). Default MVP US-110:
// 10 generaciones por `ai:user:{userId}` cada 1 h (AC-04). Corre DESPUÉS de auth/role y ANTES de
// `LLMProvider`/`AIRecommendation` (VR-05). 429 con envelope + headers + log seguro. `skip` por
// `RATE_LIMIT_ENABLED` (N3).
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request } from 'express';
import { config } from '../../../config/env.js';
import { buildRateLimitHandler } from './rate-limit-response.js';

/** Key canónica IA (VR-04): agregada por usuario autenticado. Fallback a IP defensivo (no debería
 *  ocurrir: el limiter se monta tras `sessionAuth`, que garantiza `req.user`). */
const aiUserKey = (req: Request): string =>
  req.user?.id ? `ai:user:${req.user.id}` : `ai:ip:${req.ip ?? 'unknown'}`;

export const createAiGenerationRateLimit = (): RateLimitRequestHandler =>
  rateLimit({
    windowMs: config.AI_RATE_LIMIT_WINDOW_MS,
    max: () => config.AI_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: true,
    skip: () => !config.RATE_LIMIT_ENABLED,
    keyGenerator: aiUserKey,
    handler: buildRateLimitHandler({ policy: 'ai_generation', keyType: 'user' }, aiUserKey),
  });

export const aiGenerationRateLimit = createAiGenerationRateLimit();
