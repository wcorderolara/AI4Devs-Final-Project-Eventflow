// US-131 / PB-P2-019 — Helper axe-core con umbral de "violaciones críticas" (OPS-001; AC-01).
//
// Doc 20 §a11y define el criterio de rechazo del gate CI: **cualquier violación con
// `impact === 'critical'`** hace fallar el test (VR-02). Otras severidades (`serious`,
// `moderate`, `minor`) se reportan como notas pero NO bloquean el merge — política MVP para
// evitar ruido/falsos positivos (US-131 AC-01 · NFR-A11Y).
//
// El helper es agnóstico del runner (jsdom via Vitest hoy; podría migrarse a Playwright + axe
// en el futuro sin cambiar el contrato). Reutiliza `jest-axe` (ya instalado como devDependency
// desde US-056/061/073) para mantener consistencia con las suites previas.
import { axe } from 'jest-axe';
import type { AxeResults, Result as AxeViolation } from 'axe-core';

/**
 * Ejecuta axe-core sobre un contenedor DOM y devuelve **sólo** las violaciones con
 * `impact === 'critical'`. Las violaciones de otras severidades quedan disponibles en
 * `otherViolations` para inspección/reporte, sin fallar el gate.
 *
 * Uso típico en un test:
 *
 * ```ts
 * const { critical, otherViolations } = await auditA11y(container);
 * expect(critical, formatViolations(critical)).toEqual([]);
 * ```
 *
 * @param container Nodo raíz a auditar (típicamente `render(...).container`).
 * @param options Opciones axe (p. ej. reglas a activar/desactivar).
 * @returns violaciones críticas y no-críticas separadas + resultado completo para trazabilidad.
 */
export async function auditA11y(
  container: Element | string,
  options?: Parameters<typeof axe>[1],
): Promise<{
  critical: AxeViolation[];
  otherViolations: AxeViolation[];
  raw: AxeResults;
}> {
  const raw = (await axe(container, options)) as unknown as AxeResults;
  const critical: AxeViolation[] = [];
  const otherViolations: AxeViolation[] = [];
  for (const v of raw.violations) {
    if (v.impact === 'critical') critical.push(v);
    else otherViolations.push(v);
  }
  return { critical, otherViolations, raw };
}

/**
 * Formatea una lista de violaciones para el mensaje de error del `expect(...).toEqual([])`.
 * Genera un texto legible con `id`, `impact`, `help` y los `target` de cada nodo — suficiente
 * para diagnosticar en CI sin abrir el reporte HTML.
 */
export function formatViolations(violations: AxeViolation[]): string {
  if (violations.length === 0) return 'Sin violaciones (baseline verde)';
  return violations
    .map((v) => {
      const targets = v.nodes
        .map((n) => (Array.isArray(n.target) ? n.target.join(' > ') : String(n.target)))
        .join(' | ');
      return `[${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n  → ${targets}`;
    })
    .join('\n');
}
