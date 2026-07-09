// ValidatedAIExecutionService (US-124 / BE-007, AC-03/AC-05/AC-06/AC-07). Orquesta generación +
// validación estricta + retry MÁXIMO 1 (sólo output inválido) + fallback delegado (validado con el
// mismo schema). Los errores de timeout/provider se PROPAGAN sin retry (delegados a US-123). No
// persiste, no expone: sólo output inválido nunca sale por el success path (SEC-01/SEC-03).
import type { AiFeatureType } from '../../domain/ai-features.js';
import { AiInvalidOutputError } from '../../../../shared/domain/errors/ai.errors.js';
import { AIOutputValidationService } from './ai-output-validation.service.js';
import { isRetryableOutputError } from './ai-retry-policy.js';
import {
  AI_OUTPUT_VALIDATION_FAILED_EVENT,
  AI_OUTPUT_RETRY_ATTEMPTED_EVENT,
  AI_OUTPUT_VALIDATION_SUCCESS_EVENT,
  AI_OUTPUT_RETRY_EXHAUSTED_EVENT,
  logValidationEvent,
} from './ai-validation-logger.js';
import { outputSchemaRef } from './output-schema-registry.js';
import type { AIOutputValidationResult, AIValidationContext } from './ai-validation-types.js';

export interface ValidatedExecutionInput {
  featureType: AiFeatureType;
  correlationId?: string;
  provider?: string;
}

export interface ValidatedExecutionHandlers {
  /** Produce el raw output para el intento `attempt` (0 = original, 1 = retry). Wraps provider/US-123. */
  generate: (attempt: number) => Promise<unknown>;
  /** Fallback delegado (US-123 → MockAIProvider). Su output se valida con el MISMO schema (AC-07). */
  fallback?: () => Promise<unknown>;
}

export class ValidatedAIExecutionService {
  constructor(private readonly validation: AIOutputValidationService = new AIOutputValidationService()) {}

  async execute<TOutput = unknown>(
    input: ValidatedExecutionInput,
    handlers: ValidatedExecutionHandlers,
  ): Promise<AIOutputValidationResult<TOutput>> {
    const ctx: AIValidationContext = { correlationId: input.correlationId, provider: input.provider };

    // Intento 0.
    try {
      const result = this.validation.validate<TOutput>(input.featureType, await handlers.generate(0), ctx, 0);
      logValidationEvent(AI_OUTPUT_VALIDATION_SUCCESS_EVENT, result.metadata);
      return result;
    } catch (e0) {
      if (!isRetryableOutputError(e0)) throw e0; // AC-04: timeout/provider → delegado a US-123
      logValidationEvent(AI_OUTPUT_VALIDATION_FAILED_EVENT, this.metaOf(input, e0, 0));
    }

    // Retry único (AC-03).
    logValidationEvent(AI_OUTPUT_RETRY_ATTEMPTED_EVENT, this.metaOf(input, undefined, 1));
    let lastSummary: string | undefined;
    try {
      const result = this.validation.validate<TOutput>(input.featureType, await handlers.generate(1), ctx, 1);
      logValidationEvent(AI_OUTPUT_VALIDATION_SUCCESS_EVENT, result.metadata);
      return result;
    } catch (e1) {
      if (!isRetryableOutputError(e1)) throw e1; // AC-04
      lastSummary = this.summaryOf(e1);
      logValidationEvent(AI_OUTPUT_RETRY_EXHAUSTED_EVENT, this.metaOf(input, e1, 1));
    }

    // Fallback delegado (AC-07): el output fallback debe pasar el MISMO schema strict.
    if (handlers.fallback) {
      try {
        const result = this.validation.validate<TOutput>(input.featureType, await handlers.fallback(), { ...ctx, provider: 'mock' }, 1);
        logValidationEvent(AI_OUTPUT_VALIDATION_SUCCESS_EVENT, result.metadata);
        return result;
      } catch (efb) {
        if (!isRetryableOutputError(efb)) throw efb;
        lastSummary = this.summaryOf(efb) ?? lastSummary;
      }
    }

    // AC-06: dos intentos (y fallback si aplica) inválidos → error controlado con metadata segura.
    throw new AiInvalidOutputError('AI output invalid after retry', {
      featureType: input.featureType,
      provider: input.provider,
      schemaName: outputSchemaRef(input.featureType),
      retryCount: 1,
      schemaErrorSummary: lastSummary,
      correlationId: input.correlationId,
    });
  }

  private metaOf(input: ValidatedExecutionInput, err: unknown, retryCount: number) {
    return {
      featureType: input.featureType,
      provider: input.provider,
      schemaName: outputSchemaRef(input.featureType),
      retryCount,
      errorCode: err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : undefined,
      schemaErrorSummary: this.summaryOf(err),
      correlationId: input.correlationId,
    };
  }

  private summaryOf(err: unknown): string | undefined {
    if (err && typeof err === 'object' && 'meta' in err) {
      const meta = (err as { meta?: { schemaErrorSummary?: string } }).meta;
      return meta?.schemaErrorSummary;
    }
    return undefined;
  }
}
