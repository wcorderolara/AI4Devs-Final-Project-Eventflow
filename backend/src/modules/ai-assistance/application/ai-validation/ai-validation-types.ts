// Tipos de la capa de validación de output IA (US-124 / BE-006, PB-P0-011). Application-only.
// Metadata segura consumible por US-122 (persistencia) y observabilidad; nunca raw output.
import type { AiFeatureType } from '../../domain/ai-features.js';

/** Metadata segura de validación (AC-05/AC-06/AC-09). `schemaErrorSummary` viene truncado. */
export interface AIValidationMetadata {
  featureType: AiFeatureType;
  schemaName: string;
  schemaValid: boolean;
  /** 0 si validó al primer intento; 1 si validó/falló tras el único retry (AC-03/AC-05). */
  retryCount: number;
  provider?: string;
  correlationId?: string;
  errorCode?: string;
  /** Resumen bounded del error Zod/parse (sin raw output). */
  schemaErrorSummary?: string;
}

/** Resultado de validación exitosa: output typed/canonical + metadata. */
export interface AIOutputValidationResult<TOutput = unknown> {
  output: TOutput;
  metadata: AIValidationMetadata;
}

/** Contexto opcional propagado a validación/logs. */
export interface AIValidationContext {
  correlationId?: string;
  provider?: string;
}
