import Link from 'next/link';
import { useTranslations } from 'next-intl';

const sizeClasses = { sm: 'text-lg sm:text-xl', md: 'text-xl sm:text-2xl', lg: 'text-3xl' } as const;

/**
 * Wordmark en Bodoni Moda (la letra de las invitaciones), en tinta. El color de marca ya vive en
 * las CTAs y en la fecha del evento; repetirlo en el logo lo diluiría. `inverse` es para
 * superficies oscuras (panel de `AuthSplitShell`).
 */
const toneClasses = { brand: 'text-primary', inverse: 'text-inverse' } as const;

export interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  tone?: keyof typeof toneClasses;
}

/** Logo textual "EventFlow" (sin asset binario — el diseño definitivo es Future). Link a `/`. */
export function Logo({ variant = 'full', size = 'md', tone = 'brand' }: LogoProps) {
  const t = useTranslations('navigation');
  return (
    <Link
      href="/"
      aria-label={t('logo.label')}
      className={`focus-ring shrink-0 whitespace-nowrap font-display font-semibold tracking-[-0.01em] ${toneClasses[tone]} ${sizeClasses[size]}`}
    >
      {variant === 'icon' ? 'EF' : 'EventFlow'}
    </Link>
  );
}
