'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/shared/design-system';

/**
 * UI de carga de `/login`. La forma imita el formulario real (título + dos campos + acción) para
 * que no haya salto de layout al hidratar. El shimmer se apaga con `prefers-reduced-motion`
 * (lo aporta `Skeleton`); los placeholders son `aria-hidden` y la carga la anuncia la región.
 */
export default function Loading() {
  const t = useTranslations('common');

  return (
    <div role="status" aria-busy="true" aria-label={t('loading')} className="space-y-6">
      <span className="sr-only">{t('loading')}</span>
      <Skeleton variant="text" className="max-w-[12rem]" />
      <Skeleton variant="card" />
    </div>
  );
}
