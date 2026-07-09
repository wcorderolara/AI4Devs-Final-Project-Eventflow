// US-117 / SEC-002, QA-004 — Guard estático del contract layer (PB-P0-009). AC-07 / EC-03 / NT-01 /
// SEC-TS-02. Verifica que el puerto y sus tipos NO importan SDKs concretos (openai, @anthropic-ai/sdk),
// browser APIs ni capas de framework/adapters. Los SDKs concretos sólo pueden vivir en Infrastructure.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const portsDir = resolve(here, '../../src/modules/ai-assistance/ports');

// Archivos del contract layer que deben permanecer libres de SDK/browser/framework.
const CONTRACT_FILES = ['ai-contract.ts', 'llm-provider.ts', 'index.ts', 'ai-recommendation.repository.ts'];

const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bfrom\s+['"]openai['"]/, 'import SDK openai'],
  [/\bfrom\s+['"]@anthropic-ai\/sdk['"]/, 'import SDK @anthropic-ai/sdk'],
  [/\brequire\(\s*['"]openai['"]\s*\)/, 'require SDK openai'],
  [/\brequire\(\s*['"]@anthropic-ai\/sdk['"]\s*\)/, 'require SDK @anthropic-ai/sdk'],
  [/\bwindow\./, 'browser API window'],
  [/\bdocument\./, 'browser API document'],
  [/\blocalStorage\b/, 'browser API localStorage'],
  [/\bnavigator\b/, 'browser API navigator'],
  [/\/(interface|infrastructure)\//, 'import de capa interface/infrastructure'],
];

describe('US-117 AC-07 — el puerto no importa SDKs, browser APIs ni frontend', () => {
  for (const file of CONTRACT_FILES) {
    it(`${file} está libre de imports prohibidos`, () => {
      const src = readFileSync(resolve(portsDir, file), 'utf8');
      for (const [pattern, label] of FORBIDDEN) {
        expect(pattern.test(src), `${file} viola: ${label}`).toBe(false);
      }
    });
  }
});
