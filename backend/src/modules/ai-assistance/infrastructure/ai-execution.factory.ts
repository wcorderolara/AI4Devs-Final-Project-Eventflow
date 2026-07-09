// Wiring de AIExecutionService con la provider factory real (US-123 / BE-005). Infrastructure:
// resuelve el provider PRIMARIO por `LLM_PROVIDER` (sin swap por demo-mode) y usa `MockAIProvider`
// como único target de fallback. Así demo-mode HABILITA fallback (AC-02) en vez de reemplazar el
// primario, y `LLM_PROVIDER=mock` deja mock como primario con `fallbackUsed=false` (AC-04).
//
// Nota: el path de endpoint de US-097 sigue usando `createLlmProvider()` (demo→mock directo) hasta
// que un use case migre a esta capa; US-123 entrega la capa, la adopción es incremental (ver README).
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
  const primaryProvider = selectProvider(execConfig.llmProvider, false);
  const mockProvider = new MockAIProvider();
  return new AIExecutionService({ primaryProvider, mockProvider, config: execConfig });
}
