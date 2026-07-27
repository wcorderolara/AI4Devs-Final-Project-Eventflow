import { useId, type ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * MarketingSection — envoltorio semántico de una sección de landing.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §32 (`ContentSection`).
 *
 * Deliberadamente pobre en API: ancho de contenedor, alineación y fondo. No expone una escala de
 * espaciado configurable — multiplicar props de spacing es cómo un sistema acaba con quince
 * variantes de sección que nadie sabe elegir. El ritmo vertical lo fija el propio componente.
 *
 * Tampoco encaja cada sección en una caja: `background="plain"` es el valor por defecto y una
 * landing con todo enmarcado pierde jerarquía.
 */
export type MarketingSectionBackground = 'plain' | 'subtle' | 'inverse';
export type MarketingSectionAlign = 'start' | 'center';
export type MarketingSectionWidth = 'marketing' | 'content' | 'form';

export interface MarketingSectionProps {
  /**
   * Ancla de la sección. Estable y no traducida: es destino de enlaces del header público.
   * Añade `scroll-mt-header` para que el heading no quede tapado por la barra sticky al saltar.
   */
  id?: string;
  /** Antetítulo ya traducido. Es texto de apoyo, nunca sustituye al heading. */
  eyebrow?: ReactNode;
  heading?: ReactNode;
  /** Nivel del heading. Debe respetar la jerarquía de la página (el `h1` es del hero). */
  headingLevel?: 2 | 3;
  description?: ReactNode;
  children?: ReactNode;
  background?: MarketingSectionBackground;
  align?: MarketingSectionAlign;
  width?: MarketingSectionWidth;
  className?: string;
  'data-testid'?: string;
}

const BACKGROUND: Record<MarketingSectionBackground, string> = {
  plain: '',
  subtle: 'bg-marketing-hero',
  inverse: 'bg-surface-inverse text-inverse',
};

const WIDTH: Record<MarketingSectionWidth, string> = {
  marketing: 'max-w-marketing',
  content: 'max-w-content',
  form: 'max-w-form',
};

export function MarketingSection({
  id,
  eyebrow,
  heading,
  headingLevel = 2,
  description,
  children,
  background = 'plain',
  align = 'start',
  width = 'marketing',
  className,
  'data-testid': testId,
}: MarketingSectionProps): React.JSX.Element {
  const headingId = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  const centered = align === 'center';

  return (
    <section
      id={id}
      aria-labelledby={heading ? headingId : undefined}
      data-testid={testId}
      className={cx(
        'w-full px-page-mobile py-12 sm:px-page-tablet sm:py-16',
        // El salto a un ancla debe dejar el heading visible bajo el header sticky, no debajo.
        id && 'scroll-mt-header',
        BACKGROUND[background],
        className,
      )}
    >
      <div className={cx('mx-auto w-full', WIDTH[width])}>
        {/* `align` centra **la cabecera**, no el contenido: un heading centrado sobre una rejilla
            de cards alineadas a la izquierda es el patrón de marketing habitual, y centrar
            además las descripciones de las cards las vuelve difíciles de leer. */}
        {eyebrow || heading || description ? (
          <div className={cx('max-w-content', centered && 'mx-auto text-center')}>
            {eyebrow ? (
              <p
                className={cx(
                  'font-ui text-eyebrow uppercase',
                  background === 'inverse' ? 'text-inverse' : 'text-link',
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            {heading ? (
              <Heading
                id={headingId}
                className={cx(
                  'mt-2 font-heading text-h2 font-semibold',
                  background === 'inverse' ? 'text-inverse' : 'text-primary',
                )}
              >
                {heading}
              </Heading>
            ) : null}
            {description ? (
              <p
                className={cx(
                  'mt-3 text-balance font-body text-body-lg',
                  background === 'inverse' ? 'text-inverse' : 'text-secondary',
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        {children ? (
          <div className={cx(heading || description ? 'mt-10' : '')}>{children}</div>
        ) : null}
      </div>
    </section>
  );
}
