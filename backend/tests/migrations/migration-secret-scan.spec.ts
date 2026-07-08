import { describe, it, expect } from 'vitest';
import { allMigrationSql } from './helpers.js';

/**
 * SEC-001 (AC-06, SEC-01, SEC-02, SEC-03, NT-02) — Ningún archivo en prisma/migrations/
 * debe contener secretos hardcodeados ni cadenas de conexión reales.
 * Complementa el scanner CI (gitleaks, OPS-004) con un test estructural determinista.
 */

/** Patrones de secretos prohibidos. */
const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'asignación DATABASE_URL=', re: /DATABASE_URL\s*=/i },
  // Cadena de conexión postgres con credenciales embebidas (no `env(...)`).
  { label: 'cadena postgresql:// con credenciales', re: /postgres(?:ql)?:\/\/[^\s"']*:[^\s"'@]+@/i },
  { label: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { label: 'GitHub PAT', re: /ghp_[0-9A-Za-z]{20,}/ },
  { label: 'clave privada PEM', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'password= literal', re: /\bpassword\s*=\s*['"][^'"]+['"]/i },
];

describe('SEC-001: prisma/migrations/ no contiene secretos', () => {
  const migrations = allMigrationSql();

  it('hay al menos un archivo migration para escanear', () => {
    expect(migrations.length).toBeGreaterThan(0);
  });

  for (const { file, content } of migrations) {
    describe(file, () => {
      for (const { label, re } of SECRET_PATTERNS) {
        it(`no contiene ${label}`, () => {
          expect(content).not.toMatch(re);
        });
      }
    });
  }
});
