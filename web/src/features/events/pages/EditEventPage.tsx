'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { EditEventForm } from '../components/EditEventForm';
import { useEvent } from '../hooks/useEventsQueries';

/** Página `/organizer/events/:id/edit` (US-010). Carga el evento y monta el form de edición. */
export function EditEventPage({ eventId }: { eventId: string }): React.JSX.Element {
  const t = useTranslations('events');
  const { data: event, isLoading, isError, error, refetch } = useEvent(eventId);

  const notFound =
    isError && typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 404;
  const isTerminal = event?.status === 'completed' || event?.status === 'cancelled';

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href={`/organizer/events/${eventId}`} className="text-sm text-neutral-600 underline">
        {t('dashboard.back')}
      </Link>

      {isLoading ? <div className="mt-4 h-64 animate-pulse rounded bg-neutral-100" aria-hidden /> : null}

      {notFound ? (
        <div role="alert" className="mt-6 rounded border border-neutral-300 bg-neutral-50 p-6 text-center text-neutral-700">
          {t('dashboard.notFound')}
        </div>
      ) : null}

      {isError && !notFound ? (
        <div role="alert" className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{t('errors.LOAD_FAILED')}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 rounded bg-red-700 px-3 py-1.5 text-white">
            {t('actions.retry')}
          </button>
        </div>
      ) : null}

      {event && isTerminal ? (
        <div role="alert" className="mt-6 rounded border border-neutral-300 bg-neutral-50 p-6 text-neutral-700">
          {t('edit.terminalBlocked')}
        </div>
      ) : null}

      {event && !isTerminal ? <div className="mt-4"><EditEventForm event={event} /></div> : null}
    </div>
  );
}
