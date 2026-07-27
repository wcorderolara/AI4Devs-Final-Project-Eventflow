'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Button } from '../actions/Button';
import { Select } from '../forms/Select';
import { cx } from '../internal/cx';

/**
 * Pagination — navegación entre páginas, controlada.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 (`Pagination`) y §24.
 * Referencia visual: screen Stitch *Data & Overlays* (pie de tabla: `Rows per page` + rango +
 * flechas). Stitch aporta la anatomía; el rango `1–10 of 124` es **copy del feature**.
 *
 * Reglas:
 * - **No posee datos.** No hace fetch, no conoce la URL y no inventa límites: recibe `page`,
 *   `totalPages` y devuelve el cambio. El feature decide si eso es `?page=` o estado local.
 * - **No hay rangos inválidos.** Con `totalPages <= 0` no hay página que anunciar: el indicador
 *   se omite y ambas flechas quedan deshabilitadas, en vez de mostrar `1–0 de 0`.
 * - Las flechas conservan su etiqueta textual en el árbol de accesibilidad también en móvil
 *   (`sr-only sm:not-sr-only`): nunca son controles icon-only sin nombre.
 */
export interface PaginationPageSize {
  value: number;
  options: readonly number[];
  onChange: (value: number) => void;
  /** Label visible del selector, ya traducido (`Por página`). */
  label: string;
  /** Nombre accesible del `<select>` si difiere del label visible. */
  ariaLabel?: string;
}

export interface PaginationProps {
  /** Nombre accesible del landmark `<nav>`, ya traducido. */
  ariaLabel: string;
  page: number;
  /** Total de páginas. `0` significa «sin resultados»: no se anuncia ninguna página. */
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  /**
   * Indicador de posición ya interpolado por el feature (`Página 2 de 5`, `11–20 de 124`).
   * Se omite automáticamente cuando no hay resultados.
   */
  summary?: ReactNode;
  /**
   * `true` cuando el indicador debe anunciarse al cambiar de página. En la carga inicial se
   * deja en `false` para no disparar un anuncio redundante.
   */
  live?: boolean;
  pageSize?: PaginationPageSize;
  /** Deshabilita toda la navegación (por ejemplo mientras se recarga la lista). */
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function Pagination({
  ariaLabel,
  page,
  totalPages,
  onPageChange,
  previousLabel,
  nextLabel,
  summary,
  live = false,
  pageSize,
  disabled = false,
  className,
  'data-testid': testId,
}: PaginationProps): React.JSX.Element {
  const selectId = useId();
  const safeTotal = Number.isFinite(totalPages) ? Math.max(0, Math.trunc(totalPages)) : 0;
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), Math.max(1, safeTotal));
  const hasPrevious = safeTotal > 0 && safePage > 1;
  const hasNext = safeTotal > 0 && safePage < safeTotal;

  return (
    <nav
      aria-label={ariaLabel}
      data-testid={testId}
      className={cx(
        'flex flex-col items-stretch gap-3 rounded-card border border-subtle bg-surface px-3 py-2',
        'sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {pageSize ? (
        <div className="flex items-center gap-2">
          <label htmlFor={selectId} className="shrink-0 font-ui text-caption text-secondary">
            {pageSize.label}
          </label>
          <Select
            id={selectId}
            aria-label={pageSize.ariaLabel}
            selectSize="sm"
            fullWidth={false}
            value={String(pageSize.value)}
            disabled={disabled}
            onChange={(event) => pageSize.onChange(Number(event.target.value))}
            options={pageSize.options.map((option) => ({
              value: String(option),
              label: String(option),
            }))}
            className="w-20"
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || !hasPrevious}
          onClick={() => onPageChange(safePage - 1)}
          leadingIcon={<ChevronLeft />}
        >
          <span className="sr-only sm:not-sr-only">{previousLabel}</span>
        </Button>

        {safeTotal > 0 && summary !== undefined ? (
          <span
            role={live ? 'status' : undefined}
            data-testid="pagination-summary"
            className="px-1 text-center font-ui text-body-sm tabular-nums text-secondary"
          >
            {summary}
          </span>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || !hasNext}
          onClick={() => onPageChange(safePage + 1)}
          trailingIcon={<ChevronRight />}
        >
          <span className="sr-only sm:not-sr-only">{nextLabel}</span>
        </Button>
      </div>
    </nav>
  );
}
