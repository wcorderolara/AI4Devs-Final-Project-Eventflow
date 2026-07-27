import { Skeleton } from '../feedback/Skeleton';
import { cx } from '../internal/cx';

/**
 * AIRecommendationLoading — generación en curso.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §31 (`AILoadingState`) y §28.
 *
 * - **Un solo patrón de carga.** Skeleton con la forma del contenido; no se combina con spinner
 *   ni con barra de progreso a la vez (§31: «no simular %», §28: el placeholder representa la
 *   forma real del contenido).
 * - **Sin porcentaje inventado.** La generación por IA no expone progreso real: mostrar 40 % sería
 *   una cifra fabricada. Lo que sí se puede decir es cuánto puede tardar (`hint`).
 * - El estado accesible lo aporta la región (`role="status"` + nombre), no la decoración: el
 *   `Skeleton` va `aria-hidden`.
 * - `motion-reduce:animate-none` lo aporta el propio `Skeleton`: el placeholder sigue visible,
 *   simplemente deja de latir.
 */
export interface AIRecommendationLoadingProps {
  /** Mensaje visible de generación, ya traducido (`Generando sugerencia…`). */
  label: string;
  /** Expectativa de duración, ya traducida (`Esto puede tomar hasta 60 segundos`). */
  hint?: string;
  /** Número de líneas del placeholder; ajústalo a la forma del contenido real. */
  lines?: number;
  className?: string;
  'data-testid'?: string;
}

export function AIRecommendationLoading({
  label,
  hint,
  lines = 3,
  className,
  'data-testid': testId,
}: AIRecommendationLoadingProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      className={cx('space-y-3', className)}
    >
      <p className="font-ui text-body-sm font-medium text-ai-label">{label}</p>
      {hint ? <p className="font-body text-caption text-secondary">{hint}</p> : null}
      <Skeleton variant="text" count={lines} />
    </div>
  );
}
