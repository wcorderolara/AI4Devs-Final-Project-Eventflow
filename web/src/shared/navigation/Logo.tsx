import Link from 'next/link';
import { useTranslations } from 'next-intl';

const sizeClasses = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' } as const;

/**
 * `brand` es el tratamiento por defecto (violeta sobre superficie clara). `inverse` es para
 * superficies oscuras de marca — el único caso hoy es el panel de `AuthSplitShell`, donde el
 * violeta de `text-link` no alcanzaría contraste.
 */
const toneClasses = { brand: 'text-link', inverse: 'text-inverse' } as const;

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
      className={`focus-ring font-heading font-bold ${toneClasses[tone]} ${sizeClasses[size]}`}
    >
      {variant === 'icon' ? 'EF' : 'EventFlow'}
    </Link>
  );
}
