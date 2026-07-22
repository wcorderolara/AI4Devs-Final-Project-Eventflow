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
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DEFAULT_PAGE_SIZE, PageSizeSelector, type PageSize } from '@/shared/ui';
import { useAdminVendorsList } from '../hooks/adminVendorsQueries';
import type {
  AdminVendorListFilters,
  AdminVendorListItem,
  AdminVendorStatus,
} from '../api/adminVendorsApi.types';
import { VendorStatusBadge } from './VendorStatusBadge';
import { VendorModerationDialog, type VendorModerationDialogVendor } from './VendorModerationDialog';
import { VendorFiltersPanel } from './VendorFiltersPanel';

/** Filtro operativo por defecto — Decisión PO D5: el panel abre en `status=pending`. */
const DEFAULT_FILTERS: AdminVendorListFilters = { status: ['pending'], pageSize: DEFAULT_PAGE_SIZE };

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
        <h1 id="admin-vendors-title" className="text-2xl font-bold">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      <VendorFiltersPanel value={filters} onChange={setFilters} />

      <div className="flex justify-end">
        <PageSizeSelector
          value={(filters.pageSize ?? DEFAULT_PAGE_SIZE) as PageSize}
          onChange={(size) => setFilters((f) => ({ ...f, pageSize: size }))}
        />
      </div>

      {query.isPending ? (
        <p role="status" className="text-sm text-neutral-600">
          {t('loading')}
        </p>
      ) : query.isError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
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
                  {t('col.businessName')}
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                  {t('col.owner')}
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
              {items.map((v) => {
                const status = v.status as AdminVendorStatus;
                const isTerminal = status === 'rejected';
                return (
                  <tr key={v.id} data-testid={`admin-vendor-row-${v.id}`}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-neutral-900">{v.businessName}</div>
                      {v.slug ? (
                        <div className="text-xs text-neutral-500">{v.slug}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-neutral-700">{v.owner.email}</td>
                    <td className="px-3 py-2">
                      <VendorStatusBadge status={status} isHidden={v.isHidden} />
                    </td>
                    <td className="px-3 py-2">
                      {v.lastAdminAction ? (
                        <span className="text-xs text-neutral-700">
                          {v.lastAdminAction.action} ·{' '}
                          {new Date(v.lastAdminAction.createdAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
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

      <VendorModerationDialog vendor={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
