'use client';

// PB-P2-033: las tablas de conteos pasan a las primitivas `Table` del design system.
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  DescriptionList,
  DescriptionListItem,
  ErrorState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/design-system';
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
    <Table
      caption={caption}
      density="compact"
      containerClassName="rounded-card border border-subtle"
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell density="compact">{entityLabel}</TableHeaderCell>
          <TableHeaderCell density="compact" align="numeric">
            {countLabel}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell density="compact">{k}</TableCell>
            <TableCell density="compact" align="numeric">
              {v}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
          <h1 id="admin-seed-title" className="font-heading text-h2 font-semibold text-primary">
            {t('title')}
          </h1>
          <p className="mt-1 font-body text-body-sm text-secondary">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            disabled={isRefetching || isPending}
            isLoading={isRefetching}
            loadingLabel={t('actions.refreshing')}
          >
            {t('actions.refresh')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDialogOpen(true)}
            leadingIcon={<AlertTriangle />}
          >
            {t('actions.reset')}
          </Button>
        </div>
      </header>

      <Alert variant="warning">{t('warning')}</Alert>

      {isPending ? (
        <div role="status" aria-busy="true">
          <Skeleton variant="card" />
        </div>
      ) : null}

      {isError ? <ErrorState title={t('errors.statusLoad')} /> : null}

      {data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card padding="sm">
            <h2 className="font-ui text-label font-semibold text-secondary">{t('status.title')}</h2>
            <DescriptionList className="mt-3">
              <DescriptionListItem term={t('status.lastRunAt')}>
                {formatDateTime(data.lastRunAt, locale)}
              </DescriptionListItem>
              <DescriptionListItem term={t('status.preset')} emptyText="—">
                {data.preset ?? undefined}
              </DescriptionListItem>
            </DescriptionList>
          </Card>

          <div>
            <h2 className="mb-2 font-ui text-label font-semibold text-secondary">
              {t('status.counts')}
            </h2>
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
        <Alert
          variant="success"
          live
          title={
            <>
              {t('report.title')}{' '}
              <span className="font-mono text-caption">({lastReport.seedVersion})</span>
            </>
          }
        >
          <p className="text-caption">{t('report.duration', { ms: lastReport.durationMs })}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <h3 className="mb-1 font-ui text-caption font-semibold uppercase tracking-ef-wide text-secondary">
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
              <h3 className="mb-1 font-ui text-caption font-semibold uppercase tracking-ef-wide text-secondary">
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
        </Alert>
      ) : null}

      <SeedResetDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onReset={setLastReport}
      />
    </section>
  );
}
