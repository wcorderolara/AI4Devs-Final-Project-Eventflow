// MockAIProvider determinista (US-097 / AI-001, SEED-001). CI-safe: sin red. Retorna output por
// feature que satisface su schema. Hook de test: `input.__simulate` ∈ {timeout, unavailable, invalid}
// fuerza los caminos de error controlado (EC-07/08, NT-08/09).
import type { LLMProvider, LlmGenerationResult } from '../ports/llm-provider.js';
import type { AiFeatureType } from '../domain/ai-features.js';
import { AiProviderTimeoutError, AiProviderUnavailableError } from '../../../shared/domain/errors/ai.errors.js';

function deterministicOutput(feature: AiFeatureType, input: Record<string, unknown>): unknown {
  switch (feature) {
    case 'event_plan':
      return { summary: 'Plan sugerido para el evento', phases: [{ name: 'Preparación', tasks: ['Definir fecha', 'Reservar lugar'] }] };
    case 'checklist':
      return { items: [{ title: 'Reservar lugar', priority: 'high' }, { title: 'Contratar catering', priority: 'medium' }] };
    case 'budget_suggestion':
      return {
        currencyCode: typeof input.currencyCode === 'string' ? input.currencyCode : 'GTQ',
        items: [{ category: 'Catering', estimatedAmount: '1000.00' }, { category: 'Decoración', estimatedAmount: '500.00' }],
      };
    case 'vendor_categories':
      return { categories: [{ code: 'catering', reason: 'Servicio esencial' }, { code: 'photography', reason: 'Registro del evento' }] };
    case 'quote_brief':
      return { brief: 'Brief de cotización', requirements: ['Servicio para 100 personas'], questions: ['¿Incluye montaje?'], constraints: [] };
    case 'quote_comparison':
      return { summary: 'Comparación de cotizaciones', perQuote: [], recommendation: 'Revisar la opción con mejor relación precio/valor.' };
    case 'vendor_bio':
      return { bio: 'Somos un proveedor con amplia experiencia.', highlights: ['Puntualidad', 'Calidad'] };
    case 'task_prioritization':
      return { prioritized: [{ title: 'Reservar lugar', rank: 1, rationale: 'Es la restricción principal' }] };
    default:
      return {};
  }
}

export class MockAIProvider implements LLMProvider {
  generate(request: { feature: AiFeatureType; input: Record<string, unknown>; languageCode: string }): Promise<LlmGenerationResult> {
    const sim = request.input.__simulate;
    if (sim === 'timeout') return Promise.reject(new AiProviderTimeoutError());
    if (sim === 'unavailable') return Promise.reject(new AiProviderUnavailableError());
    const output = sim === 'invalid' ? { invalid: true } : deterministicOutput(request.feature, request.input);
    return Promise.resolve({ output, provider: 'mock', promptVersion: `mock-${request.feature}-v1`, latencyMs: 1, fallbackUsed: false });
  }
}
