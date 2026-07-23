// US-126 (PB-P2-014 / BE-002). Helper `mock-ai` para pruebas de integración del módulo IA.
//
// Este helper es un **wrapper thin** sobre el `MockAIProvider` real (US-119) — la clase de
// producción cuando `LLM_PROVIDER=mock`. Evita duplicar lógica: los fixtures de output
// (schemas Zod válidos por feature) ya viven en `mock-ai-provider.ts` y son conformes al
// contrato de `OUTPUT_SCHEMAS` (`ai-assistance/domain/ai-features.ts`).
//
// Contrato (§7 Tech Spec US-126, VR-02, EC-02):
//   - `getMockAIProvider()` → singleton reusable entre specs.
//   - `assertNoOpenAIRealKey()` → guard para specs que quieren probar contract del provider mock;
//     falla el test si `OPENAI_API_KEY` real está seteado (protección SEC-02, evita gasto real).
//
// Re-exporta también los fixtures existentes de `tests/helpers/ai-*-fixtures.ts` bajo un solo
// import para reducir imports duplicados en specs.
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';

let cached: MockAIProvider | null = null;

/** Singleton para reutilizar entre specs (mismo comportamiento determinístico). */
export function getMockAIProvider(): MockAIProvider {
  if (cached === null) cached = new MockAIProvider();
  return cached;
}

/**
 * Guard defensivo (VR-02 · SEC-02): falla el test si el runner tiene una `OPENAI_API_KEY` real
 * accidentalmente inyectada. Uso opcional en specs que hacen assertions sobre el mock provider.
 */
export function assertNoOpenAIRealKey(): void {
  const key = process.env.OPENAI_API_KEY?.trim();
  // Aceptamos "dummy"/"test"/vacío. Cualquier otra cosa (sk-XXXX o similar) → fail.
  if (key && key.length > 0 && !/^(dummy|test|sk-test)/i.test(key)) {
    throw new Error(
      'US-126 VR-02: `OPENAI_API_KEY` no-dummy detectada en el runner de tests. ' +
        'Prohibido invocar el provider real. Usa `LLM_PROVIDER=mock` y clave vacía.',
    );
  }
}

// Re-exports de fixtures existentes — un solo import para specs IA.
export { FakeAIRecommendationRepository, validPersistInput } from './ai-recommendation-fixtures.js';
export { FakeProvider, execConfig, execInput } from './ai-execution-fixtures.js';
