// US-071 (PB-P2-004 / FE-005). Estados accesibles del dropdown: loading, empty, error.
// AC-06 exige `aria-live="polite"`, `aria-busy="true"`, `role="alert"`.
'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

export function NotificationsLoadingState(): ReactElement {
  const t = useTranslations('notifications');
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="px-4 py-6 text-center text-sm text-gray-600"
      data-testid="us071-loading"
    >
      {t('loading')}
    </div>
  );
}

export function NotificationsEmptyState(): ReactElement {
  const t = useTranslations('notifications');
  return (
    <div
      role="status"
      aria-live="polite"
      className="px-4 py-8 text-center text-sm text-gray-600"
      data-testid="us071-empty"
    >
      {t('empty')}
    </div>
  );
}

export interface NotificationsErrorBannerProps {
  onRetry: () => void;
}

export function NotificationsErrorBanner({
  onRetry,
}: NotificationsErrorBannerProps): ReactElement {
  const t = useTranslations('notifications');
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 px-4 py-4 text-sm text-red-800"
      data-testid="us071-error"
    >
      <p>{t('error')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="self-start rounded bg-red-100 px-3 py-1 font-medium text-red-800 outline-none hover:bg-red-200 focus-visible:ring-2 focus-visible:ring-red-500"
      >
        {t('retry')}
      </button>
    </div>
  );
}
