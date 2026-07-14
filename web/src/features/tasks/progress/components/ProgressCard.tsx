'use client';

// US-033 (PB-P1-019 / FE-002) — Tarjeta de progreso para el dashboard del evento.
// Reutiliza `useTaskProgress` (selector sobre el cache canónico de `useEventTasks`) y
// compone la `ProgressBar` con banner condicional para `event.status ∈ {cancelled, completed}`
// (D3, EC-05/06). El cálculo NO se ramifica por `event.status` (server-side lo determina);
// la UI sólo agrega mensaje contextual heredado de US-014 EC-01 / US-015.
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useTaskProgress } from '@/features/tasks/list';
import { ProgressBar } from './ProgressBar';

export interface ProgressCardProps {
  eventId: string;
  locale: string;
  eventStatus?: 'draft' | 'active' | 'cancelled' | 'completed';
}

export function ProgressCard({
  eventId,
  locale,
  eventStatus,
}: ProgressCardProps): React.JSX.Element {
  const t = useTranslations('checklist.progress');
  const { data, isLoading, isError } = useTaskProgress(eventId);

  const progress = data ?? { percentage: 0, done: 0, total_countable: 0, skipped: 0 };
  const isEmpty = !isLoading && !isError && progress.total_countable === 0;

  return (
    <section
      aria-labelledby={`progress-card-${eventId}`}
      className="rounded border border-neutral-200 p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id={`progress-card-${eventId}`}
          className="text-sm font-semibold text-neutral-700"
        >
          {t('card_title')}
        </h2>
        <Link
          href={`/${locale}/organizer/events/${eventId}/tasks`}
          className="text-xs font-medium text-emerald-700 underline"
        >
          {t('go_to_checklist')}
        </Link>
      </div>

      {eventStatus === 'completed' ? (
        <p
          role="status"
          className="mt-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
        >
          {t('event_completed_banner')}
        </p>
      ) : null}
      {eventStatus === 'cancelled' ? (
        <p
          role="status"
          className="mt-2 rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700"
        >
          {t('event_cancelled_banner')}
        </p>
      ) : null}

      {isError ? (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {t('error')}
        </p>
      ) : (
        <div className="mt-3">
          <ProgressBar
            percentage={progress.percentage}
            done={progress.done}
            totalCountable={progress.total_countable}
            skipped={progress.skipped}
            loading={isLoading}
            eventStatus={eventStatus}
          />
        </div>
      )}

      {isEmpty ? (
        <p className="mt-2 text-xs text-neutral-500">{t('empty_cta')}</p>
      ) : null}
    </section>
  );
}
