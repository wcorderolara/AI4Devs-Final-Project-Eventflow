// US-130 / PB-P2-018 — OPS-001. Gate de cobertura de endpoints sensibles (AC-01, AC-05, VR-01,
// EC-01). Verifica estáticamente que TODO endpoint sensible del registry `PROTECTED_ENDPOINTS`
// (US-112) tiene ≥1 caso negativo cableado en la suite de tests API. El gate falla si un
// endpoint del registry no está referenciado por ningún archivo `tests/api/*.spec.ts`.
//
// Corre siempre (DB-free) — así el gate bloquea el merge en CI cuando alguien monta un endpoint
// sensible nuevo sin agregar su caso negativo. Complementa el sweep DB-free de US-112 (que ya
// verifica anónimo → 401 en todos): US-130 exige adicionalmente que exista una prueba wrong-role
// / ownership / assignment / admin correspondiente al `control` declarado.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROTECTED_ENDPOINTS } from '../helpers/protected-endpoints.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));

/** Lee el contenido concatenado de todos los `*.spec.ts` bajo `tests/api/`. */
function loadAllApiSpecs(): string {
  const files = readdirSync(HERE)
    .filter((f) => f.endsWith('.spec.ts'))
    .map((f) => readFileSync(join(HERE, f), 'utf8'));
  return files.join('\n');
}

/** Normaliza un path del registry a un patrón buscable en los tests: reemplaza el placeholder UUID
 * `00000000-0000-4000-8000-000000000000` por el segmento base (sin el UUID) para tolerar cualquier
 * UUID en los specs. Ej. `/api/v1/events/00000000.../ai/event-plan` → `/api/v1/events/` + `/ai/event-plan`. */
function pathTokens(path: string): string[] {
  const parts = path.split('00000000-0000-4000-8000-000000000000');
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

describe('US-130 OPS-001: cobertura estática de endpoints sensibles (PROTECTED_ENDPOINTS)', () => {
  const allSpecs = loadAllApiSpecs();

  it.each(PROTECTED_ENDPOINTS.map((e) => [`${e.method.toUpperCase()} ${e.path}`, e] as const))(
    '%s tiene ≥1 caso negativo cableado en tests/api/',
    (_label, e) => {
      const tokens = pathTokens(e.path);
      const missing = tokens.filter((t) => !allSpecs.includes(t));
      expect(
        missing,
        `Endpoint sensible sin caso negativo: ${e.method.toUpperCase()} ${e.path} (module=${e.module}, control=${e.control}). ` +
          `Agrega una prueba en tests/api/us130-*.spec.ts o en la suite de dominio correspondiente ` +
          `(us09{4,5,6,7}-security.spec.ts / us112-negative-rbac-ownership.spec.ts).`,
      ).toEqual([]);
    },
  );

  it('el registry `PROTECTED_ENDPOINTS` no está vacío y crece de forma consciente', () => {
    // Baseline US-112 (37 entradas). El gate deja crecer, pero si alguien lo vacía o duplica,
    // esta aserción atrapa la regresión (dedupe por método+path).
    expect(PROTECTED_ENDPOINTS.length).toBeGreaterThanOrEqual(37);
    const dedup = new Set(PROTECTED_ENDPOINTS.map((e) => `${e.method} ${e.path}`));
    expect(dedup.size).toBe(PROTECTED_ENDPOINTS.length);
  });

  it('la matriz cubre los cuatro dominios (auth, role, ownership, assignment)', () => {
    const controls = new Set(PROTECTED_ENDPOINTS.map((e) => e.control.split(':')[0]));
    for (const need of ['auth', 'role', 'ownership', 'assignment']) {
      expect(controls, `dominio ${need} ausente del registry`).toContain(need);
    }
  });
});
