// US-119 / SEC-001, QA-005 — Guard estático de MockAIProvider (PB-P0-009). AC-06 / VR-04/VR-05.
// El provider mock NO debe importar SDKs de IA, clientes HTTP/red ni requerir secrets. Determinista
// y offline: apto para CI/demo sin OpenAI/Anthropic.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const mockDir = resolve(here, '../../src/modules/ai-assistance/infrastructure/providers/mock');

function mockFiles(): string[] {
  return readdirSync(mockDir).filter((f) => f.endsWith('.ts')).map((f) => resolve(mockDir, f));
}

const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bfrom\s+['"]openai['"]/, 'SDK openai'],
  [/\bfrom\s+['"]@anthropic-ai\/sdk['"]/, 'SDK @anthropic-ai/sdk'],
  [/\bfrom\s+['"]node:https?['"]/, 'cliente HTTP node'],
  [/\bfetch\s*\(/, 'llamada fetch (red)'],
  [/\bOPENAI_API_KEY\b/, 'secret OPENAI_API_KEY'],
  [/\bANTHROPIC_API_KEY\b/, 'secret ANTHROPIC_API_KEY'],
];

describe('US-119 AC-06 — el mock no usa red, SDKs externos ni secrets', () => {
  it('los archivos del mock están libres de red/SDK/secrets', () => {
    for (const file of mockFiles()) {
      const src = readFileSync(file, 'utf8');
      for (const [pattern, label] of FORBIDDEN) {
        expect(pattern.test(src), `${file} viola: ${label}`).toBe(false);
      }
    }
  });
});
