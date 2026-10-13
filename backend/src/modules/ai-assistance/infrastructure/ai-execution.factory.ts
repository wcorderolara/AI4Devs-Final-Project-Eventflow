// Wiring de AIExecutionService con la provider factory real (US-123 / BE-005). Infrastructure:
// resuelve el provider PRIMARIO por `LLM_PROVIDER` y usa `MockAIProvider` como único target de
// fallback. `LLM_PROVIDER=mock` deja mock como primario con `fallbackUsed=false` (AC-04).
//
// PR-5: es el wiring de producción de los endpoints IA. Se preserva la semántica histórica de
// `AI_DEMO_MODE` (demo ⇒ MockAIProvider como primario, igual que `selectProvider`), así que en demo
// el provider efectivo es `mock` y no hay fallback mock→mock.
import { AIExecutionService } from '../application/ai-execution/ai-execution.service.js';
import { readAIExecutionConfig, validateAIExecutionConfig } from '../application/ai-execution/ai-execution-config.js';
import { selectProvider } from './llm-provider.factory.js';
import { MockAIProvider } from './providers/mock/mock-ai-provider.js';
import { config as defaultConfig, type AppConfig } from '../../../config/env.js';

/** Construye un `AIExecutionService` desde la config del entorno (o una config inyectada en tests). */
export function createAIExecutionService(appConfig: AppConfig = defaultConfig): AIExecutionService {
  const execConfig = readAIExecutionConfig(appConfig);
  // Defensa en profundidad: el boot ya valida (env.ts superRefine); revalidar con code tipado.
  validateAIExecutionConfig(execConfig);
  const effective = execConfig.demoMode ? { ...execConfig, llmProvider: 'mock' as const } : execConfig;
  const primaryProvider = selectProvider(effective.llmProvider, false);
  const mockProvider = new MockAIProvider();
  return new AIExecutionService({ primaryProvider, mockProvider, config: effective });
}
