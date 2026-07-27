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
//
// PB-P2-033: compone las primitivas `Table` del design system; el color, la densidad y los
// estados dejan de ser clases de paleta cruda y pasan a los tokens semánticos.
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  EmptyState,
  ErrorState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/design-system';
import { DEFAULT_PAGE_SIZE, PageSizeSelector, type PageSize } from '@/shared/ui';
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

  const [filters, setFilters] = useState<AdminReviewListFilters>({ pageSize: DEFAULT_PAGE_SIZE });
  const [selected, setSelected] = useState<ModerationDialogReview | null>(null);

  const query = useAdminReviewsList(filters);

  const items = useMemo<AdminReviewListItem[]>(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );

  return (
    <section aria-labelledby="admin-reviews-title" className="space-y-4">
      <header>
        <h1 id="admin-reviews-title" className="font-heading text-h2 font-semibold text-primary">
          {t('title')}
        </h1>
        <p className="mt-1 font-body text-body-sm text-secondary">{t('subtitle')}</p>
      </header>

      <ReviewFiltersPanel value={filters} onChange={setFilters} />

      <div className="flex justify-end">
        <PageSizeSelector
          value={(filters.pageSize ?? DEFAULT_PAGE_SIZE) as PageSize}
          onChange={(size) => setFilters((f) => ({ ...f, pageSize: size }))}
        />
      </div>

      {query.isPending ? (
        <p role="status" className="font-body text-body-sm text-secondary">
          {t('loading')}
        </p>
      ) : query.isError ? (
        <ErrorState title={t('error')} />
      ) : items.length === 0 ? (
        <EmptyState title={t('empty')} live />
      ) : (
        <Table
          caption={t('caption')}
          density="compact"
          containerClassName="rounded-card border border-subtle bg-surface"
        >
          <TableHead>
            <TableRow>
              <TableHeaderCell density="compact">{t('col.rating')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.author')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.vendor')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.event')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.comment')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.status')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.lastAction')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.createdAt')}</TableHeaderCell>
              <TableHeaderCell density="compact" align="end">
                {t('col.actions')}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r) => {
              const status = r.status as AdminReviewStatus;
              return (
                <TableRow key={r.id} data-testid={`admin-review-row-${r.id}`}>
                  <TableCell density="compact">
                    {r.rating}
                    <span aria-hidden="true">{'★'}</span>
                  </TableCell>
                  <TableCell density="compact">{r.author.displayName}</TableCell>
                  <TableCell density="compact">{r.vendor.businessName}</TableCell>
                  <TableCell density="compact">{r.event.title}</TableCell>
                  <TableCell density="compact" className="max-w-md truncate">
                    {r.comment ?? '—'}
                  </TableCell>
                  <TableCell density="compact">
                    <AdminActionBadge status={status} />
                  </TableCell>
                  <TableCell density="compact">
                    {r.lastAdminAction ? (
                      <span className="text-caption text-secondary">
                        {r.lastAdminAction.action} ·{' '}
                        {new Date(r.lastAdminAction.createdAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-caption text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell density="compact">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell density="compact" align="end">
                    <Button
                      variant="secondary"
                      size="sm"
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
                    >
                      {t('moderate')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {query.hasNextPage && !query.isFetchingNextPage ? (
        <Button variant="secondary" onClick={() => void query.fetchNextPage()}>
          {t('loadMore')}
        </Button>
      ) : null}
      {query.isFetchingNextPage ? (
        <p role="status" className="font-body text-body-sm text-secondary">
          {t('loadingMore')}
        </p>
      ) : null}

      <ModerationDialog review={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
