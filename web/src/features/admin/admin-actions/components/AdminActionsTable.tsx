'use client';

// US-080 / FE-002 — Tabla admin del audit log AdminAction con row expansion para ver el
// payload JSON completo. Semántica accesible: `<table>` + `<caption sr-only>` +
// `<th scope="col">`; el botón "Ver detalle" es un toggle con `aria-expanded` +
// `aria-controls` que apunta a la `<tr>` de expansión (`role="region"` en el hijo).
import { Fragment, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  AdminActionListItemModel,
  AdminActionsListFilters,
} from '../api/adminActionsApi.types';
import { useAdminActionsList } from '../hooks/adminActionsQueries';
import { AdminActionRowExpansion } from './AdminActionRowExpansion';

interface Props {
  filters: AdminActionsListFilters;
}

const COLUMN_COUNT = 6;

function formatDateTime(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function truncate(value: string, max = 12): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function AdminDisplay({ admin }: { admin: AdminActionListItemModel['admin'] }): React.JSX.Element {
  const t = useTranslations('admin.admin-actions.list');
  if (admin.id === null) {
    return <span className="text-neutral-500">{t('admin.system')}</span>;
  }
  const primary = admin.businessName ?? admin.email ?? admin.id;
  const secondary = admin.businessName && admin.email ? admin.email : null;
  return (
    <span className="block">
      <span className="block">{primary}</span>
      {secondary ? (
        <span className="block text-xs text-neutral-500">{secondary}</span>
      ) : null}
    </span>
  );
}

export function AdminActionsTable({ filters }: Props): React.JSX.Element {
  const t = useTranslations('admin.admin-actions.list');
  const rowIdPrefix = useId();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const query = useAdminActionsList(filters);

  const items = useMemo<AdminActionListItemModel[]>(
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

  const locale = typeof navigator !== 'undefined' ? navigator.language : 'es-419';

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <caption className="sr-only">{t('caption')}</caption>
          <thead className="bg-neutral-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.createdAt')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.admin')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.targetType')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.targetId')}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-neutral-700">
                {t('col.action')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-neutral-700">
                {t('col.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {items.map((row) => {
              const rowLabelId = `${rowIdPrefix}-row-${row.id}`;
              const regionId = `${rowIdPrefix}-region-${row.id}`;
              const isExpanded = expandedRowId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr>
                    <td className="px-3 py-2 text-neutral-700">
                      {formatDateTime(row.created_at, locale)}
                    </td>
                    <td className="px-3 py-2 text-neutral-700">
                      <AdminDisplay admin={row.admin} />
                    </td>
                    <td className="px-3 py-2 text-neutral-700">{row.target_type}</td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-700">
                      <span title={row.target_id}>{truncate(row.target_id)}</span>
                    </td>
                    <td id={rowLabelId} className="px-3 py-2 font-medium text-neutral-900">
                      {row.action}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRowId((current) => (current === row.id ? null : row.id))
                        }
                        aria-expanded={isExpanded}
                        aria-controls={regionId}
                        className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-800 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                      >
                        {isExpanded ? t('collapse') : t('view')}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <AdminActionRowExpansion
                      regionId={regionId}
                      labelledById={rowLabelId}
                      reason={row.reason}
                      payload={row.payload}
                      colSpan={COLUMN_COUNT}
                    />
                  ) : null}
                </Fragment>
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

