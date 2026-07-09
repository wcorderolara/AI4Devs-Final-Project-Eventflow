// AIExecutionService (US-123 / BE-005, BE-006). Orquesta provider primario + timeout + fallback
// elegible + clasificación de errores + metadata normalizada (AC-01..AC-06). Application-only:
// depende del port `LLMProvider` (no de SDKs). No crea endpoints, no persiste, no valida JSON (US-124).
import type { LLMProvider, LlmGenerationResult } from '../../ports/llm-provider.js';
import type { ProviderId } from '../../ports/ai-contract.js';
import { ErrorCodes } from '../../../../shared/domain/errors/error-codes.js';
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  AIProviderNotConfiguredError,
  AiFallbackFailedError,
} from '../../../../shared/domain/errors/ai.errors.js';
import { withTimeout } from './ai-timeout.service.js';
import { FallbackService } from './fallback.service.js';
import {
  AI_PROVIDER_TIMEOUT_EVENT,
  AI_PROVIDER_FAILURE_EVENT,
  AI_FALLBACK_USED_EVENT,
  AI_FALLBACK_FAILED_EVENT,
  logAIExecutionEvent,
} from './ai-execution-logger.js';
import type { AIExecutionConfig, AIExecutionInput, AIExecutionMetadata, AIExecutionResult } from './ai-execution-types.js';

export interface AIExecutionServiceDeps {
  /** Provider primario (resuelto por config/factory de PB-P0-009). */
  primaryProvider: LLMProvider;
  /** Target de fallback: SIEMPRE `MockAIProvider` (nunca anthropic). */
  mockProvider: LLMProvider;
  config: AIExecutionConfig;
  /** Clock inyectable para latencia determinística en tests. Default `Date.now`. */
  now?: () => number;
}

/** Deriva un error code seguro desde un error arbitrario. */
function codeOf(err: unknown): string {
  if (err instanceof AiProviderTimeoutError) return ErrorCodes.AI_PROVIDER_TIMEOUT;
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  return ErrorCodes.AI_PROVIDER_UNAVAILABLE;
}

export class AIExecutionService {
  constructor(private readonly deps: AIExecutionServiceDeps) {}

  /**
   * Ejecuta la generación con timeout y fallback controlado. Retorna `AIExecutionResult` en éxito
   * (primario o fallback). Lanza un error tipado con `meta` de ejecución en falla controlada (AC-06).
   */
  async execute<TOutput = unknown>(input: AIExecutionInput): Promise<AIExecutionResult<TOutput>> {
    const now = this.deps.now ?? Date.now;
    const { config } = this.deps;
    const primaryId = config.llmProvider;
    const primaryIsMock = primaryId === 'mock';
    const start = now();
    const base = { featureType: input.feature, timeoutMs: config.timeoutMs, correlationId: input.correlationId } as const;

    let primaryResult: LlmGenerationResult;
    try {
      primaryResult = await withTimeout(
        () => this.deps.primaryProvider.generate({ feature: input.feature, input: input.input, languageCode: input.languageCode, preferMock: input.preferMock }),
        { timeoutMs: config.timeoutMs },
      );
    } catch (err) {
      return this.handlePrimaryFailure<TOutput>(input, err, primaryId, primaryIsMock, start, now);
    }

    // Éxito primario. `LLM_PROVIDER=mock` ⇒ mock es PRIMARIO, no fallback (AC-04): fallbackUsed=false.
    const metadata: AIExecutionMetadata = {
      ...base,
      provider: primaryId,
      originalProvider: primaryId,
      fallbackUsed: false,
      latencyMs: now() - start,
      status: 'success',
    };
    return { output: primaryResult.output as TOutput, metadata };
  }

  private async handlePrimaryFailure<TOutput>(
    input: AIExecutionInput,
    err: unknown,
    primaryId: ProviderId,
    primaryIsMock: boolean,
    start: number,
    now: () => number,
  ): Promise<AIExecutionResult<TOutput>> {
    const { config } = this.deps;
    const errorCode = codeOf(err);
    const isTimeout = err instanceof AiProviderTimeoutError;

    logAIExecutionEvent(isTimeout ? AI_PROVIDER_TIMEOUT_EVENT : AI_PROVIDER_FAILURE_EVENT, {
      featureType: input.feature,
      provider: primaryId,
      originalProvider: primaryId,
      timeoutMs: config.timeoutMs,
      latencyMs: now() - start,
      errorCode,
      correlationId: input.correlationId,
    });

    const eligible = FallbackService.isFallbackEligible(config) && !primaryIsMock;
    if (!eligible) {
      // AC-03 / EC-01: error controlado, sin llamar a MockAIProvider.
      const meta = {
        featureType: input.feature,
        provider: primaryId,
        originalProvider: primaryId,
        fallbackUsed: false,
        timeoutMs: config.timeoutMs,
        latencyMs: now() - start,
        originalErrorCode: errorCode,
        correlationId: input.correlationId,
      };
      if (err instanceof AIProviderNotConfiguredError) throw err; // config-level: preservar tal cual
      if (isTimeout) throw new AiProviderTimeoutError('AI provider timed out', meta);
      throw new AiProviderUnavailableError('AI provider is unavailable', meta);
    }

    // Fallback: único target permitido = MockAIProvider (AC-02/AC-05).
    logAIExecutionEvent(AI_FALLBACK_USED_EVENT, {
      featureType: input.feature,
      provider: 'mock',
      originalProvider: primaryId,
      fallbackUsed: true,
      fallbackReason: errorCode,
      timeoutMs: config.timeoutMs,
      correlationId: input.correlationId,
    });

    try {
      const fb = await withTimeout(
        () => this.deps.mockProvider.generate({ feature: input.feature, input: input.input, languageCode: input.languageCode, preferMock: true }),
        { timeoutMs: config.timeoutMs },
      );
      const metadata: AIExecutionMetadata = {
        featureType: input.feature,
        provider: 'mock',
        originalProvider: primaryId,
        fallbackUsed: true,
        fallbackReason: errorCode,
        timeoutMs: config.timeoutMs,
        latencyMs: now() - start,
        originalErrorCode: errorCode,
        correlationId: input.correlationId,
        status: 'fallback',
      };
      return { output: fb.output as TOutput, metadata };
    } catch (fbErr) {
      // EC-05: mock fallback también falló → error controlado, sin loop, sin Anthropic.
      const meta = {
        featureType: input.feature,
        provider: 'mock' as ProviderId,
        originalProvider: primaryId,
        fallbackUsed: true,
        fallbackReason: errorCode,
        timeoutMs: config.timeoutMs,
        latencyMs: now() - start,
        originalErrorCode: errorCode,
        correlationId: input.correlationId,
      };
      logAIExecutionEvent(AI_FALLBACK_FAILED_EVENT, { ...meta, errorCode: codeOf(fbErr) });
      throw new AiFallbackFailedError('AI fallback provider failed', meta);
    }
  }
}
