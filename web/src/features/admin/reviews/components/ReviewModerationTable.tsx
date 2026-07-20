'use client';

// ReviewModerationTable (US-077 / PB-P1-040 / FE-002 · reemplaza el shell temporal de US-067
// FE-001). Panel admin GLOBAL con filtros combinados + listado paginado con cursor keyset.
//
// - Datos: `useAdminReviewsList(filters)` (US-077) — endpoint `GET /admin/reviews` con PII
//   completa + `last_admin_action`. Distinto al endpoint público US-066 (per-vendor + anonimato).
// - Acción "Moderar" por fila abre `ModerationDialog` (reuso US-067). Al éxito, `useModerateReview`
//   invalida `adminReviewsKeys.all` (prefix invalidation) para refrescar todas las páginas
//   activas del listing sin recargar la ruta.
// - A11Y: tabla semántica con `<caption sr-only>`, `<th scope>`, botón con `aria-label` que
//   referencia el ID de review. `AdminActionBadge` complementa el color con un literal i18n.
// - Empty/loading/error/next-page states con i18n.
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminReviewsList } from '../hooks/adminReviewsQueries';
import type {
  AdminReviewListFilters,
  AdminReviewListItem,
  AdminReviewStatus,
} from '../api/adminReviewsApi.types';
import { AdminActionBadge } from './AdminActionBadge';
import { ModerationDialog, type ModerationDialogReview } from './ModerationDialog';
import { ReviewFiltersPanel } from './ReviewFiltersPanel';

export function ReviewModerationTable(): React.JSX.Element {
  const t = useTranslations('admin.review.panel');

  const [filters, setFilters] = useState<AdminReviewListFilters>({});
  const [selected, setSelected] = useState<ModerationDialogReview | null>(null);

  const query = useAdminReviewsList(filters);

  const items = useMemo<AdminReviewListItem[]>(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );

  return (
    <section aria-labelledby="admin-reviews-title" className="space-y-4">
      <header>
        <h1 id="admin-reviews-title" className="text-2xl font-bold">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      <ReviewFiltersPanel value={filters} onChange={setFilters} />

      {query.isPending ? (
        <p role="status" className="text-sm text-neutral-600">
          {t('loading')}
        </p>
      ) : query.isError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {t('error')}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          {t('empty')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <caption className="sr-only">{t('caption')}</caption>
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.rating')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.author')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.vendor')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.event')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.comment')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.status')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.lastAction')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.createdAt')}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium text-neutral-700">
                  {t('col.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {items.map((r) => {
                const status = r.status as AdminReviewStatus;
                return (
                  <tr key={r.id} data-testid={`admin-review-row-${r.id}`}>
                    <td className="px-3 py-2">
                      {r.rating}
                      <span aria-hidden="true">{'★'}</span>
                    </td>
                    <td className="px-3 py-2">{r.author.displayName}</td>
                    <td className="px-3 py-2">{r.vendor.businessName}</td>
                    <td className="px-3 py-2">{r.event.title}</td>
                    <td className="px-3 py-2 max-w-md truncate">{r.comment ?? '—'}</td>
                    <td className="px-3 py-2">
                      <AdminActionBadge status={status} />
                    </td>
                    <td className="px-3 py-2">
                      {r.lastAdminAction ? (
                        <span className="text-xs text-neutral-700">
                          {r.lastAdminAction.action} ·{' '}
                          {new Date(r.lastAdminAction.createdAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        aria-label={t('moderateAria', { id: r.id })}
                        onClick={() =>
                          setSelected({
                            id: r.id,
                            vendorId: r.vendor.id,
                            vendorSlug: r.vendor.slug ?? undefined,
                            currentStatus: status,
                            ratingSnapshot: r.rating,
                          })
                        }
                        disabled={status === 'removed'}
                        className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400"
                      >
                        {t('moderate')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {query.hasNextPage && !query.isFetchingNextPage ? (
        <button
          type="button"
          onClick={() => void query.fetchNextPage()}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
        >
          {t('loadMore')}
        </button>
      ) : null}
      {query.isFetchingNextPage ? (
        <p role="status" className="text-sm text-neutral-600">
          {t('loadingMore')}
        </p>
      ) : null}

      <ModerationDialog review={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
