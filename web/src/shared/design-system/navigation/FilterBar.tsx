'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../actions/Button';
import { cx } from '../internal/cx';
import { AppliedFilterChip } from './AppliedFilterChip';

/**
 * FilterBar — composición reutilizable de filtros sobre una lista o tabla.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §24 (`FilterBar`) y §36
 * (responsive: los filtros colapsan cuando el ancho no alcanza).
 *
 * - **No conoce ningún filtro de negocio.** Los controles llegan por `children` y se componen con
 *   los componentes de *Actions & Forms* ya implementados (`SearchInput`, `Select`, `MultiSelect`,
 *   `DateInput`, `Checkbox`…). El estado, la serialización y las queries pertenecen al feature.
 * - Layout: una columna en mobile → dos en tablet → tres en desktop; los chips envuelven sin
 *   provocar scroll horizontal de la página.
 * - `collapsible` oculta los controles tras un disclosure en mobile (`aria-expanded` +
 *   `aria-controls`) manteniendo visibles la búsqueda, los chips y las acciones. Un `Drawer` de
 *   filtros completo depende del grupo de overlays, aún no implementado.
 */
export interface AppliedFilter {
  /** Clave estable del filtro aplicado. */
  key: string;
  /** Texto visible ya traducido. */
  label: string;
  /** Nombre accesible del control de quitar, ya traducido e interpolado. */
  removeLabel: string;
  onRemove: () => void;
}

export interface FilterBarProps {
  /** Nombre accesible del formulario, ya traducido. */
  ariaLabel: string;
  /** Control de búsqueda (`SearchInput`). Permanece visible aunque el resto colapse. */
  search?: ReactNode;
  /** Controles de filtro. */
  children?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  applyLabel?: string;
  /** Deshabilita el envío (p. ej. con errores cross-field). */
  applyDisabled?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  /** Filtros activos; se presentan como chips removibles. */
  appliedFilters?: readonly AppliedFilter[];
  /** Nombre accesible del grupo de chips, ya traducido (p. ej. `Filtros aplicados`). */
  appliedLabel?: string;
  /** Contenido extra bajo los controles (errores cross-field, ayudas). */
  footer?: ReactNode;
  /** Colapsa los controles en mobile tras un disclosure. */
  collapsible?: boolean;
  /** Label del disclosure mobile, ya traducido (p. ej. `Filtros`). Requerido si `collapsible`. */
  toggleLabel?: string;
  className?: string;
  'data-testid'?: string;
}

export function FilterBar({
  ariaLabel,
  search,
  children,
  onSubmit,
  applyLabel,
  applyDisabled = false,
  onClear,
  clearLabel,
  appliedFilters,
  appliedLabel,
  footer,
  collapsible = false,
  toggleLabel,
  className,
  'data-testid': testId,
}: FilterBarProps): React.JSX.Element {
  const controlsId = useId();
  const [expanded, setExpanded] = useState(false);
  const chips = appliedFilters ?? [];

  return (
    <form
      onSubmit={onSubmit}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cx(
        'space-y-4 rounded-card border border-subtle bg-surface p-4 shadow-surface-subtle',
        className,
      )}
    >
      {search || (collapsible && toggleLabel) ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {search ? <div className="min-w-0 flex-1">{search}</div> : null}
          {collapsible && toggleLabel ? (
            <Button
              variant="secondary"
              leadingIcon={<SlidersHorizontal />}
              aria-expanded={expanded}
              aria-controls={controlsId}
              onClick={() => setExpanded((open) => !open)}
              className="lg:hidden"
            >
              {toggleLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      {children ? (
        <div
          id={controlsId}
          className={cx(
            'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3',
            // El disclosure sólo aplica por debajo de `lg`: en desktop los filtros están siempre
            // visibles y el botón de colapso permanece oculto.
            collapsible && !expanded && 'hidden lg:grid',
          )}
        >
          {children}
        </div>
      ) : null}

      {footer}

      {chips.length > 0 ? (
        // Lista real: `aria-label` sólo se expone sobre un rol que lo admita, y así el lector de
        // pantalla anuncia cuántos filtros hay aplicados.
        <ul aria-label={appliedLabel} className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.key} className="min-w-0">
              <AppliedFilterChip
                label={chip.label}
                removeLabel={chip.removeLabel}
                onRemove={chip.onRemove}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {applyLabel || clearLabel ? (
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          {onClear && clearLabel ? (
            <Button type="button" variant="secondary" onClick={onClear}>
              {clearLabel}
            </Button>
          ) : null}
          {applyLabel ? (
            <Button type="submit" disabled={applyDisabled}>
              {applyLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
