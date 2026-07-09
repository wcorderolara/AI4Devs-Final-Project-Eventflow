// Factory de LLMProvider (US-097 / AI-001, OPS-001). `mock` o demo-mode → MockAIProvider;
// openai/anthropic (no implementados en US-097) → UnavailableAIProvider (controlado).
import type { LLMProvider } from '../ports/llm-provider.js';
import { MockAIProvider } from './mock-ai-provider.js';
import { UnavailableAIProvider } from './unavailable-ai-provider.js';
import { config } from '../../../config/env.js';

export function createLlmProvider(): LLMProvider {
  if (config.LLM_PROVIDER === 'mock' || config.AI_DEMO_MODE) return new MockAIProvider();
  return new UnavailableAIProvider();
}
