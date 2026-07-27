'use client';

// VendorModerationTable (US-074 / PB-P1-041 / FE-002). Panel admin GLOBAL de VendorProfiles
// con filtros combinados + listado paginado con cursor keyset (paridad US-077).
//
// - Datos: `useAdminVendorsList(filters)` (US-074) — endpoint `GET /admin/vendors` con PII
//   completa (owner.email, D4) + `last_admin_action` chain (US-047).
// - Acción "Moderar" por fila abre `VendorModerationDialog` (US-074 FE-004). Al éxito,
//   `useModerateVendor` invalida `adminVendorsKeys.all` (prefix invalidation) para refrescar
//   todas las páginas activas del listing sin recargar la ruta (AC-05).
// - Filtro por defecto `status=['pending']` (Decisión PO D5) — se aplica ANTES del primer fetch
//   y se preserva salvo que el usuario limpie explícitamente.
// - A11Y: tabla semántica con `<caption sr-only>`, `<th scope>`, botón con `aria-label` que
//   referencia el business name. `VendorStatusBadge` complementa color con literal i18n.
// - Empty/loading/error/next-page states con i18n.
//
// PB-P2-033: compone las primitivas `Table` del design system (el `VendorStatusBadge` ya usaba
// `StatusBadge` desde PB-P2-029); el color y la densidad pasan a tokens semánticos.
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
import { useAdminVendorsList } from '../hooks/adminVendorsQueries';
import type {
  AdminVendorListFilters,
  AdminVendorListItem,
  AdminVendorStatus,
} from '../api/adminVendorsApi.types';
import { VendorStatusBadge } from './VendorStatusBadge';
import {
  VendorModerationDialog,
  type VendorModerationDialogVendor,
} from './VendorModerationDialog';
import { VendorFiltersPanel } from './VendorFiltersPanel';

/** Filtro operativo por defecto — Decisión PO D5: el panel abre en `status=pending`. */
const DEFAULT_FILTERS: AdminVendorListFilters = {
  status: ['pending'],
  pageSize: DEFAULT_PAGE_SIZE,
};

export function VendorModerationTable(): React.JSX.Element {
  const t = useTranslations('admin.vendor.panel');

  const [filters, setFilters] = useState<AdminVendorListFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<VendorModerationDialogVendor | null>(null);

  const query = useAdminVendorsList(filters);

  const items = useMemo<AdminVendorListItem[]>(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );

  return (
    <section aria-labelledby="admin-vendors-title" className="space-y-4">
      <header>
        <h1 id="admin-vendors-title" className="font-heading text-h2 font-semibold text-primary">
          {t('title')}
        </h1>
        <p className="mt-1 font-body text-body-sm text-secondary">{t('subtitle')}</p>
      </header>

      <VendorFiltersPanel value={filters} onChange={setFilters} />

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
              <TableHeaderCell density="compact">{t('col.businessName')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.owner')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.status')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.lastAction')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.createdAt')}</TableHeaderCell>
              <TableHeaderCell density="compact" align="end">
                {t('col.actions')}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((v) => {
              const status = v.status as AdminVendorStatus;
              const isTerminal = status === 'rejected';
              return (
                <TableRow key={v.id} data-testid={`admin-vendor-row-${v.id}`}>
                  <TableCell density="compact" header description={v.slug ?? undefined}>
                    {v.businessName}
                  </TableCell>
                  <TableCell density="compact">{v.owner.email}</TableCell>
                  <TableCell density="compact">
                    <VendorStatusBadge status={status} isHidden={v.isHidden} />
                  </TableCell>
                  <TableCell density="compact">
                    {v.lastAdminAction ? (
                      <span className="text-caption text-secondary">
                        {v.lastAdminAction.action} ·{' '}
                        {new Date(v.lastAdminAction.createdAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-caption text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell density="compact">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell density="compact" align="end">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={t('moderateAria', { businessName: v.businessName })}
                      onClick={() =>
                        setSelected({
                          id: v.id,
                          businessName: v.businessName,
                          slug: v.slug,
                          currentStatus: status,
                          isHidden: v.isHidden,
                        })
                      }
                      disabled={isTerminal}
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

      <VendorModerationDialog vendor={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
