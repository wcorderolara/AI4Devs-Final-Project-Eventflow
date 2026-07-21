// US-080 / QA-004 — Test arquitectónico: verifica que el módulo `admin-actions` NO expone
// verbos de escritura y que el UseCase NO invoca `adminAction.create` (AC-03 inmutabilidad
// arquitectónica + AC-04 self-log evitado).
//
// Estrategia:
//   1) Inspecciona `admin-actions.routes.ts` — solo debe haber `.get(` sobre el router;
//      NO `.post(`, `.patch(`, `.delete(` (los guards `use()` son válidos).
//   2) Inspecciona `list-admin-actions.use-case.ts` — no debe contener el patrón
//      `adminAction.create(` (paridad Decisión PO D6 · AC-04).
//   3) `app.ts` debe montar el router bajo `/admin/admin-actions`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../src');

describe('US-080 / QA-004 — inmutabilidad arquitectónica del visor AdminAction', () => {
  it('AC-03: `admin-actions.routes.ts` SOLO usa `.get` (0 POST/PATCH/DELETE)', () => {
    const source = readFileSync(
      resolve(srcDir, 'modules/admin-governance/interface/admin-actions.routes.ts'),
      'utf-8',
    );
    // El router puede contener `router.use(...)` para guards; solo verificamos verbos HTTP.
    expect(source).toMatch(/adminActionsRouter\.get\s*\(/);
    // Verbos prohibidos: no debe aparecer NINGUNO de estos patrones sobre el router.
    expect(source).not.toMatch(/adminActionsRouter\.post\s*\(/);
    expect(source).not.toMatch(/adminActionsRouter\.patch\s*\(/);
    expect(source).not.toMatch(/adminActionsRouter\.delete\s*\(/);
    expect(source).not.toMatch(/adminActionsRouter\.put\s*\(/);
  });

  it('AC-04: `list-admin-actions.use-case.ts` NO invoca `adminAction.create` (self-log evitado)', () => {
    const source = readFileSync(
      resolve(srcDir, 'modules/admin-governance/application/list-admin-actions.use-case.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/adminAction\.create\s*\(/);
    // También debe contar con el log estructurado en su lugar.
    expect(source).toMatch(/admin\.admin_actions\.viewed/);
  });

  it('`app.ts` monta el router bajo el path canónico `/admin/admin-actions`', () => {
    const source = readFileSync(resolve(srcDir, 'app.ts'), 'utf-8');
    expect(source).toMatch(/apiV1\.use\(\s*['"]\/admin\/admin-actions['"]\s*,\s*adminActionsRouter\s*\)/);
  });
});
