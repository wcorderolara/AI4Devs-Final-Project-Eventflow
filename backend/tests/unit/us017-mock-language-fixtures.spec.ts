// US-017 / AI-002 — fixtures deterministas de event_plan por idioma soportado.
// AC-02 (idioma respetado) + AC-01 (plan estructurado). No red, no BD.
import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { SUPPORTED_LANGUAGES } from '../../src/shared/constants/languages.js';

const provider = new MockAIProvider();

type EventPlanOutput = {
  summary: string;
  phases: { name: string; tasks: string[] }[];
};

describe('US-017 AC-02 — event_plan por idioma soportado', () => {
  it.each(SUPPORTED_LANGUAGES)(
    'idioma %s retorna un plan estructurado válido y determinista',
    async (languageCode) => {
      const r1 = await provider.generate({ feature: 'event_plan', input: { x: 1 }, languageCode });
      const r2 = await provider.generate({ feature: 'event_plan', input: { x: 1 }, languageCode });
      expect(r1.output).toEqual(r2.output); // determinismo
      expect(OUTPUT_SCHEMAS.event_plan.safeParse(r1.output).success).toBe(true);
      const output = r1.output as EventPlanOutput;
      expect(output.summary.length).toBeGreaterThan(0);
      expect(output.phases.length).toBeGreaterThanOrEqual(3);
    },
  );

  it('cada idioma tiene contenido distinto (variación por locale)', async () => {
    const outputs = await Promise.all(
      SUPPORTED_LANGUAGES.map(async (languageCode) => {
        const r = await provider.generate({ feature: 'event_plan', input: { x: 1 }, languageCode });
        return (r.output as EventPlanOutput).summary;
      }),
    );
    const unique = new Set(outputs);
    // Al menos 3 summaries distintos entre los 4 locales soportados.
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });
});
