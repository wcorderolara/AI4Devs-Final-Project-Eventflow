// Validación de .env.example (US-089 / SEC-001, OPS-001).
// Cubre SEC-02 (secrets solo en env vars; .env.example sin valores reales) y AC-04
// (todas las variables del schema Zod presentes en .env.example).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { configSchema } from '../../src/config/env.js';

const here = dirname(fileURLToPath(import.meta.url));
const envExample = readFileSync(resolve(here, '../../.env.example'), 'utf8');

/** Parsea `.env.example` a un mapa clave→valor (ignora comentarios y líneas vacías). */
function parseEnvExample(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
}

const parsed = parseEnvExample(envExample);

describe('.env.example (US-089)', () => {
  it('AC-04: contiene todas las variables del schema Zod de config', () => {
    const schemaKeys = Object.keys(configSchema.shape);
    const missing = schemaKeys.filter((k) => !(k in parsed));
    expect(missing).toEqual([]);
  });

  it('SEC-02: las variables sensibles no contienen valores reales (solo placeholders/vacíos)', () => {
    const sensitiveKeys = ['JWT_SECRET', 'CAPTCHA_SECRET', 'OPENAI_API_KEY', 'DATABASE_URL'];
    const placeholderMarkers = /(your_|placeholder|example|localhost|user:password|changeme|xxx|<.+>)/i;
    for (const key of sensitiveKeys) {
      const value = parsed[key] ?? '';
      if (value === '') continue; // vacío es aceptable
      expect(
        placeholderMarkers.test(value),
        `${key} en .env.example parece contener un valor real: "${value}"`,
      ).toBe(true);
    }
  });

  it('SEC-02: no contiene una API key de OpenAI real (patrón sk-...)', () => {
    expect(envExample).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
  });
});
