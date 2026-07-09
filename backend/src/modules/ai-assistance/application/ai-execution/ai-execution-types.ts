// Tipos de la capa de ejecución AI (US-123 / BE-001, PB-P0-011). Timeout + fallback controlado.
// Application no importa SDKs; usa el port `LLMProvider` y factories aprobadas de PB-P0-009.
import type { AiFeatureType } from '../../domain/ai-features.js';
import type { ProviderId } from '../../ports/ai-contract.js';

/** Input de ejecución: mismo payload minimizado que preparan los use cases AI upstream. */
export interface AIExecutionInput {
  feature: AiFeatureType;
  input: Record<string, unknown>;
  languageCode: string;
  correlationId?: string;
  /** Contexto de composición; NO decide fallback por sí mismo (eso lo hace la config). */
  preferMock?: boolean;
}

/** Clasificación de estado final de una ejecución AI. */
export type AIExecutionStatus = 'success' | 'fallback' | 'error';

/**
 * Metadata normalizada de ejecución (AC-06). Segura para persistencia (US-122) y observabilidad:
 * NUNCA prompt completo, input/output crudo, secrets, tokens ni PII.
 */
export interface AIExecutionMetadata {
  featureType: AiFeatureType;
  /** Provider que produjo el resultado final (`mock` si hubo fallback). */
  provider: ProviderId;
  /** Provider primario configurado, aunque haya fallado. */
  originalProvider: ProviderId;
  fallbackUsed: boolean;
  /** Code del error del primario que motivó el fallback (si aplica). */
  fallbackReason?: string;
  timeoutMs: number;
  latencyMs: number;
  originalErrorCode?: string;
  correlationId?: string;
  status: AIExecutionStatus;
}

/** Resultado exitoso (primario o fallback) con metadata. */
export interface AIExecutionResult<TOutput = unknown> {
  output: TOutput;
  metadata: AIExecutionMetadata;
}

/**
 * Config de ejecución AI resuelta desde el entorno (US-123 / OPS-001). `isProduction` deriva de
 * `NODE_ENV=production` (production-academic); demo ≈ `demoMode` (Deviation D1).
 */
export interface AIExecutionConfig {
  llmProvider: ProviderId;
  timeoutMs: number;
  demoMode: boolean;
  useMockFallback: boolean;
  logPayloads: boolean;
  isProduction: boolean;
}
