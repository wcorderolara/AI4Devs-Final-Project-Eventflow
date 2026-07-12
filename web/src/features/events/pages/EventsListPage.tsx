'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import type { EventTypeCode, ListEventsParams } from '../api/eventsApi.types';
import { EventActions } from '../components/EventActions';
import { EventFilters, type EventFiltersValue } from '../components/EventFilters';
import { EventStatusBadge } from '../components/EventStatusBadge';
import { useEventsList } from '../hooks/useEventsQueries';

const PAGE_SIZE = 20;

/**
 * Listado de eventos del organizador (US-013). Página de entrada del rol: filtros server-side por
 * estado/tipo, orden por fecha (próximos primero, `eventDate:asc`) y paginación. Estados loading /
 * empty / error. Cada fila enlaza al dashboard (US-014) y ofrece acciones (US-010/011/012).
 */
export function EventsListPage(): React.JSX.Element {
  const t = useTranslations('events');
  const [filters, setFilters] = useState<EventFiltersValue>({});
  const [page, setPage] = useState(1);

  const params: ListEventsParams = {
    status: filters.status,
    eventTypeCode: filters.eventTypeCode,
    page,
    pageSize: PAGE_SIZE,
    sort: 'eventDate:asc',
  };
  const { data, isLoading, isError, refetch } = useEventsList(params);

  const onFiltersChange = (next: EventFiltersValue): void => {
    setPage(1);
    setFilters(next);
  };

  const items = data?.items ?? [];
  const totalPages = data?.pagination.totalPages ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('list.title')}</h1>
        <Link
          href="/organizer/events/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          {t('list.create')}
        </Link>
      </div>

      <div className="mt-6">
        <EventFilters value={filters} onChange={onFiltersChange} />
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-neutral-100" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div role="alert" className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{t('errors.LIST_FAILED')}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 rounded bg-red-700 px-3 py-1.5 text-white">
            {t('actions.retry')}
          </button>
        </div>
      ) : null}

      {data && items.length === 0 ? (
        <div className="mt-6 rounded border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-neutral-600">{t('list.empty')}</p>
          <Link href="/organizer/events/new" className="mt-3 inline-block rounded bg-neutral-900 px-4 py-2 text-sm text-white">
            {t('list.create')}
          </Link>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((event) => (
            <li key={event.id} className="rounded border border-neutral-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/organizer/events/${event.id}`} className="font-semibold underline">
                      {event.name || t(`types.${event.eventTypeCode as EventTypeCode}`)}
                    </Link>
                    <EventStatusBadge status={event.status} />
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {t('list.rowMeta', {
                      type: t(`types.${event.eventTypeCode as EventTypeCode}`),
                      date: event.eventDate,
                      guests: event.guestsCount,
                    })}
                  </p>
                </div>
                <EventActions event={event} onDeleted={() => refetch()} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-center gap-4" aria-label={t('list.pagination')}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t('list.prev')}
          </button>
          <span className="text-sm text-neutral-600">{t('list.pageOf', { page, totalPages })}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {t('list.next')}
          </button>
        </nav>
      ) : null}
    </div>
  );
}
