import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * MarketingFeatureGrid — rejilla de capacidades del producto.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §32 (`FeatureCard`: grid
 * 3–4 columnas desktop, 2 tablet, 1 móvil) y §36.
 *
 * Es una composición ligera y **sin datos**: recibe los items ya construidos. Se renderiza como
 * `<ul>`/`<li>` porque un conjunto de capacidades es una lista: el lector de pantalla anuncia
 * cuántas hay antes de recorrerlas.
 *
 * `items-stretch` + `h-full` en las cards mantienen la misma altura aunque un texto traducido
 * ocupe dos líneas más que el resto.
 */
export type MarketingFeatureGridColumns = 2 | 3 | 4;

export interface MarketingFeatureGridProps {
  /** Nombre accesible de la lista, ya traducido. */
  ariaLabel?: string;
  /** Columnas en desktop. Móvil siempre 1; tablet, 2 a partir de 3 columnas. */
  columns?: MarketingFeatureGridColumns;
  /**
   * Renderiza `<ol>` en lugar de `<ul>`. Para conjuntos donde el **orden importa** (los pasos de
   * un flujo): el lector de pantalla anuncia «1 de 3» y no sólo «3 elementos». Un conjunto de
   * capacidades sin secuencia debe seguir siendo `<ul>`.
   */
  ordered?: boolean;
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

const COLUMNS: Record<MarketingFeatureGridColumns, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export function MarketingFeatureGrid({
  ariaLabel,
  columns = 3,
  ordered = false,
  children,
  className,
  'data-testid': testId,
}: MarketingFeatureGridProps): React.JSX.Element {
  const List = ordered ? 'ol' : 'ul';
  return (
    <List
      aria-label={ariaLabel}
      data-testid={testId}
      data-columns={columns}
      className={cx('grid items-stretch gap-6', COLUMNS[columns], className)}
    >
      {children}
    </List>
  );
}

/** Celda de la rejilla. Mantiene la card a altura completa dentro del `<li>`. */
export function MarketingFeatureGridItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return <li className={cx('flex', className)}>{children}</li>;
}
