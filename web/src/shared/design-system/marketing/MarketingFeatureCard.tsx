import type { ReactNode } from 'react';
import { Card, CardDescription, CardTitle } from '../data-display/Card';
import { cx } from '../internal/cx';

/**
 * MarketingFeatureCard — una capacidad del producto en la landing.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §32 (`FeatureCard`).
 *
 * **No es un segundo sistema de cards**: compone el `Card` canónico del design system, de modo
 * que hereda radio, borde, sombra y —cuando es interactiva— el enlace real con foco visible.
 *
 * El componente no conoce las funcionalidades: `title` y `description` llegan del feature. Los
 * ejemplos de la pantalla Stitch describen capacidades que el MVP no tiene (organización de
 * invitados y mesas, seguimiento continuo del gasto) y **no se codifican aquí**. Validar las
 * afirmaciones es responsabilidad de la página (ver el implementation record, §Product claims).
 */
export interface MarketingFeatureCardProps {
  /** Glifo Lucide. Decorativo: el título ya comunica el significado. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  /** Convierte la card entera en un enlace real (`next/link`), nunca un `div` clicable. */
  href?: string;
  /** Nombre accesible cuando el título por sí solo no distingue la card. */
  ariaLabel?: string;
  /** Destaca la card dentro del grid (borde interactivo y superficie de selección). */
  emphasis?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function MarketingFeatureCard({
  icon,
  title,
  description,
  headingLevel = 3,
  href,
  ariaLabel,
  emphasis = false,
  className,
  'data-testid': testId,
}: MarketingFeatureCardProps): React.JSX.Element {
  // Con `href` sigue siendo una Card navegable. Sin enlace, una capacidad no es un objeto
  // clicable: se presenta como entrada abierta con un hilo superior, no como caja con sombra.
  if (href) {
    return (
      <Card href={href} aria-label={ariaLabel} data-testid={testId} className={cx('group h-full', className)}>
        {icon ? (
          <span aria-hidden="true" className="mb-4 inline-flex text-link [&>svg]:h-icon-lg [&>svg]:w-icon-lg">
            {icon}
          </span>
        ) : null}
        <CardTitle headingLevel={headingLevel}>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </Card>
    );
  }

  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return (
    <div
      aria-label={ariaLabel}
      data-testid={testId}
      className={cx(
        'h-full border-t pt-6',
        emphasis ? 'border-interactive' : 'border-default',
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="mb-4 inline-flex text-link [&>svg]:h-icon-lg [&>svg]:w-icon-lg">
          {icon}
        </span>
      ) : null}
      <Heading className="font-heading text-body-lg font-semibold text-primary">{title}</Heading>
      {description ? (
        <p className="mt-2 font-body text-body-md text-secondary">{description}</p>
      ) : null}
    </div>
  );
}
