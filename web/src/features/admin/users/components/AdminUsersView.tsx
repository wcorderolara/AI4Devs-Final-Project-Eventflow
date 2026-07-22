'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
          <h1 id="admin-users-title" className="text-2xl font-bold">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          disabled={isRefetching}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {isRefetching ? t('actions.refreshing') : t('actions.refresh')}
        </button>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <label className="flex flex-col text-xs font-medium text-neutral-700">
          {t('filters.role')}
          <select
            value={role}
            onChange={(e) => applyFilters({ role: e.target.value })}
            className="mt-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
          >
            <option value="">{t('filters.all')}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tRoles(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-neutral-700">
          {t('filters.status')}
          <select
            value={status}
            onChange={(e) => applyFilters({ status: e.target.value })}
            className="mt-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
          >
            <option value="">{t('filters.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col text-xs font-medium text-neutral-700">
          {t('filters.search')}
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => applyFilters({ q })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters({ q });
            }}
            placeholder={t('filters.searchPlaceholder')}
            className="mt-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
          />
        </label>
      </div>

      {isPending ? (
        <div role="status" aria-busy="true" className="h-40 animate-pulse rounded-md bg-neutral-100" />
      ) : null}

      {isError ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t('error')}
        </div>
      ) : null}

      {data ? (
        <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <th scope="col" className="px-3 py-2">
                  {t('columns.name')}
                </th>
                <th scope="col" className="px-3 py-2">
                  {t('columns.email')}
                </th>
                <th scope="col" className="px-3 py-2">
                  {t('columns.role')}
                </th>
                <th scope="col" className="px-3 py-2">
                  {t('columns.status')}
                </th>
                <th scope="col" className="px-3 py-2">
                  {t('columns.language')}
                </th>
                <th scope="col" className="px-3 py-2">
                  {t('columns.createdAt')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                data.items.map((u) => (
                  <tr key={u.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2 font-medium text-neutral-900">
                      {u.name ?? '—'}
                      {u.isSeed ? (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                          {t('badges.seed')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-neutral-700">{u.email}</td>
                    <td className="px-3 py-2 text-neutral-700">{tRoles(u.role)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          u.status === 'active'
                            ? 'rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700'
                            : 'rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700'
                        }
                      >
                        {t(`status.${u.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-neutral-700">{u.preferredLanguage}</td>
                    <td className="px-3 py-2 text-neutral-600">{formatDate(u.createdAt, locale)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
