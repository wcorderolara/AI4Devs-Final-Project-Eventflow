'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * TextLink — enlace textual (Component Foundations §12).
 *
 * - `internal` (default) navega con `next/link`; `external` abre en pestaña nueva con
 *   `rel="noopener noreferrer"`, icono indicador y un texto sólo-lector que anuncia el destino.
 * - `inline` es la variante para enlaces dentro de un párrafo (subrayado permanente).
 * - Un enlace deshabilitado **no** es un `<a href>`: se renderiza como `<span aria-disabled>`
 *   fuera del orden de tabulación (§12: no usar `<a>` sin destino).
 */
export type TextLinkVariant = 'default' | 'inline';

export interface TextLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  variant?: TextLinkVariant;
  /** Abre en pestaña nueva con las protecciones de seguridad y el icono indicador. */
  external?: boolean;
  /**
   * Texto sólo para lectores de pantalla que explica que el enlace abre en una pestaña nueva
   * (por ejemplo `t('common.opensInNewTab')`). Obligatorio en la práctica cuando `external`.
   */
  externalHintLabel?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}

const VARIANT: Record<TextLinkVariant, string> = {
  default: 'no-underline hover:underline focus-visible:underline',
  inline: 'underline underline-offset-2',
};

export const TextLink = forwardRef<HTMLAnchorElement, TextLinkProps>(function TextLink(
  {
    href,
    variant = 'default',
    external = false,
    externalHintLabel,
    leadingIcon,
    trailingIcon,
    disabled = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const base = cx(
    'focus-ring inline-flex items-center gap-2 rounded-button font-body text-body-md',
    'transition-colors duration-fast ease-standard',
    VARIANT[variant],
    className,
  );

  const content = (
    <>
      {leadingIcon ? (
        <span aria-hidden="true" className="inline-flex h-icon-sm w-icon-sm shrink-0">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {trailingIcon ? (
        <span aria-hidden="true" className="inline-flex h-icon-sm w-icon-sm shrink-0">
          {trailingIcon}
        </span>
      ) : null}
      {external ? (
        <>
          <ExternalLink aria-hidden="true" className="h-icon-sm w-icon-sm shrink-0" />
          {externalHintLabel ? <span className="sr-only">{externalHintLabel}</span> : null}
        </>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cx(base, 'cursor-not-allowed text-disabled no-underline')}
        data-disabled="true"
      >
        {content}
      </span>
    );
  }

  if (external) {
    return (
      <a
        {...rest}
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cx(base, 'text-link hover:text-link-hover')}
      >
        {content}
      </a>
    );
  }

  return (
    <Link {...rest} ref={ref} href={href} className={cx(base, 'text-link hover:text-link-hover')}>
      {content}
    </Link>
  );
});
