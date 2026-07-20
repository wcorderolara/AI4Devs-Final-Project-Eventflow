'use client';

// ReviewModerationTable (US-067 / PB-P1-040 / FE-001). Tabla paginada admin de reviews de un
// vendor específico + filtro por status + acción "Moderar" que abre `ModerationDialog`.
//
// Reusa `useVendorReviews(vendorId)` (US-066 admin sees-all: el listing público devuelve TODOS
// los status cuando el requester es admin — D3 de US-066). Sin endpoint dedicado en scope de
// US-067 (Tech Spec §7 sólo declara el moderate; el listing es reutilizado).
//
// UX:
//   - Input vendorId + botón "Buscar" (paso previo al listado — evita cargar TODAS las
//     reviews de la plataforma sin criterio).
//   - Filtro por status via `<select>` (cliente, sobre la página actual — MVP; paginación por
//     cursor sigue viviendo en backend).
//   - Empty / loading / error states con i18n.
//   - Botón "Moderar" por row → abre modal con la review target.
//   - Accesibilidad: tabla con `<caption>`, headers `<th scope>`, botón con `aria-label`.
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useVendorReviews } from '@/features/reviews/hooks/vendorReviewsQueries';
import type {
  AnonymizedReviewDTO,
  VendorReviewStatus,
} from '@/features/reviews/api/vendorReviewsApi.types';
import { AdminActionBadge } from './AdminActionBadge';
import { ModerationDialog, type ModerationDialogReview } from './ModerationDialog';

type StatusFilter = 'all' | VendorReviewStatus;

export function ReviewModerationTable(): React.JSX.Element {
  const t = useTranslations('admin.review.moderate.table');
  const tStatus = useTranslations('admin.review.moderate.status');

  const [vendorInput, setVendorInput] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<ModerationDialogReview | null>(null);

  const query = useVendorReviews(vendorId, { pageSize: 20, enabled: vendorId.length > 0 });

  const allItems = useMemo<AnonymizedReviewDTO[]>(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );
  const visibleItems = useMemo(() => {
    if (statusFilter === 'all') return allItems;
    return allItems.filter((r) => (r.status ?? 'published') === statusFilter);
  }, [allItems, statusFilter]);

  const vendorSummary = query.data?.pages[0]?.vendor;

  const onSearch = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setVendorId(vendorInput.trim());
  };

  return (
    <section aria-labelledby="admin-reviews-title" className="space-y-4">
      <header>
        <h1 id="admin-reviews-title" className="text-2xl font-bold">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[240px]">
          <label htmlFor="vendor-id-input" className="block text-sm font-medium text-neutral-800">
            {t('vendorIdLabel')}
          </label>
          <input
            id="vendor-id-input"
            type="text"
            value={vendorInput}
            onChange={(e) => setVendorInput(e.target.value)}
            placeholder={t('vendorIdPlaceholder')}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('search')}
        </button>
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-neutral-800">
            {t('filterByStatus')}
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="all">{tStatus('all')}</option>
            <option value="published">{tStatus('published')}</option>
            <option value="hidden">{tStatus('hidden')}</option>
            <option value="removed">{tStatus('removed')}</option>
          </select>
        </div>
      </form>

      {vendorId.length === 0 ? (
        <p className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          {t('promptSelectVendor')}
        </p>
      ) : query.isPending ? (
        <p role="status" className="text-sm text-neutral-600">
          {t('loading')}
        </p>
      ) : query.isError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {t('error')}
        </p>
      ) : visibleItems.length === 0 ? (
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
                  {t('col.eventTitle')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.comment')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.status')}
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
              {visibleItems.map((r) => {
                const status: VendorReviewStatus = r.status ?? 'published';
                return (
                  <tr key={r.id} data-testid={`admin-review-row-${r.id}`}>
                    <td className="px-3 py-2">
                      {r.rating}
                      <span aria-hidden="true">{'★'}</span>
                    </td>
                    <td className="px-3 py-2">{r.eventTitle}</td>
                    <td className="px-3 py-2 max-w-md truncate">{r.comment ?? '—'}</td>
                    <td className="px-3 py-2">
                      <AdminActionBadge status={status} />
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
                            vendorId,
                            vendorSlug: vendorSummary?.slug,
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

      <ModerationDialog review={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
