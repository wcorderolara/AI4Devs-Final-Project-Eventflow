'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Money } from '@/shared/i18n';
import { EventActions } from '../components/EventActions';
import { EventStatusBadge } from '../components/EventStatusBadge';
import { useEvent } from '../hooks/useEventsQueries';

/**
 * Dashboard de un evento (US-014 / AC-01). Compone la vista de detalle a partir de
 * `GET /api/v1/events/:id`. Las secciones de tareas, presupuesto detallado y cotizaciones se
 * muestran como "próximamente" en el MVP (sus sub-endpoints pertenecen a backlog items
 * posteriores; ver execution record). Estados loading / error / not-found.
 */
export function EventDashboardPage({ eventId }: { eventId: string }): React.JSX.Element {
  const t = useTranslations('events');
  const { data: event, isLoading, isError, error, refetch } = useEvent(eventId);

  const notFound =
    isError && typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 404;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link href="/organizer/events" className="text-sm text-neutral-600 underline">
        {t('dashboard.back')}
      </Link>

      {isLoading ? (
        <div className="mt-4 space-y-4" aria-hidden>
          <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-200" />
          <div className="h-40 animate-pulse rounded bg-neutral-100" />
        </div>
      ) : null}

      {notFound ? (
        <div role="alert" className="mt-6 rounded border border-neutral-300 bg-neutral-50 p-6 text-center">
          <p className="text-neutral-700">{t('dashboard.notFound')}</p>
          <Link href="/organizer/events" className="mt-3 inline-block rounded bg-neutral-900 px-4 py-2 text-sm text-white">
            {t('dashboard.back')}
          </Link>
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

      {event ? (
        <>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{event.name || t(`types.${event.eventTypeCode}`)}</h1>
              <div className="mt-2 flex items-center gap-2">
                <EventStatusBadge status={event.status} />
                <span className="text-sm text-neutral-600">{t(`types.${event.eventTypeCode}`)}</span>
              </div>
            </div>
            <EventActions event={event} />
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('fields.eventDate')} value={event.eventDate} />
            <Field label={t('fields.guests')} value={String(event.guestsCount)} />
            <Field
              label={t('fields.budget')}
              value={<Money amount={Number(event.estimatedBudget)} currency={event.currencyCode} />}
            />
            <Field label={t('fields.currency')} value={event.currencyCode} />
            <Field label={t('fields.language')} value={event.languageCode} />
            {event.notes ? <Field label={t('fields.notes')} value={event.notes} /> : null}
          </dl>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PlaceholderCard title={t('dashboard.sections.tasks')} hint={t('dashboard.comingSoon')} />
            <PlaceholderCard title={t('dashboard.sections.budget')} hint={t('dashboard.comingSoon')} />
            <PlaceholderCard title={t('dashboard.sections.quotes')} hint={t('dashboard.comingSoon')} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="rounded border border-neutral-200 p-3">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-900">{value}</dd>
    </div>
  );
}

function PlaceholderCard({ title, hint }: { title: string; hint: string }): React.JSX.Element {
  return (
    <div className="rounded border border-dashed border-neutral-300 p-4">
      <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}
