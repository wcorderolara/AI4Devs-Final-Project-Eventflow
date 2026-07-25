import { cx } from '../internal/cx';

/**
 * ProgressIndicator — progreso determinado o indeterminado.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §25.
 *
 * - **Determinate**: `role="progressbar"` con `aria-valuenow` / `aria-valuemin` / `aria-valuemax`.
 * - **Indeterminate**: se omite `aria-valuenow` (WAI-ARIA) y **no** se inventa un porcentaje —
 *   «Do not show fake percentages for unknown operations».
 * - El label visible es obligatorio: el progreso nunca se comunica sólo con la barra.
 * - `valueText` permite un texto no porcentual (`18 de 30 tareas`) formateado por el consumidor
 *   con `Intl` — el design system no formatea números ni conoce el locale.
 */
export type ProgressIndicatorSize = 'sm' | 'md';

export interface ProgressIndicatorProps {
  /** Label visible ya traducido. También es el nombre accesible de la barra. */
  label: string;
  /** Valor actual. Ausente ⇒ indeterminado. */
  value?: number;
  min?: number;
  max?: number;
  /** Texto que acompaña al valor (`75 %`, `18 de 30 tareas`). Se expone como `aria-valuetext`. */
  valueText?: string;
  size?: ProgressIndicatorSize;
  /** Nota secundaria bajo la barra. */
  description?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

const SIZE: Record<ProgressIndicatorSize, string> = { sm: 'h-1.5', md: 'h-2' };

export function ProgressIndicator({
  label,
  value,
  min = 0,
  max = 100,
  valueText,
  size = 'md',
  description,
  className,
  'data-testid': testId,
}: ProgressIndicatorProps): React.JSX.Element {
  const indeterminate = value === undefined || Number.isNaN(value);
  const span = max - min;
  const ratio = indeterminate || span <= 0 ? 0 : (value - min) / span;
  const percent = Math.max(0, Math.min(100, ratio * 100));

  return (
    <div className={cx('w-full', className)} data-testid={testId}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-ui text-label font-medium text-secondary">{label}</span>
        {valueText ? (
          <span className="font-ui text-body-sm font-semibold tabular-nums text-primary">
            {valueText}
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={indeterminate ? undefined : min}
        aria-valuemax={indeterminate ? undefined : max}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuetext={indeterminate ? undefined : valueText}
        aria-busy={indeterminate || undefined}
        className={cx('mt-2 w-full overflow-hidden rounded-badge bg-surface-disabled', SIZE[size])}
      >
        <span
          className={cx(
            'block h-full rounded-badge bg-action-primary transition-[width] duration-standard ease-standard',
            indeterminate && 'animate-pulse motion-reduce:animate-none',
          )}
          style={{ width: indeterminate ? '100%' : `${percent}%` }}
        />
      </div>
      {description ? <p className="mt-1 text-caption text-muted">{description}</p> : null}
    </div>
  );
}
