import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { SessionStateProbe } from '@/shared/auth-session/SessionStateProbe';
import { ThrowOnParam } from '@/shared/providers/ThrowOnParam';

export default function LandingPage() {
  const t = useTranslations('common');
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Suspense>
        <ThrowOnParam />
      </Suspense>
      <h1 className="text-4xl font-bold">{t('appName')}</h1>
      <p className="text-lg">{t('welcome')}</p>
      <SessionStateProbe />
    </div>
  );
}
