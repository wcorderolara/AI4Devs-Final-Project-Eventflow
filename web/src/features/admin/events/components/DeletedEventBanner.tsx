'use client';

// US-016 / FE-002 / EC-01 — Banner "Eliminado" para eventos soft-deleted.
import { useTranslations } from 'next-intl';

export function DeletedEventBanner(): React.JSX.Element {
  const t = useTranslations('admin.events.detail');
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="admin-event-deleted-banner"
      className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <p className="font-semibold">{t('deletedBanner.title')}</p>
      <p className="mt-1">{t('deletedBanner.description')}</p>
    </div>
  );
}
