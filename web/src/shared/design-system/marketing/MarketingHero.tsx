import { useId, type ReactNode } from 'react';
import { cx } from '../internal/cx';
import { MarketingCTAGroup } from './MarketingCTAGroup';

/**
 * MarketingHero — apertura de una página pública.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §32 (`Hero`) y §36.
 * Referencia visual: screen Stitch *AI, Marketing & Final Notes* (eyebrow + display + copy +
 * par de CTA).
 *
 * De Stitch se toma la anatomía y las proporciones. **No** se toma nada más:
 * - El patrón de fondo generado no se reproduce (UI Foundations prohíbe decoración pesada).
 * - Los CTA del ejemplo (suscripción de cortesía, agenda comercial) no se codifican: EventFlow
 *   no tiene ninguno de los dos flujos. Todo el copy llega por props desde el feature.
 *
 * El componente **no decide el copy ni las rutas**: recibe `heading`, `description` y los CTA ya
 * construidos. Es responsabilidad de la página que sus afirmaciones estén respaldadas por el
 * producto (ver el implementation record, §Product claims).
 */
export type MarketingHeroLayout = 'centered' | 'split';

export interface MarketingHeroProps {
  /** Antetítulo o badge ya traducido. Texto de apoyo, no sustituye al heading. */
  eyebrow?: ReactNode;
  /** Titular. Se renderiza como `h1`: es el encabezado de la página. */
  heading: ReactNode;
  description?: ReactNode;
  primaryCta?: ReactNode;
  secondaryCta?: ReactNode;
  /** Nombre accesible del grupo de CTA, ya traducido. */
  ctaGroupLabel?: string;
  /**
   * Apoyo visual (captura real del producto, ilustración aprobada). En `split` se coloca junto
   * al texto en desktop y **debajo** en móvil; nunca provoca scroll horizontal.
   */
  media?: ReactNode;
  layout?: MarketingHeroLayout;
  className?: string;
  'data-testid'?: string;
}

export function MarketingHero({
  eyebrow,
  heading,
  description,
  primaryCta,
  secondaryCta,
  ctaGroupLabel,
  media,
  layout = 'centered',
  className,
  'data-testid': testId,
}: MarketingHeroProps): React.JSX.Element {
  const headingId = useId();
  const centered = layout === 'centered';

  const copy = (
    <div className={cx('min-w-0', centered && 'mx-auto text-center')}>
      {eyebrow ? <p className="font-ui text-eyebrow uppercase text-link">{eyebrow}</p> : null}
      <h1
        id={headingId}
        // `text-balance` + ancho relativo: una traducción un 30 % más larga sigue leyéndose
        // bien y no fuerza saltos raros (§32: evitar anchos fijos que rompan traducciones).
        className="mt-3 text-balance font-heading text-h1 font-semibold text-primary sm:text-display"
      >
        {heading}
      </h1>
      {description ? (
        <p
          className={cx(
            'mt-4 max-w-content text-balance font-body text-body-lg text-secondary',
            centered && 'mx-auto',
          )}
        >
          {description}
        </p>
      ) : null}
      {primaryCta ? (
        <MarketingCTAGroup
          className="mt-8"
          align={centered ? 'center' : 'start'}
          ariaLabel={ctaGroupLabel}
          primary={primaryCta}
          secondary={secondaryCta}
        />
      ) : null}
    </div>
  );

  return (
    <section
      aria-labelledby={headingId}
      data-testid={testId}
      data-layout={layout}
      className={cx('w-full px-page-mobile py-16 sm:px-page-tablet sm:py-20', className)}
    >
      <div className="mx-auto w-full max-w-marketing">
        {centered ? (
          <>
            <div className="mx-auto max-w-content">{copy}</div>
            {media ? <div className="mt-12">{media}</div> : null}
          </>
        ) : (
          // Split: una columna en móvil (media debajo del texto), dos desde `lg`.
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {copy}
            {media ? <div className="min-w-0">{media}</div> : null}
          </div>
        )}
      </div>
    </section>
  );
}
