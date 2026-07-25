import { cx } from '../internal/cx';

/**
 * Skeleton — placeholder estructural durante la carga.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §28.
 *
 * - Siempre `aria-hidden="true"`: el estado de carga lo comunica la **región contenedora**
 *   (`aria-busy` / `role="status"`), no la decoración.
 * - Debe representar la forma real del contenido, no cuadrados genéricos: de ahí las variantes.
 * - `motion-reduce:animate-none` elimina el shimmer cuando el usuario reduce el movimiento
 *   (UI-DEC-015); el placeholder sigue siendo visible, simplemente estático.
 */
export type SkeletonVariant = 'text' | 'card' | 'listRow' | 'tableRow' | 'navItem';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Número de repeticiones (p. ej. 5 filas de tabla). */
  count?: number;
  className?: string;
  'data-testid'?: string;
}

const BLOCK = 'rounded bg-surface-disabled animate-pulse motion-reduce:animate-none';

function Block({ className }: { className: string }): React.JSX.Element {
  return <span className={cx('block', BLOCK, className)} />;
}

const SHAPES: Record<SkeletonVariant, () => React.JSX.Element> = {
  text: () => <Block className="h-4 w-full" />,
  card: () => (
    <span className="block space-y-3 rounded-card border border-subtle bg-surface p-4">
      <Block className="h-5 w-1/2" />
      <Block className="h-4 w-full" />
      <Block className="h-4 w-4/5" />
    </span>
  ),
  listRow: () => (
    <span className="flex items-center gap-3 py-2">
      <Block className="h-icon-lg w-icon-lg shrink-0 rounded-badge" />
      <span className="flex-1 space-y-2">
        <Block className="h-4 w-2/5" />
        <Block className="h-3 w-3/5" />
      </span>
    </span>
  ),
  tableRow: () => (
    <span className="flex items-center gap-4 border-b border-subtle py-3">
      <Block className="h-4 w-1/4" />
      <Block className="h-4 w-1/4" />
      <Block className="h-4 w-1/6" />
      <Block className="h-4 w-1/6" />
    </span>
  ),
  navItem: () => (
    <span className="flex items-center gap-3 px-3 py-2">
      <Block className="h-icon-sm w-icon-sm shrink-0" />
      <Block className="h-4 w-2/3" />
    </span>
  ),
};

export function Skeleton({
  variant = 'text',
  count = 1,
  className,
  'data-testid': testId,
}: SkeletonProps): React.JSX.Element {
  const shape = SHAPES[variant];
  const rows = Math.max(1, count);

  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      data-variant={variant}
      className={cx('block space-y-2', className)}
    >
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="block">
          {shape()}
        </span>
      ))}
    </span>
  );
}
