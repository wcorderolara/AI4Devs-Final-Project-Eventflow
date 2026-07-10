import { useTranslations } from 'next-intl';
import { Logo } from './Logo';

/** Footer público (Server Component). MVP: logo + copyright. Links legales → Future. */
export function Footer() {
  const t = useTranslations('navigation');
  return (
    <footer className="border-t border-neutral-200 p-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Logo size="sm" />
        <p className="text-sm text-neutral-500">{t('footer.copyright', { year: 2026 })}</p>
      </div>
    </footer>
  );
}
