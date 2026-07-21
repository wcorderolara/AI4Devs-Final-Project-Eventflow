'use client';

// US-078 / FE-003 — Tabla admin de eventos (paridad `VendorModerationTable`).
// - Semántica: `<table>` con `<caption sr-only>` + `<th scope='col'>`; link "Ver detalle"
//   con `aria-label` que referencia el título del evento.
// - Status badge complementa color con texto i18n (no color-only).
// - Empty/loading/error/next-page states con literales i18n.
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/shared/i18n';
import type {
  AdminEventListItemModel,
  AdminEventsListFilters,
} from '../api/adminEventsApi.types';
import { useAdminEventsList } from '../hooks/adminEventsQueries';

interface Props {
  filters: AdminEventsListFilters;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
}

function EstimatedBudgetCell({ value, currency }: { value: string | null; currency: string }): React.JSX.Element {
  if (!value) return <>—</>;
  const n = Number(value);
  if (Number.isNaN(n)) return <>{`${currency} ${value}`}</>;
  return <Money amount={n} currency={currency} />;
}

export function AdminEventTable({ filters }: Props): React.JSX.Element {
  const t = useTranslations('admin.events.list');
  const tStatus = useTranslations('admin.events.status');

  const query = useAdminEventsList(filters);

  const items = useMemo<AdminEventListItemModel[]>(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );

  if (query.isPending) {
    return (
      <p role="status" className="text-sm text-neutral-600">
        {t('loading')}
      </p>
    );
  }

  if (query.isError) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {t('error')}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        {t('empty')}
      </p>
    );
  }

  // El locale nativo del navegador es aceptable para render de moneda/fecha en el panel admin
  // (no requiere i18n riguroso; el layout ya provee `<html lang>`).
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'es-419';

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <caption className="sr-only">{t('caption')}</caption>
          <thead className="bg-neutral-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.title')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.status')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.eventType')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.owner')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.eventDate')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-neutral-700">
                {t('col.guests')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-neutral-700">
                {t('col.estimatedBudget')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-neutral-700">
                {t('col.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {items.map((ev) => {
              const badgeClass =
                ev.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : ev.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : ev.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-neutral-100 text-neutral-800';
              return (
                <tr key={ev.id} className={ev.deletedAt ? 'opacity-70' : undefined}>
                  <th scope="row" className="px-3 py-2 font-medium text-neutral-900">
                    <span className="block truncate max-w-xs">{ev.title}</span>
                    {ev.deletedAt ? (
                      <span className="mt-1 inline-block rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-700">
                        {t('deletedBadge')}
                      </span>
                    ) : null}
                  </th>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                      {tStatus(ev.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{ev.eventType.label}</td>
                  <td className="px-3 py-2 text-neutral-700">
                    <span className="block">{ev.owner.fullName ?? ev.owner.email}</span>
                    {ev.owner.fullName ? (
                      <span className="block text-xs text-neutral-500">{ev.owner.email}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{formatDate(ev.eventDate, locale)}</td>
                  <td className="px-3 py-2 text-right text-neutral-700">
                    {ev.guestsCount ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-neutral-700">
                    <EstimatedBudgetCell value={ev.estimatedBudget} currency={ev.currency} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/events/${ev.id}`}
                      aria-label={t('viewAria', { title: ev.title })}
                      className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-800 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                    >
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {query.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50 disabled:bg-neutral-100"
          >
            {query.isFetchingNextPage ? t('loadingMore') : t('loadMore')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
