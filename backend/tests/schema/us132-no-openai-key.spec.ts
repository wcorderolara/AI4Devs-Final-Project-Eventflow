// US-132 / PB-P2-020 — SEC-001. Guard estructural: verifica que ningún workflow de GitHub
// Actions inyecta `OPENAI_API_KEY` como env (VR-04 · SEC-02 · Doc 20 §21). El uso de IA real
// en CI está prohibido — todos los jobs con LLM deben correr con `LLM_PROVIDER=mock` sobre
// `MockAIProvider` (US-119/129).
//
// El guard corre en el propio job `test-backend` de `pr.yml` — si alguien intenta habilitar
// `OPENAI_API_KEY` en un workflow, el suite falla y bloquea el merge antes de que el runner
// llegue a hacer una llamada externa.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const WORKFLOWS_DIR = join(REPO_ROOT, '.github', 'workflows');

function allWorkflows(): Array<{ name: string; content: string }> {
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => ({ name: f, content: readFileSync(join(WORKFLOWS_DIR, f), 'utf8') }));
}

describe('US-132 SEC-001 — guard estructural: sin `OPENAI_API_KEY` en workflows CI', () => {
  const workflows = allWorkflows();

  it.each(workflows.map((w) => [w.name, w] as const))(
    '`%s` no declara `OPENAI_API_KEY` como env/secret',
    (_name, w) => {
      // Prohibido: `OPENAI_API_KEY:` como key (env de step/job/workflow) o `secrets.OPENAI_API_KEY`
      // usado como valor. Regex tolerante a variantes de indentación y comillas.
      const literalEnv = /OPENAI_API_KEY\s*:/;
      const secretsRef = /secrets\.OPENAI_API_KEY/;
      expect(w.content).not.toMatch(literalEnv);
      expect(w.content).not.toMatch(secretsRef);
    },
  );

  it('el job de coverage backend fuerza `LLM_PROVIDER: mock` (VR-04 · SEC-02)', () => {
    const pr = readFileSync(join(WORKFLOWS_DIR, 'pr.yml'), 'utf8');
    // La aserción es sobre la línea exacta — misma forma que Docs y comentarios existentes.
    expect(pr).toMatch(/LLM_PROVIDER:\s*mock/);
  });
});
