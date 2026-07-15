// US-108 QA-005 (post-iteración 2026-07-14) — Chequeos estáticos del cliente HTTP + módulos de
// autenticación FE contra el contrato del backend: `credentials: 'include'` para cookies HTTP-only,
// prohibición absoluta de `localStorage`/`sessionStorage` con tokens/sessionId (SEC-02).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_SRC = resolve(__dirname, '../../../..', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (entry === 'node_modules' || entry === '.next') continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry) && !p.includes('/tests/')) out.push(p);
  }
  return out;
}

describe('US-108 QA-005 — cookie policy en el cliente HTTP (post-iteración)', () => {
  const clientPath = join(WEB_SRC, 'shared/api-client/httpClient.ts');
  const src = readFileSync(clientPath, 'utf8');

  it('AC-08: `credentials: "include"` presente en fetch (para HTTP-only cookies)', () => {
    expect(src).toMatch(/credentials:\s*['"]include['"]/);
  });

  it('AC-07/SEC-02: httpClient NO usa localStorage/sessionStorage', () => {
    expect(src).not.toMatch(/localStorage/);
    expect(src).not.toMatch(/sessionStorage/);
  });

  it('AC-07/SEC-02: shared/ y features/auth/ NO persisten sessionId/token en storage', () => {
    const dirs = [join(WEB_SRC, 'shared'), join(WEB_SRC, 'features/auth')];
    const suspicious: string[] = [];
    for (const dir of dirs) {
      for (const file of walk(dir)) {
        const content = readFileSync(file, 'utf8');
        // Falsos positivos permitidos: `localStorage`/`sessionStorage` en comentarios o dentro
        // de strings de log/documentación. Buscamos patrones de escritura reales.
        if (/(localStorage|sessionStorage)\.(setItem|getItem)/.test(content)) {
          suspicious.push(file);
        }
      }
    }
    expect(suspicious).toEqual([]);
  });
});
