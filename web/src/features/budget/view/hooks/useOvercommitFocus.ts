// US-038 (PB-P1-022 / FE-001) — Hook helper para el CTA "Editar items".
// Localiza la primera fila con `data-overcommit="true"` dentro del contenedor
// `[data-budget-items-table]`, hace scroll suave y foco programático. Si no hay filas
// overcommit (caso: suma de tolerancias sin fila excedida), fallback a scroll a la tabla
// (AC-04 §Then).
//
// El hook NO invoca APIs; opera exclusivamente sobre el DOM. El `eventId` se acepta por
// firma para permitir extensiones (deep-links, telemetría) sin romper llamadores.
export interface UseOvercommitFocusResult {
  focusFirstOvercommitItem: () => void;
}

export function useOvercommitFocus(_eventId: string): UseOvercommitFocusResult {
  const focusFirstOvercommitItem = (): void => {
    if (typeof document === 'undefined') return;
    const firstRow = document.querySelector('[data-overcommit="true"]');
    if (firstRow instanceof HTMLElement) {
      firstRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstRow.focus({ preventScroll: true });
      return;
    }
    const table = document.querySelector('[data-budget-items-table]');
    if (table instanceof HTMLElement) {
      table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return { focusFirstOvercommitItem };
}
