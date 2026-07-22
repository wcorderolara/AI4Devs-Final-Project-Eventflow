'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, Briefcase, Calendar, FileText, Star } from 'lucide-react';
import { MetricCard } from '@/features/admin/metrics';
import { useVendorMetrics } from '../hooks/useVendorMetrics';

function formatWeekRange(startIso: string, endIso: string, locale: string): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

function formatRating(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(1);
}

export function VendorDashboard(): React.JSX.Element {
  const t = useTranslations('vendor.dashboard');
  const locale = useLocale();
  const { data, isPending, isError, refetch, isRefetching } = useVendorMetrics();

  return (
    <section aria-labelledby="vendor-dashboard-title" className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 id="vendor-dashboard-title" className="text-2xl font-bold">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isPending || isRefetching}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {isRefetching ? t('actions.refreshing') : t('actions.refresh')}
        </button>
      </header>

      {isPending ? (
        <div role="status" aria-busy="true" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t('error')}
        </div>
      ) : null}

      {data && !data.hasProfile ? (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{t('onboarding.title')}</p>
          <p className="mt-1">{t('onboarding.body')}</p>
          <Link href="/vendor/onboarding" className="mt-3 inline-block rounded-md border border-amber-600 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
            {t('onboarding.cta')}
          </Link>
        </div>
      ) : null}

      {data && data.hasProfile && data.profile && data.weekRange ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <span>
              <strong>{data.profile.businessName}</strong>
              <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium uppercase text-blue-800">
                {data.profile.status}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <strong>{t('weekBanner', { count: data.bookings.thisWeek })}</strong>
              <span className="text-blue-700">
                ({formatWeekRange(data.weekRange.start, data.weekRange.end, locale)})
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              id="ven-new-requests"
              title={t('cards.newRequests.title')}
              total={data.quotes.newRequests}
              totalAriaLabel={t('cards.newRequests.aria', { count: data.quotes.newRequests })}
              footer={
                <Link href="/vendor/quotes" className="text-xs font-medium text-blue-700 hover:underline">
                  {t('cards.newRequests.link')} →
                </Link>
              }
            />
            <MetricCard
              id="ven-quotes"
              title={t('cards.quotes.title')}
              total={data.quotes.awaitingResponse}
              breakdownTitle={t('cards.quotes.breakdownTitle')}
              breakdown={[
                {
                  key: 'awaitingDecision',
                  label: t('cards.quotes.awaitingDecision'),
                  value: data.quotes.respondedAwaitingDecision,
                },
              ]}
              footer={<p className="text-xs text-neutral-500">{t('cards.quotes.hint')}</p>}
            />
            <MetricCard
              id="ven-bookings"
              title={t('cards.bookings.title')}
              total={data.bookings.thisWeek}
              breakdownTitle={t('cards.bookings.breakdownTitle')}
              breakdown={[
                { key: 'completed', label: t('cards.bookings.completed'), value: data.bookings.totalCompleted },
              ]}
              footer={<p className="text-xs text-neutral-500">{t('cards.bookings.hint')}</p>}
            />
            <MetricCard
              id="ven-reviews"
              title={t('cards.reviews.title')}
              total={data.reviews.total}
              breakdownTitle={t('cards.reviews.breakdownTitle')}
              breakdown={[
                { key: 'published', label: t('cards.reviews.published'), value: data.reviews.published },
                { key: 'hidden', label: t('cards.reviews.hidden'), value: data.reviews.hidden },
                { key: 'removed', label: t('cards.reviews.removed'), value: data.reviews.removed },
              ]}
              footer={
                <p className="text-xs text-neutral-500">
                  {t('cards.reviews.rating', { rating: formatRating(data.reviews.ratingAvg) })}
                </p>
              }
            />
            <MetricCard
              id="ven-notifications"
              title={t('cards.notifications.title')}
              total={data.notifications.unread}
              totalAriaLabel={t('cards.notifications.aria', { count: data.notifications.unread })}
              footer={
                <Link href="/vendor/notifications" className="text-xs font-medium text-blue-700 hover:underline">
                  {t('cards.notifications.link')} →
                </Link>
              }
            />
            <MetricCard
              id="ven-rating"
              title={t('cards.rating.title')}
              total={data.profile.reviewsCount}
              totalAriaLabel={t('cards.rating.aria', {
                count: data.reviews.total,
                rating: formatRating(data.reviews.ratingAvg),
              })}
              footer={
                <div className="flex items-center gap-1 text-xs text-neutral-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <span className="font-semibold">{formatRating(data.reviews.ratingAvg)}</span>
                  <span>· {t('cards.rating.footer')}</span>
                </div>
              }
            />
          </div>

          <section aria-labelledby="ven-quicklinks-title" className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 id="ven-quicklinks-title" className="text-sm font-semibold text-neutral-700">
              {t('quickLinks.title')}
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <li>
                <Link href="/vendor/quotes" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t('quickLinks.quotes')}
                </Link>
              </li>
              <li>
                <Link href="/vendor/portfolio" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50">
                  <Briefcase className="h-4 w-4" aria-hidden="true" />
                  {t('quickLinks.portfolio')}
                </Link>
              </li>
              <li>
                <Link href="/vendor/reviews" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50">
                  <Star className="h-4 w-4" aria-hidden="true" />
                  {t('quickLinks.reviews')}
                </Link>
              </li>
              <li>
                <Link href="/vendor/notifications" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {t('quickLinks.notifications')}
                </Link>
              </li>
            </ul>
          </section>
        </>
      ) : null}
    </section>
  );
}
