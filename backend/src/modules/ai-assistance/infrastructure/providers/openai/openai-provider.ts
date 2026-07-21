// OpenAIProvider (US-118 / BE-003..006, AC-01/03/04/05/06/07). Adapter Infrastructure que implementa
// el puerto `LLMProvider` de US-117. Backend-only; no persiste DB, no ejecuta fallback (fallbackUsed
// siempre false), no decide autorización. Timeout por llamada vía AbortController; errores tipados;
// logs seguros (sin API key, prompts completos ni raw output). El SDK/cliente concreto vive sólo aquí.
import { createHash } from 'node:crypto';
import type { LLMProvider, LlmGenerationResult } from '../../../ports/llm-provider.js';
import type { AiFeatureType } from '../../../domain/ai-features.js';
import type { SupportedLanguage } from '../../../../../shared/constants/languages.js';
import { config } from '../../../../../config/env.js';
import { logger } from '../../../../../shared/infrastructure/logger/index.js';
import { composeLocaleInstruction } from '../../../../../shared/i18n/locale-label.js';
import { AiInvalidOutputError } from '../../../../../shared/domain/errors/ai.errors.js';
import { resolveOpenAIConfig, type OpenAIConfig } from './openai-config.js';
import {
  createFetchOpenAIChatTransport,
  type OpenAIChatRequest,
  type OpenAIChatTransport,
} from './openai-client.js';
import { toTypedProviderError } from './openai-error-mapper.js';

interface GenerateRequest {
  feature: AiFeatureType;
  input: Record<string, unknown>;
  languageCode: SupportedLanguage;
  preferMock?: boolean;
}

/**
 * Construye el chat request. US-084 (PB-P1-049 / BE-003 · AC-02): la directiva de idioma se
 * inyecta como PRIMER mensaje `system` via `composeLocaleInstruction(languageCode)`, seguida por
 * el system prompt específico de la feature. Empíricamente los LLMs modernos respetan mejor una
 * directiva sistémica prependida como mensaje separado que embebida al final de otro system.
 */
function buildChatRequest(req: GenerateRequest, model: string): OpenAIChatRequest {
  return {
    model,
    messages: [
      { role: 'system', content: composeLocaleInstruction(req.languageCode) },
      {
        role: 'system',
        content:
          `You are an assistant for the EventFlow feature "${req.feature}". ` +
          `Respond in language "${req.languageCode}" with a single valid JSON object that matches the feature output schema. ` +
          `Do not include any text outside the JSON.`,
      },
      { role: 'user', content: JSON.stringify(req.input) },
    ],
    responseFormat: { type: 'json_object' },
  };
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export class OpenAIProvider implements LLMProvider {
  constructor(
    private readonly config: OpenAIConfig,
    private readonly transport: OpenAIChatTransport,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async generate(request: GenerateRequest): Promise<LlmGenerationResult> {
    const startedAt = this.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let content: string;
    try {
      const chatRequest = buildChatRequest(request, this.config.model);
      const response = await this.transport.createChatCompletion(chatRequest, controller.signal);
      content = response.content;
    } catch (err) {
      const typed = toTypedProviderError(err);
      this.logFailed(request, typed.code, this.now() - startedAt);
      throw typed;
    } finally {
      clearTimeout(timer);
    }

    let output: unknown;
    try {
      output = JSON.parse(content);
    } catch {
      const typed = new AiInvalidOutputError();
      this.logFailed(request, typed.code, this.now() - startedAt);
      throw typed;
    }

    const latencyMs = this.now() - startedAt;
    this.logSuccess(request, latencyMs);
    return {
      output,
      provider: 'openai',
      promptVersion: `openai:${this.config.model}`,
      latencyMs,
      fallbackUsed: false,
      rawOutputHash: sha256(content),
    };
  }

  // ── Logs estructurados seguros (US-118 / OBS-001, AC-07). Sin API key, prompts ni raw output.
  // `redact()` del logger compartido añade una segunda barrera contra claves sensibles.
  private logSuccess(request: GenerateRequest, latencyMs: number): void {
    logger.info({
      event: 'ai.request.success',
      provider: 'openai',
      model: this.config.model,
      featureType: request.feature,
      languageCode: request.languageCode,
      latencyMs,
      status: 'ok',
    });
  }

  private logFailed(request: GenerateRequest, errorCode: string, latencyMs: number): void {
    logger.warn({
      event: 'ai.request.failed',
      provider: 'openai',
      model: this.config.model,
      featureType: request.feature,
      languageCode: request.languageCode,
      latencyMs,
      errorCode,
    });
  }
}

/** Composition helper usado por el factory (US-118). Lee config backend-only y usa el transport real. */
export function createOpenAIProvider(): OpenAIProvider {
  const openaiConfig = resolveOpenAIConfig(config);
  return new OpenAIProvider(openaiConfig, createFetchOpenAIChatTransport(openaiConfig));
}
