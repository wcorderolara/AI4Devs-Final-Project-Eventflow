'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cx } from '../internal/cx';

/**
 * Primitivas de tabla — HTML semántico, sin data grid.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §23 (`Table`,
 * `DataTable foundation`) y §37. Referencia visual: screen Stitch *Data & Overlays*
 * («Data Tables (Desktop) vs Summary Cards (Mobile)»).
 *
 * Alcance deliberado (§23 excluye explícitamente lo contrario): **no** hay reordenación ni
 * fijado de columnas, edición tipo hoja de cálculo, selección masiva, agrupación, exportación
 * ni virtualización. El ordenamiento es **controlado**: la primitiva pinta `aria-sort` y el
 * control, pero nunca ordena datos — eso pertenece al servidor o al feature.
 *
 * Las filas nunca se convierten en `div` clicables: la acción vive en una celda de acciones o
 * en un enlace dentro de la celda principal, siempre con nombre accesible.
 */
export type TableAlign = 'start' | 'center' | 'end' | 'numeric';
export type TableDensity = 'comfortable' | 'compact';
export type TableSortDirection = 'ascending' | 'descending' | 'none';

const ALIGN: Record<TableAlign, string> = {
  start: 'text-left',
  center: 'text-center',
  // Cifras y montos comparten alineación a la derecha y numeración tabular: las columnas de
  // dígitos quedan alineadas verticalmente y son comparables de un vistazo.
  end: 'text-right',
  numeric: 'text-right tabular-nums',
};

const CELL_DENSITY: Record<TableDensity, string> = {
  comfortable: 'px-3 py-3',
  compact: 'px-3 py-2',
};

export interface TableProps {
  /**
   * Contexto accesible de la tabla. Se renderiza como `<caption>`; con `captionVisible={false}`
   * (por defecto) queda disponible sólo para tecnologías de asistencia.
   */
  caption?: ReactNode;
  captionVisible?: boolean;
  /** Alternativa a `caption` cuando el nombre ya es visible fuera de la tabla. */
  ariaLabel?: string;
  density?: TableDensity;
  /** Clases del contenedor con scroll horizontal. */
  containerClassName?: string;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

export function Table({
  caption,
  captionVisible = false,
  ariaLabel,
  density = 'comfortable',
  containerClassName,
  className,
  children,
  'data-testid': testId,
}: TableProps): React.JSX.Element {
  return (
    // El scroll horizontal vive en el contenedor, no en la página: una tabla ancha nunca provoca
    // scroll horizontal del documento (WCAG 1.4.10 reflow).
    <div className={cx('w-full overflow-x-auto', containerClassName)}>
      <table
        aria-label={ariaLabel}
        data-testid={testId}
        data-density={density}
        className={cx('w-full min-w-full border-collapse font-body text-body-sm', className)}
      >
        {caption !== undefined ? (
          <caption
            className={
              captionVisible ? 'mb-2 text-left font-ui text-body-sm text-secondary' : 'sr-only'
            }
          >
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  return <thead className={cx('bg-surface-subtle', className)}>{children}</thead>;
}

export function TableBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  return <tbody className={cx('divide-y divide-separator', className)}>{children}</tbody>;
}

export interface TableRowProps {
  /** Resalta la fila al pasar el cursor cuando contiene un enlace o una acción. */
  interactive?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
  'data-overcommit'?: string;
  tabIndex?: number;
}

export function TableRow({
  interactive = false,
  className,
  children,
  ...rest
}: TableRowProps): React.JSX.Element {
  return (
    <tr
      {...rest}
      className={cx(
        interactive && 'transition-colors duration-fast ease-standard hover:bg-surface-subtle',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export interface TableHeaderCellProps extends Omit<
  ThHTMLAttributes<HTMLTableCellElement>,
  'scope' | 'children' | 'align'
> {
  align?: TableAlign;
  scope?: 'col' | 'row';
  density?: TableDensity;
  /** Activa el control de ordenamiento. El orden lo aplica el consumidor (API controlada). */
  sortable?: boolean;
  sortDirection?: TableSortDirection;
  onSort?: () => void;
  /** Nombre accesible del control de orden, ya traducido (`Ordenar por fecha`). */
  sortLabel?: string;
  children: ReactNode;
}

const SORT_GLYPH: Record<TableSortDirection, ReactNode> = {
  ascending: <ArrowUp aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  descending: <ArrowDown aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  none: <ArrowUpDown aria-hidden="true" className="h-icon-sm w-icon-sm text-muted" />,
};

export function TableHeaderCell({
  align = 'start',
  scope = 'col',
  density = 'comfortable',
  sortable = false,
  sortDirection = 'none',
  onSort,
  sortLabel,
  className,
  children,
  ...rest
}: TableHeaderCellProps): React.JSX.Element {
  return (
    <th
      {...rest}
      scope={scope}
      // `aria-sort` sólo existe cuando la columna es ordenable: anunciarlo en columnas estáticas
      // sería ruido para el lector de pantalla (Component Foundations §23).
      aria-sort={sortable ? sortDirection : undefined}
      className={cx(
        'font-ui text-label font-semibold text-secondary',
        CELL_DENSITY[density],
        ALIGN[align],
        className,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          aria-label={sortLabel}
          className={cx(
            'focus-ring inline-flex items-center gap-1 rounded-button',
            'transition-colors duration-fast ease-standard hover:text-primary',
            align === 'end' || align === 'numeric' ? 'flex-row-reverse' : '',
          )}
        >
          <span>{children}</span>
          {SORT_GLYPH[sortDirection]}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export interface TableCellProps extends Omit<
  TdHTMLAttributes<HTMLTableCellElement>,
  'align' | 'children'
> {
  align?: TableAlign;
  density?: TableDensity;
  /** Renderiza la celda como `<th scope="row">` (encabezado de fila). */
  header?: boolean;
  /** Metadato secundario bajo el contenido principal (ciudad, email, código). */
  description?: ReactNode;
  children?: ReactNode;
}

export function TableCell({
  align = 'start',
  density = 'comfortable',
  header = false,
  description,
  className,
  children,
  ...rest
}: TableCellProps): React.JSX.Element {
  const content = description ? (
    <>
      <span className="block text-primary">{children}</span>
      <span className="mt-0.5 block text-caption text-muted">{description}</span>
    </>
  ) : (
    children
  );

  const classes = cx('align-middle text-primary', CELL_DENSITY[density], ALIGN[align], className);

  if (header) {
    return (
      <th {...rest} scope="row" className={cx(classes, 'font-medium')}>
        {content}
      </th>
    );
  }

  return (
    <td {...rest} className={classes}>
      {content}
    </td>
  );
}

export interface TableStatusRowProps {
  /** Número de columnas de la tabla, para que la celda ocupe la fila completa. */
  colSpan: number;
  /**
   * `true` cuando el estado aparece tras una acción del usuario (filtro, recarga). En el render
   * inicial se deja en `false` para no crear una región viva innecesaria.
   */
  live?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Fila que aloja los estados de carga, vacío y error dentro del `<tbody>`. Mantener el estado
 * dentro de la tabla preserva la semántica: un `EmptyState` colgado fuera del `<table>` deja la
 * tabla anunciada como «tabla con 0 filas» sin explicación.
 */
export function TableStatusRow({
  colSpan,
  live = false,
  className,
  children,
}: TableStatusRowProps): React.JSX.Element {
  return (
    <tr>
      <td colSpan={colSpan} className={cx('p-4', className)}>
        <div role={live ? 'status' : undefined}>{children}</div>
      </td>
    </tr>
  );
}
