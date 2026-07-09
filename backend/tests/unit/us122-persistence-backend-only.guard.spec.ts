// US-122 / SEC-004 (AC-02, AC-09) — guard backend-only. Los artefactos de persistencia de US-122 no
// introducen superficie HTTP (Express/router/controller) ni endpoints de accept/edit/discard: la
// persistencia es infraestructura backend consumida por use cases, sin creación directa desde el frontend.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../src/modules/ai-assistance');

const US122_FILES = [
  'application/persist-ai-recommendation.service.ts',
  'application/ai-recommendation-payload-sanitizer.ts',
  'application/ai-recommendation-persist-logger.ts',
  'infrastructure/ai-prompt-version-sync.ts',
  'domain/errors/ai-recommendation-persistence.errors.ts',
];

describe('US-122 SEC-004 — persistencia backend-only sin superficie HTTP', () => {
  it('ningún archivo de US-122 importa express ni define routers/controllers', () => {
    for (const rel of US122_FILES) {
      const src = readFileSync(join(root, rel), 'utf8');
      expect(src).not.toMatch(/from ['"]express['"]/);
      expect(src).not.toMatch(/\bRouter\(\)/);
      expect(src).not.toMatch(/\.(get|post|put|patch|delete)\(['"]\//);
    }
  });

  it('el service no expone accept/edit/discard (HITL downstream fuera de US-122)', () => {
    const src = readFileSync(join(root, 'application/persist-ai-recommendation.service.ts'), 'utf8');
    expect(src).not.toMatch(/\b(accept|edit|discard|reject)Recommendation\b/i);
  });
});
