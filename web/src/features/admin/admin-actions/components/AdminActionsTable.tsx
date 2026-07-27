'use client';

// US-080 / FE-002 — Tabla admin del audit log AdminAction con row expansion para ver el
// payload JSON completo. Semántica accesible: `<table>` + `<caption sr-only>` +
// `<th scope="col">`; el botón "Ver detalle" es un toggle con `aria-expanded` +
// `aria-controls` que apunta a la `<tr>` de expansión (`role="region"` en el hijo).
//
// PB-P2-033: compone las primitivas `Table` del design system. La semántica accesible ya era
// correcta (caption, `scope="col"`, `aria-expanded`/`aria-controls`); lo que cambia es que el
// color, la densidad y los estados dejan de ser clases de paleta cruda (`neutral-*`, `red-*`)
// y pasan a los tokens semánticos.
import { Fragment, useId, useMemo, useState } from 'react';
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
    return <span className="text-muted">{t('admin.system')}</span>;
  }
  const primary = admin.businessName ?? admin.email ?? admin.id;
  const secondary = admin.businessName && admin.email ? admin.email : null;
  return (
    <span className="block">
      <span className="block">{primary}</span>
      {secondary ? <span className="block text-caption text-muted">{secondary}</span> : null}
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
      <p role="status" className="font-body text-body-sm text-secondary">
        {t('loading')}
      </p>
    );
  }

  if (query.isError) {
    return <ErrorState title={t('error')} />;
  }

  if (items.length === 0) {
    return <EmptyState title={t('empty')} />;
  }

  const locale = typeof navigator !== 'undefined' ? navigator.language : 'es-419';

  return (
    <div className="space-y-3">
      <Table
        caption={t('caption')}
        density="compact"
        containerClassName="rounded-card border border-subtle bg-surface"
      >
        <TableHead>
          <TableRow>
            <TableHeaderCell density="compact">{t('col.createdAt')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('col.admin')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('col.targetType')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('col.targetId')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('col.action')}</TableHeaderCell>
            <TableHeaderCell density="compact" align="end">
              {t('col.actions')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((row) => {
            const rowLabelId = `${rowIdPrefix}-row-${row.id}`;
            const regionId = `${rowIdPrefix}-region-${row.id}`;
            const isExpanded = expandedRowId === row.id;
            return (
              <Fragment key={row.id}>
                <TableRow>
                  <TableCell density="compact">{formatDateTime(row.created_at, locale)}</TableCell>
                  <TableCell density="compact">
                    <AdminDisplay admin={row.admin} />
                  </TableCell>
                  <TableCell density="compact">{row.target_type}</TableCell>
                  <TableCell density="compact" className="font-mono text-caption">
                    <span title={row.target_id}>{truncate(row.target_id)}</span>
                  </TableCell>
                  <TableCell density="compact" id={rowLabelId} className="font-medium">
                    {row.action}
                  </TableCell>
                  <TableCell density="compact" align="end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setExpandedRowId((current) => (current === row.id ? null : row.id))
                      }
                      aria-expanded={isExpanded}
                      aria-controls={regionId}
                    >
                      {isExpanded ? t('collapse') : t('view')}
                    </Button>
                  </TableCell>
                </TableRow>
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
        </TableBody>
      </Table>

      {query.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? t('loadingMore') : t('loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
