// MockAIProvider determinista (US-097 / AI-001; formalizado en US-119 / PB-P0-009). Adapter
// Infrastructure que implementa `LLMProvider` sin red, sin SDK y sin secrets (AC-06). Selección de
// fixtures determinística por dimensiones aprobadas (AC-02/03/04); missing fixture → output genérico
// + warning seguro (AC-05). Errores tipados para feature/idioma no soportado (EC-03/EC-04). Direct
// call → `fallbackUsed=false` (AC-08); la atribución de fallback pertenece a PB-P0-011.
//
// Hooks de test/demo (no forman parte del contrato de negocio): `input.__simulate` ∈
// {timeout, unavailable, invalid} fuerza caminos de error controlado (compatibilidad US-097,
// EC-07/08, NT-08/09). `input.__scenarioSeed` / `input.__promptVersionId` seleccionan variantes.
import { createHash } from 'node:crypto';
import type { LLMProvider, LlmGenerationResult } from '../../../ports/llm-provider.js';
import { AI_FEATURE_TYPES, type AiFeatureType } from '../../../domain/ai-features.js';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../../../shared/constants/languages.js';
import { logger } from '../../../../../shared/infrastructure/logger/index.js';
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  UnsupportedLanguageError,
} from '../../../../../shared/domain/errors/ai.errors.js';
import { ValidationError } from '../../../../../shared/domain/errors/validation.error.js';
import { fixtureKeyFromRequest } from './mock-fixture-key.js';
import { resolveFixture, baseOutput, type FixtureResolution } from './mock-fixtures.js';

interface GenerateRequest {
  feature: AiFeatureType;
  input: Record<string, unknown>;
  languageCode: SupportedLanguage;
  preferMock?: boolean;
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export class MockAIProvider implements LLMProvider {
  generate(request: GenerateRequest): Promise<LlmGenerationResult> {
    const sim = request.input.__simulate;
    // Hooks de error controlado (compatibilidad US-097).
    if (sim === 'timeout') return Promise.reject(new AiProviderTimeoutError());
    if (sim === 'unavailable') return Promise.reject(new AiProviderUnavailableError());

    // EC-03: feature no soportada → error tipado de validación (no éxito silencioso, no red).
    if (!(AI_FEATURE_TYPES as readonly string[]).includes(request.feature)) {
      return Promise.reject(new ValidationError('Unsupported AI feature', [{ field: 'feature', message: 'Unsupported AI feature identifier' }]));
    }
    // EC-04: idioma no soportado → error tipado (defensa; el use case ya valida upstream).
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(request.languageCode)) {
      return Promise.reject(new UnsupportedLanguageError());
    }

    const key = fixtureKeyFromRequest(request.feature, request.languageCode, request.input);

    // Hook `invalid` (compatibilidad US-097): output schema-inválido → el use case lo mapea a
    // AiInvalidOutputError. No es un missing fixture (matched=true para no emitir warning).
    const resolved: FixtureResolution =
      sim === 'invalid' ? { output: { invalid: true }, matched: true } : resolveFixture(key, request.input);

    if (!resolved.matched) {
      // AC-05 / EC-01: missing fixture exacta → output genérico + warning SEGURO (sin raw input/prompts).
      logger.warn({
        event: 'ai.mock.fixture_missing',
        provider: 'mock',
        featureType: key.feature,
        languageCode: key.languageCode,
        promptVersionId: key.promptVersionId,
        scenarioSeed: key.scenarioSeed,
        status: 'generic',
      });
    }

    const finalOutput = resolved.output;
    return Promise.resolve({
      output: finalOutput,
      provider: 'mock',
      promptVersion: `mock:${key.feature}:${key.promptVersionId}`,
      latencyMs: 1, // constante determinística (sin Date.now → sin flakiness, VR-02)
      fallbackUsed: false, // AC-08: direct call nunca atribuye fallback
      rawOutputHash: sha256(JSON.stringify(finalOutput)),
    });
  }
}

// Re-export para tests de schema compatibility (AC-07): permite validar el output genérico por feature.
export { baseOutput };
