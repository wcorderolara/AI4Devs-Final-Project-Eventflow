// Tipos de dominio de AIRecommendation (US-097 / BE-002). Vista en shape del contrato API.
import type { AiFeatureType } from './ai-features.js';

export type AiRecommendationStatus = 'pending' | 'accepted' | 'edited' | 'rejected' | 'discarded' | 'failed' | 'expired';

export interface AiMeta {
  provider: string;
  promptVersion: string;
  latencyMs: number;
  fallbackUsed: boolean;
  languageCode: string;
}

export interface AiRecommendationView {
  id: string;
  type: string;
  status: AiRecommendationStatus;
  requestedByUserId: string;
  eventId: string | null;
  vendorProfileId: string | null;
  quoteRequestId: string | null;
  input: unknown;
  output: unknown;
  aiMeta: AiMeta | null;
  // US-084 (PB-P1-049 / BE-004 · AC-03/AC-05): columnas denormalizadas expuestas al dominio.
  // `locale` es el idioma efectivo con el que se invocó al provider (formato contrato API);
  // `localeFallback` es true si la ejecución degradó a template estático o al mock por error.
  locale: string;
  localeFallback: boolean;
  createdAt: string;
}

export interface CreateAiRecommendationData {
  requestedByUserId: string;
  type: AiFeatureType;
  eventId: string | null;
  vendorProfileId: string | null;
  quoteRequestId: string | null;
  input: unknown;
  output: unknown;
  aiMeta: AiMeta;
}

// ── US-122 (PB-P0-010) — persistencia con metadata completa ──────────────────

/** Providers aprobados para persistencia (alineado con enum Prisma `LLMProvider`). */
export type AIRecommendationProvider = 'openai' | 'mock' | 'anthropic';

/**
 * `aiMeta` extendido (US-122): agrega `correlationId`, `timeoutMs`, `tokenCount` y (en failure
 * records) `errorCode`. Se persiste como JSON en la columna `ai_meta` (Deviation D1: el schema no
 * tiene columnas dedicadas para provider/fallback/latency/language/correlation).
 */
export interface AiMetaFull extends AiMeta {
  correlationId?: string;
  timeoutMs?: number;
  tokenCount?: number;
  errorCode?: string;
}

/**
 * Input interno de `PersistAIRecommendationService` (US-122 / BE-002). Metadata explícita provista
 * por la capa de orquestación IA — sin inferencias silenciosas de provider/fallback/language.
 * `promptVersionId` es el `AIPromptVersion.id` (uuid) real de US-121. `schemaValid` es el marker de
 * que el output ya fue validado aguas arriba; el service igual re-valida contra el schema del feature.
 */
export interface PersistAiRecommendationInput {
  requestedByUserId: string;
  type: AiFeatureType;
  promptVersionId: string;
  provider: AIRecommendationProvider;
  languageCode: string;
  fallbackUsed: boolean;
  timeoutMs: number;
  latencyMs: number;
  correlationId?: string;
  /** `promptVersion` lógico del provider (p. ej. `mock:event_plan:v1`); metadata auditable. */
  promptVersionLabel?: string;
  inputPayload: Record<string, unknown>;
  outputPayload: unknown;
  /** Marker de que el output ya fue validado por schema aguas arriba (VR-06 / AC-07). */
  schemaValid: boolean;
  eventId?: string | null;
  vendorProfileId?: string | null;
  quoteRequestId?: string | null;
  tokenCount?: number;
  isSeed?: boolean;
}

/**
 * Input para registrar un fallo controlado como `AIRecommendation` con `status=failed` (US-122 /
 * BE-006, AC-08). Sólo metadata segura: NUNCA raw provider output ni input sensible.
 */
export interface PersistAiRecommendationFailureInput {
  requestedByUserId: string;
  type: AiFeatureType;
  promptVersionId: string;
  provider: AIRecommendationProvider;
  languageCode: string;
  fallbackUsed: boolean;
  timeoutMs: number;
  latencyMs: number;
  correlationId?: string;
  /** Code seguro del fallo (p. ej. `AI_RECOMMENDATION_INVALID_OUTPUT`). */
  errorCode: string;
  eventId?: string | null;
  vendorProfileId?: string | null;
  quoteRequestId?: string | null;
  isSeed?: boolean;
}

/** Metadata `AIPromptVersion` para sync idempotente (US-122 / EMERGENT-122-001; producida por US-121). */
export interface AIPromptVersionSyncRow {
  id: string;
  promptId: string;
  promptKey: string;
  version: string;
  status: 'active' | 'deprecated';
  provider: AIRecommendationProvider;
  templateChecksum: string;
  description: string;
}
