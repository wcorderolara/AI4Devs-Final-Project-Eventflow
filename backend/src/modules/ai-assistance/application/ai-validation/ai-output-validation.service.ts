// AIOutputValidationService (US-124 / BE-003, AC-01/AC-02/AC-08). Parsea + valida el output IA
// contra el schema Zod strict del feature y retorna typed/canonical output. El error summary es
// bounded y SÓLO incluye path+code de Zod (nunca valores del output → evita leak/inyección).
import { z } from 'zod';
import type { AiFeatureType } from '../../domain/ai-features.js';
import { AiInvalidOutputSchemaError } from '../../../../shared/domain/errors/ai.errors.js';
import { parseAIOutput } from './ai-output-parser.js';
import { resolveOutputSchemaByFeature } from './output-schema-registry.js';
import type { AIOutputValidationResult, AIValidationContext, AIValidationMetadata } from './ai-validation-types.js';

const SUMMARY_MAX = 200;

/** Resumen SEGURO de un ZodError: sólo `path:code`, sin valores del output. Truncado. */
export function summarizeZodError(error: z.ZodError): string {
  const parts = error.issues.slice(0, 8).map((i) => `${i.path.join('.') || '(root)'}:${i.code}`);
  const summary = parts.join(', ');
  return summary.length > SUMMARY_MAX ? `${summary.slice(0, SUMMARY_MAX)}…` : summary;
}

export class AIOutputValidationService {
  /**
   * Valida `rawOutput` para `featureType`. Devuelve output typed + metadata (`schemaValid=true`)
   * o lanza `AiInvalidOutputSchemaError`/`AiOutputParseError` con summary seguro. `retryCount`
   * lo fija el orquestador (default 0 aquí).
   */
  validate<TOutput = unknown>(
    featureType: AiFeatureType,
    rawOutput: unknown,
    ctx: AIValidationContext = {},
    retryCount = 0,
  ): AIOutputValidationResult<TOutput> {
    const { schema, schemaName } = resolveOutputSchemaByFeature(featureType);
    const parsed = parseAIOutput(rawOutput, ctx); // AiOutputParseError si no es JSON/objeto

    const result = schema.safeParse(parsed);
    if (!result.success) {
      const summary = summarizeZodError(result.error);
      throw new AiInvalidOutputSchemaError(`AI output failed schema ${schemaName}`, {
        featureType,
        provider: ctx.provider,
        schemaName,
        retryCount,
        schemaErrorSummary: summary,
        correlationId: ctx.correlationId,
      });
    }

    const metadata: AIValidationMetadata = {
      featureType,
      schemaName,
      schemaValid: true,
      retryCount,
      provider: ctx.provider,
      correlationId: ctx.correlationId,
    };
    return { output: result.data as TOutput, metadata };
  }
}
