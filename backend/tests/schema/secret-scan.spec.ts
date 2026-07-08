import { describe, it, expect } from 'vitest';
import { schema } from './helpers.js';

// SEC-001 — Secret scan defensivo sobre prisma/schema.prisma (SEC-01, SEC-02, SEC-03).
describe('SEC-001: secret scan del schema', () => {
  it('no contiene una asignación literal de DATABASE_URL', () => {
    // Permitido: env("DATABASE_URL"). Prohibido: DATABASE_URL = "postgresql://...".
    expect(schema).not.toMatch(/DATABASE_URL\s*=\s*["']/);
  });

  it('usa env("DATABASE_URL") en el datasource', () => {
    expect(schema).toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
  });

  it('no contiene cadenas de conexión postgres embebidas fuera de env()', () => {
    const conns = [...schema.matchAll(/postgres(?:ql)?:\/\/[^\s"']+/g)].map((m) => m[0]);
    expect(conns, `cadena de conexión embebida: ${conns.join(', ')}`).toHaveLength(0);
  });

  it('no contiene patrones de secretos/API keys hardcodeados', () => {
    const patterns = [
      /sk-[a-zA-Z0-9]{16,}/, // OpenAI-style
      /AKIA[0-9A-Z]{16}/, // AWS access key
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // private key
      /password\s*=\s*["'][^"']+["']/i, // password literal
    ];
    for (const p of patterns) {
      expect(schema, `patrón sospechoso: ${p}`).not.toMatch(p);
    }
  });
});
