'use client';

// US-016 / FE-002 / AC-03 — Badge "Modo lectura".
import { useTranslations } from 'next-intl';

export function ReadOnlyBadge(): React.JSX.Element {
  const t = useTranslations('admin.events.detail');
  const label = t('readOnlyBadge');
  return (
    <span
      role="status"
      aria-label={label}
      data-testid="admin-event-read-only-badge"
      className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
    >
      {label}
    </span>
  );
}
