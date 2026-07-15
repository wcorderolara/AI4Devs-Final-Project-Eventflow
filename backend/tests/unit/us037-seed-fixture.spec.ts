// US-037 (PB-P1-021 / QA-007) — Test unitario del seed fixture. Asegura que la lista de
// features seedeadas incluye `budget_suggestion` (usada por US-037 para la demo end-to-end).
// El chequeo real de que existe una `AIRecommendation pending` + items previos AI en la BD
// vive en QA-002 (integration) cuando la migración esté aplicada.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = resolve(__dirname, '../../src/modules/seed-demo/application/seed-demo-data.use-case.ts');

describe('US-037 QA-007 — seed fixture', () => {
  const src = readFileSync(SEED_FILE, 'utf8');

  it("`SEED_AI_FEATURES` incluye 'budget_suggestion'", () => {
    // El array literal está declarado como `SEED_AI_FEATURES = [ 'checklist', ..., 'budget_suggestion', ... ]`.
    // Buscamos la línea con la entrada.
    expect(src).toMatch(/['"]budget_suggestion['"]/);
  });

  it('agrega el bloque US-037 SEED-001 con AIRecommendation pending', () => {
    expect(src).toMatch(/US-037 SEED-001/);
    expect(src).toMatch(/status:\s*['"]pending['"]/);
    expect(src).toMatch(/kind:\s*['"]budget_suggestion['"]/);
  });

  it('agrega items previos AI (aiRecommendationId) para demoar D2 reemplazo', () => {
    expect(src).toMatch(/aiRecommendationId:\s*acceptedRec\.id/);
    expect(src).toMatch(/label:\s*['"]Salón \(IA previo\)['"]/);
    expect(src).toMatch(/label:\s*['"]Catering \(IA previo\)['"]/);
  });
});
