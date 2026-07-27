import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * DescriptionList — pares etiqueta/valor con semántica `dl` / `dt` / `dd`.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §13 y §37.
 * Referencia visual: screen Stitch *Data & Overlays* («Event Summary» dentro del panel de tabs).
 *
 * Se usa `dl` y no un grid de `div`s porque la relación etiqueta→valor es lo único que permite
 * a un lector de pantalla anunciar «Moneda principal: GTQ» en vez de dos textos sueltos.
 * El texto permanece seleccionable y copiable: no se convierte en `<button>` ni se trunca.
 */
export type DescriptionListColumns = 1 | 2;

export interface DescriptionListProps {
  /** Columnas en desktop. En móvil siempre colapsa a una (`Component Foundations` §36). */
  columns?: DescriptionListColumns;
  compact?: boolean;
  /** Separadores entre filas: útil en listas largas de metadatos. */
  dividers?: boolean;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

const COLUMNS: Record<DescriptionListColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
};

export function DescriptionList({
  columns = 1,
  compact = false,
  dividers = false,
  className,
  children,
  'data-testid': testId,
}: DescriptionListProps): React.JSX.Element {
  return (
    <dl
      data-testid={testId}
      data-columns={columns}
      className={cx(
        'grid',
        COLUMNS[columns],
        compact ? 'gap-x-6 gap-y-2' : 'gap-x-6 gap-y-4',
        dividers && '[&>div]:border-b [&>div]:border-subtle [&>div]:pb-2',
        className,
      )}
    >
      {children}
    </dl>
  );
}

export interface DescriptionListItemProps {
  /** Etiqueta ya traducida. */
  term: ReactNode;
  /** Valor. Puede ser texto, `CurrencyDisplay`, `StatusBadge`… */
  children?: ReactNode;
  /**
   * Texto que sustituye al valor cuando no hay dato (`—`, `Sin definir`). Se usa cuando
   * `children` está vacío: una `<dd>` vacía deja al lector de pantalla sin respuesta.
   */
  emptyText?: ReactNode;
  /** Alinea el valor a la derecha (montos, cantidades). */
  numeric?: boolean;
  className?: string;
}

export function DescriptionListItem({
  term,
  children,
  emptyText,
  numeric = false,
  className,
}: DescriptionListItemProps): React.JSX.Element {
  const hasValue = children !== undefined && children !== null && children !== '';

  return (
    // `<div>` es un hijo válido de `<dl>` en HTML5 y mantiene juntos el par en el grid.
    <div className={cx('min-w-0', className)}>
      <dt className="font-ui text-caption text-muted">{term}</dt>
      <dd
        className={cx(
          'mt-0.5 min-w-0 break-words font-body text-body-sm',
          hasValue ? 'text-primary' : 'text-muted',
          numeric && 'tabular-nums',
        )}
      >
        {hasValue ? children : emptyText}
      </dd>
    </div>
  );
}
