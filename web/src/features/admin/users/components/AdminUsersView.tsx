'use client';

// PB-P2-033: la tabla de usuarios pasa a las primitivas `Table` del design system; los badges
// de estado y de dato sembrado a `StatusBadge` / `Badge`, y los estados de carga / error /
// vacío a `Skeleton` / `ErrorState` / `TableStatusRow` + `EmptyState`.
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  SearchInput,
  Select,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableStatusRow,
} from '@/shared/design-system';
import { DEFAULT_PAGE_SIZE, Pagination, type PageSize } from '@/shared/ui';
import { useAdminUsers } from '../hooks/useAdminUsers';
import type { AdminUserRole, AdminUserStatus, AdminUsersQuery } from '../api/adminUsersApi.types';

const ROLES: AdminUserRole[] = ['organizer', 'vendor', 'admin'];
const STATUSES: AdminUserStatus[] = ['active', 'suspended'];

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminUsersView(): React.JSX.Element {
  const t = useTranslations('admin.users');
  const tRoles = useTranslations('admin.metrics.roles');
  const locale = useLocale();

  const [role, setRole] = useState<AdminUserRole | ''>('');
  const [status, setStatus] = useState<AdminUserStatus | ''>('');
  const [q, setQ] = useState<string>('');
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const query: AdminUsersQuery = {
    role: role || undefined,
    status: status || undefined,
    q: q.trim() || undefined,
    cursor,
    limit: pageSize,
  };
  const { data, isPending, isError, refetch, isRefetching } = useAdminUsers(query);

  function resetPagination(): void {
    setCursor(undefined);
    setCursorStack([]);
  }

  function applyFilters(next: Partial<{ role: string; status: string; q: string }>): void {
    if ('role' in next) setRole((next.role ?? '') as AdminUserRole | '');
    if ('status' in next) setStatus((next.status ?? '') as AdminUserStatus | '');
    if ('q' in next) setQ(next.q ?? '');
    resetPagination();
  }

  function handlePageSizeChange(size: PageSize): void {
    setPageSize(size);
    resetPagination();
  }

  function goNext(): void {
    const next = data?.pagination.nextCursor;
    if (!next) return;
    setCursorStack((s) => [...s, cursor ?? '']);
    setCursor(next);
  }

  function goPrev(): void {
    setCursorStack((s) => {
      const copy = [...s];
      const prev = copy.pop();
      setCursor(prev === '' ? undefined : prev);
      return copy;
    });
  }

  return (
    <section aria-labelledby="admin-users-title" className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 id="admin-users-title" className="font-heading text-h2 font-semibold text-primary">
            {t('title')}
          </h1>
          <p className="mt-1 font-body text-body-sm text-secondary">{t('subtitle')}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void refetch();
          }}
          disabled={isRefetching}
          isLoading={isRefetching}
          loadingLabel={t('actions.refreshing')}
        >
          {t('actions.refresh')}
        </Button>
      </header>

      {/* Los filtros comparten la superficie operativa del design system (`Card` sutil) y
          consumen `FormField` + `Select` / `SearchInput`: el label deja de ser un `<label>`
          envolvente con clases crudas y pasa a la asociación explícita id ↔ control. */}
      <Card variant="subtle" padding="sm" className="flex flex-wrap items-end gap-3">
        <FormField label={t('filters.role')}>
          {(control) => (
            <Select
              {...control}
              selectSize="sm"
              fullWidth={false}
              value={role}
              onChange={(e) => applyFilters({ role: e.target.value })}
              placeholder={t('filters.all')}
              options={ROLES.map((r) => ({ value: r, label: tRoles(r) }))}
            />
          )}
        </FormField>
        <FormField label={t('filters.status')}>
          {(control) => (
            <Select
              {...control}
              selectSize="sm"
              fullWidth={false}
              value={status}
              onChange={(e) => applyFilters({ status: e.target.value })}
              placeholder={t('filters.all')}
              options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            />
          )}
        </FormField>
        <FormField label={t('filters.search')} className="min-w-[220px] flex-1">
          {(control) => (
            <SearchInput
              {...control}
              inputSize="sm"
              value={q}
              clearLabel={t('filters.clearSearch')}
              onClear={() => applyFilters({ q: '' })}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => applyFilters({ q })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters({ q });
              }}
              placeholder={t('filters.searchPlaceholder')}
            />
          )}
        </FormField>
      </Card>

      {isPending ? (
        <div role="status" aria-busy="true">
          <Skeleton variant="tableRow" count={5} />
        </div>
      ) : null}

      {isError ? <ErrorState title={t('error')} /> : null}

      {data ? (
        <Table
          caption={t('title')}
          density="compact"
          containerClassName="rounded-card border border-subtle bg-surface"
        >
          <TableHead>
            <TableRow>
              <TableHeaderCell density="compact">{t('columns.name')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('columns.email')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('columns.role')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('columns.status')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('columns.language')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('columns.createdAt')}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.length === 0 ? (
              // El vacío vive DENTRO del `<tbody>`: sacarlo fuera dejaría la tabla anunciada
              // como «tabla con 0 filas» sin explicación (Component Foundations §23).
              <TableStatusRow colSpan={6} live>
                <EmptyState title={t('empty')} variant="compact" />
              </TableStatusRow>
            ) : (
              data.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell density="compact" header>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {u.name ?? '—'}
                      {u.isSeed ? <Badge variant="seed">{t('badges.seed')}</Badge> : null}
                    </span>
                  </TableCell>
                  <TableCell density="compact">{u.email}</TableCell>
                  <TableCell density="compact">{tRoles(u.role)}</TableCell>
                  <TableCell density="compact">
                    <StatusBadge status={u.status === 'active' ? 'success' : 'warning'}>
                      {t(`status.${u.status}`)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell density="compact">{u.preferredLanguage}</TableCell>
                  <TableCell density="compact">{formatDate(u.createdAt, locale)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      ) : null}

      {data ? (
        <Pagination
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={cursorStack.length > 0}
          hasNext={Boolean(data.pagination.nextCursor)}
          currentCount={data.pagination.pageSize}
        />
      ) : null}
    </section>
  );
}
