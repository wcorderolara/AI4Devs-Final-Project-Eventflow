import { useTranslations } from 'next-intl';

/**
 * Skip-link WCAG 2.1 AA: primer elemento focusable de cada layout. Oculto salvo en focus; lleva el
 * foco a `#main-content`.
 */
export function SkipLink() {
  const t = useTranslations('navigation');
  return (
    <a
      href="#main-content"
      className="sr-only rounded bg-primary-700 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      {t('skipLink')}
    </a>
  );
}
