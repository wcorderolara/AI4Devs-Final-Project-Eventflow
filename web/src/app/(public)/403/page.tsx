import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ForbiddenPage() {
  const t = useTranslations('errors');
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">{t('forbidden.title')}</h1>
      <Link href="/" className="underline">
        {t('forbidden.cta')}
      </Link>
    </div>
  );
}
