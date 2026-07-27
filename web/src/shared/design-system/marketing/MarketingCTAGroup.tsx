import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * MarketingCTAGroup — par de llamadas a la acción de una superficie pública.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §32 (`CTAGroup`).
 *
 * - **Móvil**: apiladas y a ancho completo, con la primaria arriba.
 * - **Desktop**: en línea, primaria primero. El orden del DOM coincide con el orden visual, así
 *   que el recorrido de tabulación es el mismo que se lee.
 * - No navega por su cuenta: las acciones llegan ya construidas (`Button`, `TextLink`, `Link`).
 *   El grupo no conoce rutas ni handlers.
 */
export interface MarketingCTAGroupProps {
  primary: ReactNode;
  secondary?: ReactNode;
  /** Nombre accesible del grupo, ya traducido. Útil cuando la página tiene varios CTA. */
  ariaLabel?: string;
  align?: 'start' | 'center';
  className?: string;
  'data-testid'?: string;
}

export function MarketingCTAGroup({
  primary,
  secondary,
  ariaLabel,
  align = 'start',
  className,
  'data-testid': testId,
}: MarketingCTAGroupProps): React.JSX.Element {
  return (
    <div
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cx(
        'flex flex-col items-stretch gap-3 sm:flex-row sm:items-center',
        align === 'center' ? 'sm:justify-center' : 'sm:justify-start',
        // Los hijos ocupan el ancho completo en móvil y vuelven a su tamaño natural desde `sm`.
        '[&>*]:w-full sm:[&>*]:w-auto',
        className,
      )}
    >
      {primary}
      {secondary}
    </div>
  );
}
