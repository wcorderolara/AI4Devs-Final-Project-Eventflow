import Link from 'next/link';
import { useTranslations } from 'next-intl';

const sizeClasses = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' } as const;

export interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

/** Logo textual "EventFlow" (sin asset binario — el diseño definitivo es Future). Link a `/`. */
export function Logo({ variant = 'full', size = 'md' }: LogoProps) {
  const t = useTranslations('navigation');
  return (
    <Link
      href="/"
      aria-label={t('logo.label')}
      className={`font-bold text-primary-700 ${sizeClasses[size]}`}
    >
      {variant === 'icon' ? 'EF' : 'EventFlow'}
    </Link>
  );
}
