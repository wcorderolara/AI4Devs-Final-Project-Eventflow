// Logging seguro de persistencia de AIRecommendation (US-122 / OBS-001, OBS-002, SEC-002).
// Eventos `ai.recommendation.persisted` / `ai.recommendation.persist_failed`. SÓLO metadata segura:
// id, type, provider, fallbackUsed, latencyMs, timeoutMs, correlationId, status, errorCode.
// PROHIBIDO: full prompt, full input payload, raw provider output, secrets, tokens, PII (SEC-05).
import { logger } from '../../../shared/infrastructure/logger/index.js';

export const AI_RECOMMENDATION_PERSISTED_EVENT = 'ai.recommendation.persisted';
export const AI_RECOMMENDATION_PERSIST_FAILED_EVENT = 'ai.recommendation.persist_failed';

export interface PersistSafeLogFields {
  recommendationId?: string;
  type: string;
  provider: string;
  fallbackUsed: boolean;
  latencyMs: number;
  timeoutMs: number;
  correlationId?: string;
  status: string;
  errorCode?: string;
}

export function logRecommendationPersisted(fields: PersistSafeLogFields): void {
  logger.info(AI_RECOMMENDATION_PERSISTED_EVENT, { event: AI_RECOMMENDATION_PERSISTED_EVENT, ...fields });
}

export function logRecommendationPersistFailed(fields: PersistSafeLogFields): void {
  logger.warn(AI_RECOMMENDATION_PERSIST_FAILED_EVENT, { event: AI_RECOMMENDATION_PERSIST_FAILED_EVENT, ...fields });
}
