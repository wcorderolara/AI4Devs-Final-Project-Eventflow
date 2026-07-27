'use client';

import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * ResponsiveTable — una sola fuente de datos, dos presentaciones.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §23 («Mobile: transformar a
 * lista de cards apiladas cuando el patrón lo permita») y §36. Referencia visual: screen Stitch
 * *Data & Overlays* — la tabla de escritorio pivota a cards de resumen en móvil.
 *
 * **Por qué no vive dentro de `Table`:** duplicar DOM automáticamente dentro de la primitiva
 * obligaría a toda tabla a pagar el coste, y el resumen móvil no es una traducción mecánica de
 * las columnas — decide qué datos son críticos. Aquí el feature aporta explícitamente el
 * renderizador móvil y **la misma lista `items`**: no hay segunda consulta ni segundo modelo.
 *
 * Las dos vistas son **mutuamente excluyentes por CSS** (`hidden` = `display:none`), de modo que
 * en cualquier viewport sólo una está en el árbol de accesibilidad y sólo un juego de controles
 * es alcanzable por teclado.
 */
export type ResponsiveTableBreakpoint = 'md' | 'lg';

export interface ResponsiveTableProps<TItem> {
  /** Fuente única de datos: la misma lista alimenta la tabla y las cards. */
  items: readonly TItem[];
  getRowKey: (item: TItem, index: number) => string;
  /** La `<Table>` completa (vista de escritorio). */
  children: ReactNode;
  /** Card de resumen para móvil. Debe exponer los datos críticos, no un subconjunto arbitrario. */
  renderSummary: (item: TItem, index: number) => ReactNode;
  /** Nombre accesible de la lista de resúmenes, ya traducido. */
  summaryLabel: string;
  /** Ancho a partir del cual se muestra la tabla. */
  breakpoint?: ResponsiveTableBreakpoint;
  className?: string;
  'data-testid'?: string;
}

const TABLE_VIEW: Record<ResponsiveTableBreakpoint, string> = {
  md: 'hidden md:block',
  lg: 'hidden lg:block',
};

const SUMMARY_VIEW: Record<ResponsiveTableBreakpoint, string> = {
  md: 'flex flex-col gap-3 md:hidden',
  lg: 'flex flex-col gap-3 lg:hidden',
};

export function ResponsiveTable<TItem>({
  items,
  getRowKey,
  children,
  renderSummary,
  summaryLabel,
  breakpoint = 'md',
  className,
  'data-testid': testId,
}: ResponsiveTableProps<TItem>): React.JSX.Element {
  return (
    <div className={className} data-testid={testId}>
      <div data-view="table" className={TABLE_VIEW[breakpoint]}>
        {children}
      </div>
      <ul data-view="summary" aria-label={summaryLabel} className={SUMMARY_VIEW[breakpoint]}>
        {items.map((item, index) => (
          <li key={getRowKey(item, index)}>{renderSummary(item, index)}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Fila de datos de la card de resumen móvil: etiqueta + valor. Mantiene la correspondencia
 * visual con las columnas de la tabla sin recurrir a un `<table>` de una sola fila.
 */
export function ResponsiveSummaryRow({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cx('flex items-baseline justify-between gap-3', className)}>
      <span className="font-ui text-caption text-muted">{label}</span>
      <span className="min-w-0 text-right font-body text-body-sm text-primary">{children}</span>
    </div>
  );
}
