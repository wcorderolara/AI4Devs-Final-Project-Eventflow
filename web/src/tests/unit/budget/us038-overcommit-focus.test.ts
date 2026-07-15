// US-038 (PB-P1-022 / QA-001 UT-07/UT-08) — Tests unitarios del hook `useOvercommitFocus`.
// Valida:
//   - UT-07: existe fila con `data-overcommit="true"` ⇒ foco + scrollIntoView sobre esa fila.
//   - UT-08: no hay filas overcommit ⇒ fallback scroll a `[data-budget-items-table]`.
//
// El hook manipula DOM y NO invoca APIs. Usamos JSDOM (default de vitest) y un table de
// utilería para montar el DOM sin renderizar React.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOvercommitFocus } from '@/features/budget/view/hooks/useOvercommitFocus';

function mountTable(html: string): void {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
}

describe('US-038 QA-001 UT-07/UT-08 — useOvercommitFocus', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('UT-07 focus + scrollIntoView sobre la primera fila con data-overcommit="true"', () => {
    mountTable(`
      <table data-budget-items-table>
        <tbody>
          <tr id="row-a" tabindex="-1"><td>A</td></tr>
          <tr id="row-b" data-overcommit="true" tabindex="-1"><td>B</td></tr>
          <tr id="row-c" data-overcommit="true" tabindex="-1"><td>C</td></tr>
        </tbody>
      </table>
    `);
    const scrollSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollSpy;
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const hook = useOvercommitFocus('ev-1');
    hook.focusFirstOvercommitItem();
    // Primera fila con data-overcommit → row-b.
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement?.id).toBe('row-b');
  });

  it('UT-08 sin filas overcommit ⇒ fallback scroll a [data-budget-items-table]', () => {
    mountTable(`
      <table data-budget-items-table>
        <tbody>
          <tr id="row-a"><td>A</td></tr>
        </tbody>
      </table>
    `);
    const scrollSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollSpy;
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const hook = useOvercommitFocus('ev-1');
    hook.focusFirstOvercommitItem();
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('sin DOM ni tabla ⇒ no-op silencioso', () => {
    document.body.innerHTML = '';
    const hook = useOvercommitFocus('ev-1');
    expect(() => hook.focusFirstOvercommitItem()).not.toThrow();
  });
});
