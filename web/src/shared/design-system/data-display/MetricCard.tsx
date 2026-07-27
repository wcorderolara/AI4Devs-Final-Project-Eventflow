'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Skeleton } from '../feedback/Skeleton';
import { cx } from '../internal/cx';

/**
 * MetricCard — una métrica operativa con su contexto.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §22 (`MetricCard`) y §13
 * (`NumericValue`). Referencia visual: screen Stitch *Data & Overlays* (grid 3→2→1 con estados
 * default / loading / empty).
 *
 * Reglas:
 * - **La dirección de la tendencia no implica su significado.** «Cancelaciones +12 %» sube y es
 *   malo; «tareas pendientes −12 %» baja y es bueno. Por eso `trend.intent` lo declara el
 *   consumidor y por defecto es `neutral`: el componente nunca lo infiere del signo.
 * - El valor llega **ya formateado** (`Intl`, `CurrencyDisplay`): la card no inventa unidades,
 *   porcentajes ni conversiones.
 * - Sin gráficas: el grupo de charting está fuera del MVP.
 */
export type MetricTrendDirection = 'up' | 'down' | 'flat';
export type MetricTrendIntent = 'positive' | 'negative' | 'neutral';
export type MetricCardState = 'ready' | 'loading' | 'empty' | 'error';

export interface MetricCardTrend {
  direction: MetricTrendDirection;
  /** Texto visible ya formateado por el feature (`12 %`, `+3`). */
  label: ReactNode;
  /** Significado semántico. **No** se deduce del signo (ver nota del componente). */
  intent?: MetricTrendIntent;
  /** Nombre accesible completo cuando el label visible es ambiguo (`sube un 12 %`). */
  ariaLabel?: string;
}

export interface MetricCardProps {
  /** Etiqueta de la métrica, ya traducida. */
  label: ReactNode;
  /** Valor principal ya formateado. Se ignora en `loading` / `empty` / `error`. */
  value?: ReactNode;
  /**
   * Descripción accesible del valor (`24 eventos activos`). Sustituye al texto del número para
   * los lectores de pantalla, que de otro modo leerían sólo la cifra sin unidad.
   */
  valueDescription?: string;
  /** Glifo Lucide decorativo en la esquina de la cabecera. */
  icon?: ReactNode;
  trend?: MetricCardTrend;
  /** Contexto de comparación ya traducido (`vs mes anterior`). */
  comparison?: ReactNode;
  state?: MetricCardState;
  /** Nombre accesible de la región mientras `state="loading"`. */
  loadingLabel?: string;
  /** Copy del estado vacío (`Sin datos aún`). Obligatorio con `state="empty"`. */
  emptyLabel?: ReactNode;
  emptyDescription?: ReactNode;
  /** Copy del estado de error, ya preparado por el feature. Obligatorio con `state="error"`. */
  errorLabel?: ReactNode;
  /** Contenido adicional bajo el valor (desglose, `DescriptionList`, `ProgressIndicator`). */
  children?: ReactNode;
  /** Pie de la card (enlace a la vista completa, nota). */
  footer?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  id?: string;
  className?: string;
  'data-testid'?: string;
}

const TREND_INTENT: Record<MetricTrendIntent, string> = {
  positive: 'text-feedback-success',
  negative: 'text-feedback-error',
  neutral: 'text-secondary',
};

const TREND_GLYPH: Record<MetricTrendDirection, ReactNode> = {
  up: <TrendingUp aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  down: <TrendingDown aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  flat: <Minus aria-hidden="true" className="h-icon-sm w-icon-sm" />,
};

export function MetricCard({
  label,
  value,
  valueDescription,
  icon,
  trend,
  comparison,
  state = 'ready',
  loadingLabel,
  emptyLabel,
  emptyDescription,
  errorLabel,
  children,
  footer,
  headingLevel = 3,
  id,
  className,
  'data-testid': testId,
}: MetricCardProps): React.JSX.Element {
  const generatedId = useId();
  const headingId = `${id ?? generatedId}-label`;
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-busy={state === 'loading' || undefined}
      data-testid={testId}
      data-state={state}
      className={cx(
        'flex flex-col rounded-card border border-subtle bg-surface p-4 shadow-surface-subtle sm:p-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Heading id={headingId} className="font-ui text-label font-medium text-secondary">
          {label}
        </Heading>
        {icon ? (
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 text-muted [&>svg]:h-icon-md [&>svg]:w-icon-md"
          >
            {icon}
          </span>
        ) : null}
      </div>

      {state === 'loading' ? (
        // El nombre accesible de la carga lo aporta la región; el Skeleton es decorativo.
        <div role="status" aria-label={loadingLabel} className="mt-3 space-y-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : null}

      {state === 'empty' ? (
        // Composición interna compacta: un `EmptyState` completo (título + descripción + CTA)
        // desequilibraría un grid de métricas. Ver `EmptyState variant="compact"` para paneles.
        <p className="mt-3 font-body text-body-sm text-muted">
          <span className="block font-medium text-secondary">{emptyLabel}</span>
          {emptyDescription ? <span className="mt-1 block">{emptyDescription}</span> : null}
        </p>
      ) : null}

      {state === 'error' ? (
        <p role="alert" className="mt-3 font-body text-body-sm text-feedback-error">
          {errorLabel}
        </p>
      ) : null}

      {state === 'ready' ? (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              aria-label={valueDescription}
              className="font-heading text-h2 font-semibold tabular-nums text-primary"
            >
              {value}
            </span>
            {trend ? (
              <span
                aria-label={trend.ariaLabel}
                data-trend={trend.direction}
                data-intent={trend.intent ?? 'neutral'}
                className={cx(
                  'inline-flex items-center gap-1 font-ui text-body-sm font-medium',
                  TREND_INTENT[trend.intent ?? 'neutral'],
                )}
              >
                {TREND_GLYPH[trend.direction]}
                <span>{trend.label}</span>
              </span>
            ) : null}
          </div>
          {comparison ? (
            <p className="mt-1 font-body text-caption text-muted">{comparison}</p>
          ) : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </>
      ) : null}

      {footer ? (
        <div className="mt-auto pt-3 font-body text-caption text-muted">{footer}</div>
      ) : null}
    </section>
  );
}
