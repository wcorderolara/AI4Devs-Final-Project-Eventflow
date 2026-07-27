'use client';

import { CalendarX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
  TextLink,
} from '@/shared/design-system';
import type { EventTypeCode, ListEventsParams } from '../api/eventsApi.types';
import { EventActions } from '../components/EventActions';
import { EventFilters, type EventFiltersValue } from '../components/EventFilters';
import { EventStatusBadge } from '../components/EventStatusBadge';
import { useEventsList } from '../hooks/useEventsQueries';

const PAGE_SIZE = 20;

const CTA_CLASS =
  'focus-ring inline-flex min-h-touch items-center justify-center rounded-button ' +
  'bg-action-primary px-4 font-ui text-body-sm font-semibold text-action-primary-foreground ' +
  'transition-colors duration-fast ease-standard hover:bg-action-primary-hover';

/**
 * Listado de eventos del organizador (US-013). Página de entrada del rol: filtros server-side por
 * estado/tipo, orden por fecha (próximos primero, `eventDate:asc`) y paginación. Estados loading /
 * empty / error. Cada fila enlaza al dashboard (US-014) y ofrece acciones (US-010/011/012).
 *
 * PB-P2-031: las filas pasan a ser `Card` del design system y la paginación a `Pagination`
 * (controlada; el estado de página sigue siendo del feature). La card **no** es interactiva en
 * su totalidad: contiene un enlace al detalle y los botones de `EventActions`, y envolverla en
 * un `<a>` anidaría controles. Sin cambios de API, rutas ni permisos.
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
        <h1 className="font-heading text-h1 font-semibold text-primary">{t('list.title')}</h1>
        <Link href="/organizer/events/new" className={CTA_CLASS}>
          {t('list.create')}
        </Link>
      </div>

      <div className="mt-6">
        <EventFilters value={filters} onChange={onFiltersChange} />
      </div>

      {isLoading ? (
        <div className="mt-6">
          <Skeleton variant="card" count={3} />
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          className="mt-6"
          title={t('errors.LIST_FAILED')}
          onRetry={() => void refetch()}
          retryLabel={t('actions.retry')}
        />
      ) : null}

      {data && items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarX />}
          title={t('list.empty')}
          primaryAction={
            <Link href="/organizer/events/new" className={CTA_CLASS}>
              {t('list.create')}
            </Link>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((event) => (
            <Card as="li" key={event.id} padding="sm">
              <CardHeader action={<EventActions event={event} onDeleted={() => refetch()} />}>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle headingLevel={2}>
                    <TextLink href={`/organizer/events/${event.id}`} variant="inline">
                      {event.name || t(`types.${event.eventTypeCode as EventTypeCode}`)}
                    </TextLink>
                  </CardTitle>
                  <EventStatusBadge status={event.status} />
                </div>
                <p className="mt-1 font-body text-body-sm text-secondary">
                  {t('list.rowMeta', {
                    type: t(`types.${event.eventTypeCode as EventTypeCode}`),
                    date: event.eventDate,
                    guests: event.guestsCount,
                  })}
                </p>
              </CardHeader>
            </Card>
          ))}
        </ul>
      ) : null}

      {totalPages > 1 ? (
        <Pagination
          className="mt-6"
          ariaLabel={t('list.pagination')}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          previousLabel={t('list.prev')}
          nextLabel={t('list.next')}
          summary={t('list.pageOf', { page, totalPages })}
          live
        />
      ) : null}
    </div>
  );
}
