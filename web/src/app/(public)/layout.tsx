import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LocaleSwitcher } from '@/shared/i18n';
import { Footer, Logo, SkipLink } from '@/shared/navigation';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('navigation');
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3">
        <Logo />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/vendors" className="hover:underline">
            {t('public.directory')}
          </Link>
          <Link href="/login" className="hover:underline">
            {t('public.login')}
          </Link>
          <Link href="/register" className="hover:underline">
            {t('public.register')}
          </Link>
          <LocaleSwitcher />
        </nav>
      </header>
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
