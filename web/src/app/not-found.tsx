import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('errors');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <Link href="/" className="underline">
        {t('notFound.cta')}
      </Link>
    </main>
  );
}
