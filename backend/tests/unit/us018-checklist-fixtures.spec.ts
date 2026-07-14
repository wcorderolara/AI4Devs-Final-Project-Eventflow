// US-018 / AI-002 — fixtures deterministas de checklist por idioma soportado.
// AC-02 (idioma respetado) + AC-04 (agrupación por fase T-x). No red, no BD.
import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { SUPPORTED_LANGUAGES } from '../../src/shared/constants/languages.js';

const provider = new MockAIProvider();

type ChecklistOutput = {
  tasks: Array<{
    title: string;
    description: string;
    category: string;
    due_relative_days: number;
    phase: 'T-180' | 'T-90' | 'T-30' | 'T-7' | 'T-1';
    priority: 'low' | 'medium' | 'high';
  }>;
};

describe('US-018 AC-02/AC-04 — checklist por idioma soportado', () => {
  it.each(SUPPORTED_LANGUAGES)(
    'idioma %s retorna checklist estructurado válido y determinista',
    async (languageCode) => {
      const r1 = await provider.generate({ feature: 'checklist', input: { x: 1 }, languageCode });
      const r2 = await provider.generate({ feature: 'checklist', input: { x: 1 }, languageCode });
      expect(r1.output).toEqual(r2.output); // determinismo
      expect(OUTPUT_SCHEMAS.checklist.safeParse(r1.output).success).toBe(true);
      const output = r1.output as ChecklistOutput;
      expect(output.tasks.length).toBeGreaterThanOrEqual(5);
      // AC-04: al menos una tarea por cada fase T-x posible en el rango completo.
      const phases = new Set(output.tasks.map((t) => t.phase));
      expect(phases.size).toBeGreaterThanOrEqual(4);
    },
  );

  it('cada idioma tiene tareas distintas (variación por locale)', async () => {
    const summaries = await Promise.all(
      SUPPORTED_LANGUAGES.map(async (languageCode) => {
        const r = await provider.generate({ feature: 'checklist', input: { x: 1 }, languageCode });
        return (r.output as ChecklistOutput).tasks[0]?.title ?? '';
      }),
    );
    const unique = new Set(summaries);
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it('consistencia phase ↔ due_relative_days: T-180 → 91..180, T-90 → 31..90, T-30 → 8..30, T-7 → 2..7, T-1 → 0..1', async () => {
    const r = await provider.generate({ feature: 'checklist', input: { x: 1 }, languageCode: 'es-LATAM' });
    const rangesByPhase: Record<string, [number, number]> = {
      'T-180': [91, 180],
      'T-90': [31, 90],
      'T-30': [8, 30],
      'T-7': [2, 7],
      'T-1': [0, 1],
    };
    for (const task of (r.output as ChecklistOutput).tasks) {
      const range = rangesByPhase[task.phase];
      expect(range).toBeDefined();
      const [min, max] = range as [number, number];
      expect(task.due_relative_days).toBeGreaterThanOrEqual(min);
      expect(task.due_relative_days).toBeLessThanOrEqual(max);
    }
  });
});
