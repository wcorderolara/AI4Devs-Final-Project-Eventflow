// US-118 / SEC-002, QA-006 — Guard estático: el SDK/cliente concreto de OpenAI sólo puede
// importarse dentro de `infrastructure/providers/openai/` (AC-01/AC-08, VR-06, ADR-AI-001).
// Application, Domain, Ports, Interface y shared NUNCA deben importar el paquete `openai`.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../src');
const ALLOWED_DIR = ['infrastructure', 'providers', 'openai'].join(sep);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const SDK_IMPORT = /\b(?:from\s+['"]openai['"]|require\(\s*['"]openai['"]\s*\))/;

describe('US-118 AC-01/AC-08 — boundary del SDK OpenAI', () => {
  const files = walk(srcDir);

  it('encuentra archivos fuente para escanear', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('el paquete `openai` sólo se importa bajo infrastructure/providers/openai/', () => {
    const offenders = files.filter((f) => SDK_IMPORT.test(readFileSync(f, 'utf8')) && !f.includes(ALLOWED_DIR));
    expect(offenders.map((f) => relative(srcDir, f))).toEqual([]);
  });
});
