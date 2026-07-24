// US-132 / PB-P2-020 — Guard estructural: verifica que TODAS las compuertas obligatorias de
// Doc 20 §22 están cableadas en los workflows de GitHub Actions (QA-001; AC-01/AC-02;
// EC-01/NT-02 · VR-03 "compuerta requerida ausente = fail-fast, NO cuenta como verde").
//
// Diseño: el suite lee los YAML crudos de `.github/workflows/{pr,web-ci,ci}.yml` (no los parsea
// como YAML — grep textual es más robusto contra reformats de campos triviales). Para cada gate
// del catálogo canónico verifica ≥1 marcador identificatorio en algún workflow.
//
// El fallo del suite se refleja en el propio job `test-backend` de `pr.yml` — bloqueando el merge
// si alguien retira/renombra un gate sin actualizar el catálogo aquí. Cierra el escenario
// "gate ausente = falso-verde" (VR-03 · NT-02) de forma verificable en código.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Raíz del repo desde `backend/tests/schema/` (3 niveles arriba).
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

function readWorkflow(name: 'pr' | 'web-ci' | 'ci'): string {
  return readFileSync(join(REPO_ROOT, '.github', 'workflows', `${name}.yml`), 'utf8');
}

/** Catálogo canónico Doc 20 §22 — cada entrada define el nombre del gate y ≥1 marcador que
 * debe aparecer en algún workflow. La lista es exhaustiva; agregarle un gate exige actualizar
 * también `.github/CI-QUALITY-GATES.md` (DOC-001). */
const CANONICAL_GATES = [
  { gate: 'lint',                markers: ['npm run lint'],                    workflow: 'pr' as const },
  { gate: 'typecheck',           markers: ['npm run typecheck'],               workflow: 'pr' as const },
  { gate: 'unit + integration',  markers: ['npm test'],                         workflow: 'pr' as const },
  { gate: 'coverage ≥ threshold', markers: ['npm run test:coverage'],           workflow: 'pr' as const },
  { gate: 'build backend (docker)', markers: ['docker build -t eventflow-backend'], workflow: 'pr' as const },
  { gate: 'build frontend (next)', markers: ['npm run build'],                   workflow: 'pr' as const },
  { gate: 'migrations validate (drift + smoke)', markers: ['db:migrate:diff', 'test:integration:smoke'], workflow: 'pr' as const },
  { gate: 'contract (MSW · frontend)', markers: ['src/tests/contract'],         workflow: 'pr' as const },
  { gate: 'A11Y (axe · frontend)', markers: ['src/tests/a11y'],                 workflow: 'pr' as const },
  { gate: 'RBAC negativa (backend)', markers: ['us130'],                        workflow: 'pr' as const },
  { gate: 'IA con MockAIProvider (backend)', markers: ['LLM_PROVIDER: mock'],   workflow: 'pr' as const },
  { gate: 'E2E smoke (PR)',       markers: ['test:e2e:smoke'],                  workflow: 'web-ci' as const },
  { gate: 'E2E full (release/push a main)', markers: ['npm run test:e2e'],      workflow: 'web-ci' as const },
  { gate: 'schema validate (prisma)', markers: ['npm run db:validate'],         workflow: 'ci' as const },
  { gate: 'seed idempotency',      markers: ['npm run seed'],                    workflow: 'ci' as const },
  { gate: 'secret scan (schema · gitleaks)', markers: ['gitleaks/gitleaks-action'], workflow: 'ci' as const },
  { gate: 'openapi drift',         markers: ['npm run openapi:check'],           workflow: 'ci' as const },
] as const;

describe('US-132 QA-001 — guard estructural: gates de Doc 20 §22 cableados en workflows', () => {
  const workflows = {
    pr: readWorkflow('pr'),
    'web-ci': readWorkflow('web-ci'),
    ci: readWorkflow('ci'),
  } as const;

  it.each(CANONICAL_GATES.map((g) => [g.gate, g] as const))(
    'gate "%s" está cableado en el workflow esperado',
    (_label, g) => {
      const yaml = workflows[g.workflow];
      const missing = g.markers.filter((m) => !yaml.includes(m));
      expect(
        missing,
        `Gate "${g.gate}" ausente/renombrado en .github/workflows/${g.workflow}.yml — ` +
          `marcadores esperados: ${g.markers.join(', ')}. ` +
          `Doc 20 §22 exige que la ausencia se trate como FAIL-FAST (VR-03/NT-02), no como verde.`,
      ).toEqual([]);
    },
  );

  it('cada workflow declara `on: pull_request` para gates en PR (bloquea merge cuando rojos)', () => {
    const prYaml = workflows.pr;
    const webYaml = workflows['web-ci'];
    // `pr.yml` debe correr en pull_request a main; `web-ci.yml` en pull_request path-filtered.
    expect(prYaml).toMatch(/pull_request:[\s\S]*?branches:\s*\[[^\]]*main/);
    expect(webYaml).toMatch(/pull_request:/);
  });

  it('la lista canónica está sincronizada con la documentación (DOC-001)', () => {
    const doc = readFileSync(join(REPO_ROOT, '.github', 'CI-QUALITY-GATES.md'), 'utf8');
    // El doc menciona explícitamente cada gate por su nombre canónico — evita drift silencioso.
    // Normalización: strip de markdown (`**`) y colapso de espacios porque los nombres del catálogo
    // aparecen bolded en la matriz del doc.
    const stripped = doc.replace(/\*\*/g, '').replace(/\s+/g, ' ');
    const missing = CANONICAL_GATES.map((g) => g.gate).filter((name) => {
      const normalized = name.replace(/\s+/g, ' ');
      return !stripped.includes(normalized);
    });
    expect(
      missing,
      `Gates ausentes en CI-QUALITY-GATES.md: ${missing.join(', ')}. ` +
        `DOC-001 debe reflejar exactamente el catálogo del guard.`,
    ).toEqual([]);
  });
});
