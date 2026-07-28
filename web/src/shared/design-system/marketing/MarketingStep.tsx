import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * MarketingStep — un paso de un flujo **secuencial** en una landing.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §32 (`FeatureCard`), del que
 * se separa a propósito. Un `FeatureCard` cataloga capacidades sin orden; un `MarketingStep`
 * describe un proceso donde **la secuencia es información**: por eso el dispositivo estructural es
 * el ordinal (`01 · 02 · 03`) y no un chip de icono, y por eso los pasos van conectados.
 *
 * No es un segundo sistema de cards: es deliberadamente *sin borde ni sombra* para que contraste
 * con la rejilla de `FeatureCard` que suele venir debajo — dos tratamientos distintos para dos
 * tipos de contenido distintos. Sólo debe usarse dentro de una lista **ordenada**
 * (`MarketingFeatureGrid ordered`), nunca para capacidades sin secuencia.
 *
 * El ordinal se deriva de `index`/`total`; el componente no conoce el copy: `title` y
 * `description` llegan ya traducidos desde el feature.
 */
export interface MarketingStepProps {
  /** Glifo Lucide. Decorativo y subordinado al ordinal: el número ya marca la secuencia. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Posición del paso, base 1. Pinta el ordinal (`1` → «01») y decide si hay conector. */
  index: number;
  /** Total de pasos. El último no dibuja conector hacia la derecha. */
  total: number;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  'data-testid'?: string;
}

export function MarketingStep({
  icon,
  title,
  description,
  index,
  total,
  headingLevel = 3,
  className,
  'data-testid': testId,
}: MarketingStepProps): React.JSX.Element {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const ordinal = String(index).padStart(2, '0');
  const hasConnector = index < total;

  return (
    <div data-testid={testId} className={cx('group relative h-full', className)}>
      {/* Conector hacia el siguiente paso: sólo desktop y nunca en el último. Es la línea que
          convierte tres tarjetas sueltas en un flujo leído de izquierda a derecha. `aria-hidden`
          porque el orden ya lo anuncia el `<ol>`. */}
      {hasConnector ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-14 right-[-1.5rem] top-6 hidden border-t border-dashed border-ai-border/50 lg:block"
        />
      ) : null}

      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="relative z-base inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ai-surface font-heading text-h3 font-semibold text-link ring-1 ring-inset ring-ai-border/50 transition-transform duration-standard ease-standard group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
        >
          {ordinal}
        </span>
        {icon ? (
          <span
            aria-hidden="true"
            className="text-muted [&>svg]:h-icon-md [&>svg]:w-icon-md"
          >
            {icon}
          </span>
        ) : null}
      </div>

      <Heading className="mt-5 font-heading text-body-md font-semibold text-primary">
        {title}
      </Heading>
      {description ? (
        <p className="mt-2 font-body text-body-sm text-secondary">{description}</p>
      ) : null}
    </div>
  );
}
