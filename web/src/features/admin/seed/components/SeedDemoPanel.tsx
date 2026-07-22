'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { useSeedStatus } from '../hooks/useAdminSeed';
import type { SeedResetReportDTO } from '../api/adminSeedApi.types';
import { SeedResetDialog } from './SeedResetDialog';

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function CountsTable({
  counts,
  caption,
  entityLabel,
  countLabel,
}: {
  counts: Record<string, number>;
  caption: string;
  entityLabel: string;
  countLabel: string;
}): React.JSX.Element {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200">
      <table className="min-w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-600">
          <tr>
            <th scope="col" className="px-3 py-2 text-left">
              {entityLabel}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {countLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-t border-neutral-100">
              <td className="px-3 py-1.5 text-neutral-800">{k}</td>
              <td className="px-3 py-1.5 text-right font-mono text-neutral-900">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeedDemoPanel(): React.JSX.Element {
  const t = useTranslations('admin.seed');
  const locale = useLocale();
  const { data, isPending, isError, refetch, isRefetching } = useSeedStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastReport, setLastReport] = useState<SeedResetReportDTO | null>(null);

  return (
    <section aria-labelledby="admin-seed-title" className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 id="admin-seed-title" className="text-2xl font-bold">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefetching || isPending}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {isRefetching ? t('actions.refreshing') : t('actions.refresh')}
          </button>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {t('actions.reset')}
          </button>
        </div>
      </header>

      <div
        role="note"
        className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{t('warning')}</p>
      </div>

      {isPending ? (
        <div role="status" aria-busy="true" className="h-40 animate-pulse rounded-md bg-neutral-100" />
      ) : null}

      {isError ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t('errors.statusLoad')}
        </div>
      ) : null}

      {data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-700">{t('status.title')}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-600">{t('status.lastRunAt')}</dt>
                <dd className="font-medium text-neutral-900">
                  {formatDateTime(data.lastRunAt, locale)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-600">{t('status.preset')}</dt>
                <dd className="font-medium text-neutral-900">
                  {data.preset ?? '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t('status.counts')}</h2>
            <CountsTable
              counts={data.recordCount}
              caption={t('status.counts')}
              entityLabel={t('status.entity')}
              countLabel={t('status.count')}
            />
          </div>
        </div>
      ) : null}

      {lastReport ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <h2 className="text-sm font-semibold text-green-900">
            {t('report.title')} <span className="font-mono text-xs">({lastReport.seedVersion})</span>
          </h2>
          <p className="mt-1 text-xs text-green-800">
            {t('report.duration', { ms: lastReport.durationMs })}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                {t('report.deleted')}
              </h3>
              <CountsTable
                counts={lastReport.entitiesDeleted}
                caption={t('report.deleted')}
                entityLabel={t('status.entity')}
                countLabel={t('status.count')}
              />
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                {t('report.reseeded')}
              </h3>
              <CountsTable
                counts={lastReport.entitiesReseeded}
                caption={t('report.reseeded')}
                entityLabel={t('status.entity')}
                countLabel={t('status.count')}
              />
            </div>
          </div>
        </div>
      ) : null}

      <SeedResetDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onReset={setLastReport}
      />
    </section>
  );
}
