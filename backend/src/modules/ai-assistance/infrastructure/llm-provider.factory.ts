// Factory/selector de LLMProvider (US-097; extendido en US-118 OpenAI y US-120 Anthropic).
// `mock` o demo-mode → MockAIProvider (US-119). `openai` → OpenAIProvider real (US-118). `anthropic`
// → AnthropicProvider stub que falla explícitamente (US-120, ADR-AI-004). La selección NUNCA cae en
// silencio a otro provider: `anthropic` resuelve sólo al stub (AC-04).
import type { LLMProvider } from '../ports/llm-provider.js';
import type { ProviderId } from '../ports/ai-contract.js';
import { MockAIProvider } from './providers/mock/mock-ai-provider.js';
import { createOpenAIProvider } from './providers/openai/openai-provider.js';
import { AnthropicProvider } from './providers/anthropic/anthropic-provider.js';
import { config } from '../../../config/env.js';

/** Resuelve el provider por id/demo-mode. Función pura y testeable (US-120 / BE-004). */
export function selectProvider(providerId: ProviderId, demoMode: boolean): LLMProvider {
  if (providerId === 'mock' || demoMode) return new MockAIProvider();
  if (providerId === 'openai') return createOpenAIProvider();
  return new AnthropicProvider(); // anthropic → stub explícito (no fallback silencioso)
}

export function createLlmProvider(): LLMProvider {
  return selectProvider(config.LLM_PROVIDER, config.AI_DEMO_MODE);
}
