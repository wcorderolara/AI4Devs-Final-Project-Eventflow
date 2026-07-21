// Fixtures para tests de la capa de ejecución AI (US-123). Fake providers deterministas (sin red)
// y builder de config. `hang` nunca resuelve → dispara timeout con fake timers.
import type { LLMProvider, LlmGenerationResult } from '../../src/modules/ai-assistance/ports/llm-provider.js';
import type { ProviderId } from '../../src/modules/ai-assistance/ports/ai-contract.js';
import type { AIExecutionConfig } from '../../src/modules/ai-assistance/application/ai-execution/ai-execution-types.js';

type Behavior = 'resolve' | 'hang' | 'throw';

export class FakeProvider implements LLMProvider {
  calls = 0;
  constructor(
    private readonly behavior: Behavior,
    private readonly opts: { output?: unknown; error?: Error; provider?: ProviderId } = {},
  ) {}

  generate(): Promise<LlmGenerationResult> {
    this.calls += 1;
    if (this.behavior === 'hang') return new Promise<LlmGenerationResult>(() => undefined);
    if (this.behavior === 'throw') return Promise.reject(this.opts.error ?? new Error('provider boom'));
    return Promise.resolve({
      output: this.opts.output ?? { ok: true },
      provider: this.opts.provider ?? 'openai',
      promptVersion: 'test:v1',
      latencyMs: 1,
      fallbackUsed: false,
    });
  }
}

export function execConfig(overrides: Partial<AIExecutionConfig> = {}): AIExecutionConfig {
  return {
    llmProvider: 'openai',
    timeoutMs: 60000,
    demoMode: false,
    useMockFallback: false,
    logPayloads: false,
    isProduction: false,
    ...overrides,
  };
}

import type { AIExecutionInput } from '../../src/modules/ai-assistance/application/ai-execution/ai-execution-types.js';

// US-084 (BE-002 · AC-01): `languageCode` tipado sobre `SupportedLanguage`. `as const` inferiría
// el string literal `'es-LATAM'` compatible pero anotar el objeto elimina cualquier ambigüedad
// para consumidores que reciban el fixture con widening implícito.
export const execInput: AIExecutionInput = {
  feature: 'event_plan',
  input: { eventType: 'wedding' },
  languageCode: 'es-LATAM',
  correlationId: 'corr-123',
};
