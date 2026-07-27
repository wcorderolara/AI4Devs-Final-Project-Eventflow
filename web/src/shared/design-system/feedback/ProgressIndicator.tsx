'use client';

import { useId } from 'react';
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
 *
 * PB-P2-030 (normalización): el valor se **acota al rango también en la capa accesible**. Antes
 * sólo se acotaba el ancho visual, de modo que `value={250} max={100}` exponía
 * `aria-valuenow="250"` — un valor fuera de `[aria-valuemin, aria-valuemax]` que WAI-ARIA declara
 * inválido y que los lectores de pantalla anuncian de forma impredecible. `description` pasa
 * además a asociarse con la barra vía `aria-describedby`.
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
  const descriptionId = useId();
  const indeterminate = value === undefined || !Number.isFinite(value);
  // Un rango invertido o degenerado (`max <= min`) no puede describir progreso: se trata como
  // indeterminado en lugar de dividir por cero o exponer un rango inválido.
  const span = max - min;
  const validRange = Number.isFinite(min) && Number.isFinite(max) && span > 0;
  const determinate = !indeterminate && validRange;
  // `aria-valuenow` debe caer dentro de `[aria-valuemin, aria-valuemax]`: se acota igual que el
  // ancho visual para que ambas señales digan lo mismo.
  const clamped = determinate ? Math.max(min, Math.min(max, value)) : undefined;
  const percent = determinate ? ((clamped as number) - min) / span : 0;

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
        aria-valuemin={determinate ? min : undefined}
        aria-valuemax={determinate ? max : undefined}
        aria-valuenow={clamped}
        aria-valuetext={determinate ? valueText : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={!determinate || undefined}
        className={cx('mt-2 w-full overflow-hidden rounded-badge bg-surface-disabled', SIZE[size])}
      >
        <span
          className={cx(
            'block h-full rounded-badge bg-action-primary transition-[width] duration-standard ease-standard',
            !determinate && 'animate-pulse motion-reduce:animate-none',
          )}
          style={{ width: determinate ? `${percent * 100}%` : '100%' }}
        />
      </div>
      {description ? (
        <p id={descriptionId} className="mt-1 text-caption text-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
