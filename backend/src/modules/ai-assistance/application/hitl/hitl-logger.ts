// US-025 (PB-P1-016 / SEC-002 + OBS-001) — Logger HITL con redacción PII (reusa detector US-021).
// Emite los 6 eventos canónicos con `correlation_id`, `actorId`, `type`, `language_code`,
// `edited`, `latency_ms` y `error_code`. Cuando el payload contiene PII, se redacta el contenido
// y sólo se registra `pii_categories` (categorías detectadas, nunca contenido).
import { logger } from '../../../../shared/infrastructure/logger/index.js';
import { detectOrganizerPii } from '../ai-generation.service.js';

export type HitlEvent =
  | 'ai.recommendation.applied'
  | 'ai.recommendation.discarded'
  | 'ai.recommendation.apply_failed'
  | 'ai.recommendation.type_unsupported'
  | 'ai.recommendation.conflict'
  | 'ai.recommendation.payload_invalid';

export interface HitlLogFields {
  correlationId?: string;
  actorId: string;
  type: string;
  languageCode?: string;
  edited?: boolean;
  latencyMs?: number;
  errorCode?: string;
  recommendationId: string;
  appliedEntityType?: string | null;
  appliedEntityId?: string | null;
  /** Payload potencialmente sensible — se redacta a `pii_categories`. */
  editedPayload?: unknown;
  /** Zod issues summary potencialmente sensible — se redacta. */
  zodIssuesSummary?: string;
}

function safeMeta(fields: HitlLogFields): Record<string, unknown> {
  const {
    editedPayload,
    zodIssuesSummary,
    ...rest
  } = fields;
  const meta: Record<string, unknown> = {
    ...rest,
    correlation_id: rest.correlationId,
    actor_id: rest.actorId,
    language_code: rest.languageCode,
    latency_ms: rest.latencyMs,
    error_code: rest.errorCode,
    recommendation_id: rest.recommendationId,
    applied_entity_type: rest.appliedEntityType,
    applied_entity_id: rest.appliedEntityId,
  };
  // Redacta `editedPayload` — nunca loguea el contenido; sólo categorías.
  if (editedPayload !== undefined) {
    const scan = detectOrganizerPii(editedPayload);
    meta.edited_payload = '[REDACTED]';
    if (!scan.ok) meta.pii_categories = scan.matches;
  }
  // Redacta `zodIssuesSummary` (puede contener paths con PII).
  if (zodIssuesSummary !== undefined) {
    const scan = detectOrganizerPii(zodIssuesSummary);
    meta.zod_issues_summary = scan.ok ? zodIssuesSummary : '[REDACTED]';
    if (!scan.ok) meta.pii_categories = scan.matches;
  }
  // Limpia campos duplicados/undefined.
  delete (meta as { correlationId?: unknown }).correlationId;
  delete (meta as { actorId?: unknown }).actorId;
  delete (meta as { languageCode?: unknown }).languageCode;
  delete (meta as { latencyMs?: unknown }).latencyMs;
  delete (meta as { errorCode?: unknown }).errorCode;
  delete (meta as { recommendationId?: unknown }).recommendationId;
  delete (meta as { appliedEntityType?: unknown }).appliedEntityType;
  delete (meta as { appliedEntityId?: unknown }).appliedEntityId;
  return meta;
}

export class HitlLogger {
  emit(event: HitlEvent, fields: HitlLogFields): void {
    const meta = safeMeta(fields);
    if (event === 'ai.recommendation.apply_failed' || event === 'ai.recommendation.payload_invalid') {
      logger.warn({ event, ...meta });
    } else {
      logger.info({ event, ...meta });
    }
  }
}
