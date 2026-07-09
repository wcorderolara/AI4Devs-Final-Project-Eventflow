// US-120 / SEC-001, QA-003 — Guard estático del stub Anthropic (PB-P0-009). AC-03/AC-08 / VR-03/04/05.
// El stub NO debe importar SDK Anthropic, no debe leer `ANTHROPIC_API_KEY` y no debe hacer red externa.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const anthropicDir = resolve(here, '../../src/modules/ai-assistance/infrastructure/providers/anthropic');

const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bfrom\s+['"]@anthropic-ai\/sdk['"]/, 'SDK @anthropic-ai/sdk'],
  [/\brequire\(\s*['"]@anthropic-ai\/sdk['"]\s*\)/, 'require SDK Anthropic'],
  [/\bANTHROPIC_API_KEY\b/, 'secret ANTHROPIC_API_KEY'],
  [/\bfetch\s*\(/, 'llamada fetch (red externa)'],
];

describe('US-120 AC-03/AC-08 — el stub no usa SDK Anthropic, secrets ni red', () => {
  it('los archivos del stub están libres de SDK/secret/red', () => {
    const files = readdirSync(anthropicDir).filter((f) => f.endsWith('.ts')).map((f) => resolve(anthropicDir, f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const [pattern, label] of FORBIDDEN) {
        expect(pattern.test(src), `${file} viola: ${label}`).toBe(false);
      }
    }
  });

  it('el paquete `@anthropic-ai/sdk` no está declarado como dependencia', () => {
    const pkg = JSON.parse(readFileSync(resolve(here, '../../package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['@anthropic-ai/sdk']).toBeUndefined();
    expect(pkg.devDependencies?.['@anthropic-ai/sdk']).toBeUndefined();
  });
});
