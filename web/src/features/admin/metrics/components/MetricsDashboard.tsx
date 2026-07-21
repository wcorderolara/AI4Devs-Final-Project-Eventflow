'use client';

// US-079 (PB-P1-045) / FE-002 — Panel principal del dashboard admin de métricas.
// Compone 7 secciones (users, vendors, events, quotes, bookings, reviews, ai) + timestamp
// `generated_at` + botón "Actualizar" (US-079 / FE-004).
//
// Estados:
//   - loading  → skeleton de cards
//   - error    → banner con retry
//   - success  → grid responsive (1 col mobile, 2 md, 3 lg) + AI card ocupando full width
//
// A11Y:
//   - Región raíz `aria-labelledby` apunta al `<h1>`.
//   - Cada card interna es `role="region"` con su propio heading.
//   - Estado de refresco emite `aria-live="polite"` para lectores de pantalla.
import { useTranslations, useLocale, useFormatter } from 'next-intl';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import type { AdminMetricsDTO } from '../api/adminMetricsApi.types';
import { MetricCard, type MetricCardBreakdownItem } from './MetricCard';
import { AIMetricsCard } from './AIMetricsCard';
import { RefreshButton } from './RefreshButton';

function toBreakdown(
  raw: Record<string, number>,
  labelFor: (key: string) => string,
): MetricCardBreakdownItem[] {
  return Object.entries(raw)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, label: labelFor(key), value }));
}

function formatTimestamp(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SectionsGrid({ data }: { data: AdminMetricsDTO }): React.JSX.Element {
  const t = useTranslations('admin.metrics.sections');
  const tRoles = useTranslations('admin.metrics.roles');
  const tVendorStatus = useTranslations('admin.metrics.vendorStatus');
  const tEventStatus = useTranslations('admin.metrics.eventStatus');
  const tReviewStatus = useTranslations('admin.metrics.reviewStatus');

  const userBreakdown = toBreakdown(data.users.by_role, (k) => tRoles(k as never, {}) || k);
  const vendorBreakdown = toBreakdown(data.vendors.by_status, (k) => tVendorStatus(k as never, {}) || k);
  const eventBreakdown = toBreakdown(data.events.by_status, (k) => tEventStatus(k as never, {}) || k);
  const reviewBreakdown = toBreakdown(data.reviews.by_status, (k) => tReviewStatus(k as never, {}) || k);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        id="metric-users"
        title={t('users')}
        total={data.users.total}
        breakdown={userBreakdown}
        breakdownTitle={t('breakdownByRole')}
      />
      <MetricCard
        id="metric-vendors"
        title={t('vendors')}
        total={data.vendors.total}
        breakdown={vendorBreakdown}
        breakdownTitle={t('breakdownByStatus')}
        footer={t('hiddenCount', { count: data.vendors.hidden_count })}
      />
      <MetricCard
        id="metric-events"
        title={t('events')}
        total={data.events.total}
        breakdown={eventBreakdown}
        breakdownTitle={t('breakdownByStatus')}
      />
      <MetricCard
        id="metric-quotes"
        title={t('quotes')}
        total={data.quotes.quote_requests_created}
        breakdown={[
          { key: 'responded', label: t('quotesLabels.responded'), value: data.quotes.quotes_responded },
          { key: 'accepted', label: t('quotesLabels.accepted'), value: data.quotes.quotes_accepted },
          { key: 'rejected', label: t('quotesLabels.rejected'), value: data.quotes.quotes_rejected },
          { key: 'expired', label: t('quotesLabels.expired'), value: data.quotes.quotes_expired },
        ]}
        breakdownTitle={t('quotesBreakdownTitle')}
        footer={t('quotesRequestedLabel')}
      />
      <MetricCard
        id="metric-bookings"
        title={t('bookings')}
        total={data.bookings.booking_intents_created}
        breakdown={[
          {
            key: 'confirmed',
            label: t('bookingsLabels.confirmed'),
            value: data.bookings.booking_intents_confirmed,
          },
          {
            key: 'cancelled',
            label: t('bookingsLabels.cancelled'),
            value: data.bookings.booking_intents_cancelled,
          },
        ]}
        breakdownTitle={t('bookingsBreakdownTitle')}
      />
      <MetricCard
        id="metric-reviews"
        title={t('reviews')}
        total={data.reviews.total}
        breakdown={reviewBreakdown}
        breakdownTitle={t('breakdownByStatus')}
      />
      <AIMetricsCard id="metric-ai" title={t('ai')} ai={data.ai} />
    </div>
  );
}

function SkeletonGrid(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-neutral-100" />
      ))}
    </div>
  );
}

export function MetricsDashboard(): React.JSX.Element {
  const t = useTranslations('admin.metrics');
  const locale = useLocale();
  const format = useFormatter();
  void format;
  const query = useAdminMetrics();

  return (
    <section aria-labelledby="admin-metrics-title" className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 id="admin-metrics-title" className="text-2xl font-bold">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {query.data ? (
            <span
              className="text-xs text-neutral-500"
              aria-live="polite"
            >
              {t('generatedAt', {
                timestamp: formatTimestamp(query.data.generated_at, locale),
              })}
            </span>
          ) : null}
          <RefreshButton
            onClick={() => {
              void query.refetch();
            }}
            isRefetching={query.isRefetching}
          />
        </div>
      </header>

      {query.isPending ? <SkeletonGrid /> : null}

      {query.isError ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{t('error')}</p>
        </div>
      ) : null}

      {query.data ? <SectionsGrid data={query.data} /> : null}
    </section>
  );
}
