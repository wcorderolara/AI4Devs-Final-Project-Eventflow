// Registry de fixtures deterministas de MockAIProvider (US-119 / BE-002, BE-003, AI-001).
// Datos ficticios (seed/demo only), sin PII real ni secrets (SEC-02/SEC-04). Cada output es
// schema-compatible con `OUTPUT_SCHEMAS[feature]` (US-097) — validado en tests (AC-07/QA-004).
// La base por feature es el fixture `es-LATAM`; `LANGUAGE_FIXTURES` provee overrides por
// (feature, language[, scenarioSeed]). Missing fixture → output genérico (base) + warning (AC-05).
import type { AiFeatureType } from '../../../domain/ai-features.js';
import { buildFixtureKey, type MockFixtureKey } from './mock-fixture-key.js';

/** Output base determinista por feature (fixture `es-LATAM`). Preserva la conducta de US-097,
 *  incluyendo `budget_suggestion` que refleja `input.currencyCode` de forma determinista. */
export function baseOutput(feature: AiFeatureType, input: Record<string, unknown>): unknown {
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

/** Overrides por key exacta (idioma/seed/promptVersion). Demuestra selección language-specific (AC-04). */
const LANGUAGE_FIXTURES: Record<string, unknown> = {
  // Fixture `en` específica para event_plan → selección estable por idioma aprobado.
  [buildFixtureKey({ feature: 'event_plan', languageCode: 'en', promptVersionId: 'v1', scenarioSeed: 'default' })]: {
    summary: 'Suggested plan for the event',
    phases: [{ name: 'Preparation', tasks: ['Set the date', 'Book the venue'] }],
  },
};

export interface FixtureResolution {
  output: unknown;
  /** `true` si hubo match exacto de fixture; `false` si se usó el output genérico (base). */
  matched: boolean;
}

/**
 * Resuelve el fixture para una key. Match exacto de override → `matched:true`. Para `es-LATAM` el
 * output base ES el fixture aprobado (`matched:true`). Cualquier otro idioma/seed sin override →
 * output genérico determinista (base) con `matched:false` (dispara warning en el provider).
 */
export function resolveFixture(key: MockFixtureKey, input: Record<string, unknown>): FixtureResolution {
  const override = LANGUAGE_FIXTURES[buildFixtureKey(key)];
  if (override !== undefined) return { output: override, matched: true };
  const isBaseLanguage = key.languageCode === 'es-LATAM' && key.scenarioSeed === 'default' && key.promptVersionId === 'v1';
  return { output: baseOutput(key.feature, input), matched: isBaseLanguage };
}
