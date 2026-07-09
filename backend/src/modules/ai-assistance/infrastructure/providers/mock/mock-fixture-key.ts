// Clave de fixture determinística de MockAIProvider (US-119 / BE-001, AC-02/AC-03/AC-04).
// Construye una key ESTABLE a partir de dimensiones aprobadas: feature, languageCode,
// promptVersionId, scenarioSeed y matchers opcionales (eventTypeCode, vendorProfileId). Sin
// `Date.now`, sin `Math.random` y sin orden de ejecución. Los raw prompts NUNCA forman parte de la key.
import type { AiFeatureType } from '../../../domain/ai-features.js';

export interface MockFixtureKey {
  feature: AiFeatureType;
  languageCode: string;
  promptVersionId: string;
  scenarioSeed: string;
  eventTypeCode?: string;
  vendorProfileId?: string;
}

const SEP = '|';

/** Serializa la key a un string estable y comparable (deep-equal input → misma key). */
export function buildFixtureKey(key: MockFixtureKey): string {
  return [
    key.feature,
    key.languageCode,
    key.promptVersionId,
    key.scenarioSeed,
    key.eventTypeCode ?? '',
    key.vendorProfileId ?? '',
  ].join(SEP);
}

/**
 * Deriva la `MockFixtureKey` desde el request del puerto. El puerto operativo (US-117 Opción B) sólo
 * transporta `feature`, `input` y `languageCode`; `promptVersionId`/`scenarioSeed`/matchers se leen de
 * hooks opcionales del input (`__promptVersionId`, `__scenarioSeed`, `eventTypeCode`, `vendorProfileId`)
 * con defaults deterministas. No se incluye ningún contenido sensible en la key.
 */
export function fixtureKeyFromRequest(feature: AiFeatureType, languageCode: string, input: Record<string, unknown>): MockFixtureKey {
  const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
  return {
    feature,
    languageCode,
    promptVersionId: str(input.__promptVersionId) ?? 'v1',
    scenarioSeed: str(input.__scenarioSeed) ?? 'default',
    eventTypeCode: str(input.eventTypeCode),
    vendorProfileId: str(input.vendorProfileId),
  };
}
