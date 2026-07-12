'use client';

import { useTranslations } from 'next-intl';
import type { EventStatus } from '../api/eventsApi.types';

const STATUS_CLASSES: Record<EventStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-700 border-neutral-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-blue-100 text-blue-800 border-blue-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

/** Badge de estado de evento con etiqueta i18n y color por estado (US-013/US-014). */
export function EventStatusBadge({ status }: { status: EventStatus }): React.JSX.Element {
  const t = useTranslations('events');
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
