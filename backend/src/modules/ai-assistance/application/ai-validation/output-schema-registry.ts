// Output schema registry (US-124 / BE-005, AI-001). Resuelve el schema Zod strict por `featureType`
// o por `outputSchemaRef` de US-121 (`ai.<featureType>.output.v1`). REUTILIZA `OUTPUT_SCHEMAS`
// (domain, US-097) — no duplica schemas (Deviation D2). Un ref inexistente falla controladamente.
import type { z } from 'zod';
import { OUTPUT_SCHEMAS, AI_FEATURE_TYPES, type AiFeatureType } from '../../domain/ai-features.js';
import { AiInvalidOutputSchemaError } from '../../../../shared/domain/errors/ai.errors.js';

export interface ResolvedOutputSchema {
  schema: z.ZodType;
  schemaName: string;
  featureType: AiFeatureType;
}

/** Nombre estable del schema por feature (alineado con `outputSchemaRef` de US-121). */
export function outputSchemaRef(featureType: AiFeatureType): string {
  return `ai.${featureType}.output.v1`;
}

/** Resuelve el schema por featureType. Lanza `AiInvalidOutputSchemaError` si no existe. */
export function resolveOutputSchemaByFeature(featureType: AiFeatureType): ResolvedOutputSchema {
  const schema = OUTPUT_SCHEMAS[featureType];
  if (!schema) {
    throw new AiInvalidOutputSchemaError(`No output schema registered for feature ${featureType}`, {
      featureType,
      schemaName: outputSchemaRef(featureType),
    });
  }
  return { schema, schemaName: outputSchemaRef(featureType), featureType };
}

/** Resuelve el schema por ref estable `ai.<featureType>.output.v1` (metadata de US-121). */
export function resolveOutputSchemaByRef(ref: string): ResolvedOutputSchema {
  const match = /^ai\.([a-z_]+)\.output\.v\d+$/.exec(ref);
  const feature = match?.[1] as AiFeatureType | undefined;
  if (!feature || !(AI_FEATURE_TYPES as readonly string[]).includes(feature)) {
    throw new AiInvalidOutputSchemaError(`Unknown output schema ref ${ref}`, { schemaName: ref });
  }
  return resolveOutputSchemaByFeature(feature);
}

/** `true` si existe schema para la feature. */
export function hasOutputSchema(featureType: AiFeatureType): boolean {
  return featureType in OUTPUT_SCHEMAS;
}
