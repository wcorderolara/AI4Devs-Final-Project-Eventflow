'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, Calendar, CheckSquare, ShoppingCart } from 'lucide-react';
import { MetricCard } from '@/features/admin/metrics';
import { useOrganizerMetrics } from '../hooks/useOrganizerMetrics';

function formatWeekRange(startIso: string, endIso: string, locale: string): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

export function OrganizerDashboard(): React.JSX.Element {
  const t = useTranslations('organizer.dashboard');
  const locale = useLocale();
  const { data, isPending, isError, refetch, isRefetching } = useOrganizerMetrics();

  return (
    <section aria-labelledby="organizer-dashboard-title" className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 id="organizer-dashboard-title" className="text-2xl font-bold">
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

      {data ? (
        <>
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <strong>{t('weekBanner', { count: data.events.thisWeek })}</strong>
              <span className="text-blue-700">
                ({formatWeekRange(data.weekRange.start, data.weekRange.end, locale)})
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              id="org-events"
              title={t('cards.events.title')}
              total={data.events.total}
              breakdownTitle={t('cards.events.breakdownTitle')}
              breakdown={[
                { key: 'draft', label: t('cards.events.status.draft'), value: data.events.byStatus.draft },
                { key: 'active', label: t('cards.events.status.active'), value: data.events.byStatus.active },
                { key: 'completed', label: t('cards.events.status.completed'), value: data.events.byStatus.completed },
                { key: 'cancelled', label: t('cards.events.status.cancelled'), value: data.events.byStatus.cancelled },
              ]}
              footer={
                <Link href="/organizer/events" className="text-xs font-medium text-blue-700 hover:underline">
                  {t('cards.events.link')} →
                </Link>
              }
            />
            <MetricCard
              id="org-tasks"
              title={t('cards.tasks.title')}
              total={data.tasks.pending}
              totalAriaLabel={t('cards.tasks.aria', { count: data.tasks.pending })}
              footer={<p className="text-xs text-neutral-500">{t('cards.tasks.hint')}</p>}
            />
            <MetricCard
              id="org-quotes"
              title={t('cards.quotes.title')}
              total={data.quotes.requestsSent}
              breakdownTitle={t('cards.quotes.breakdownTitle')}
              breakdown={[
                { key: 'received', label: t('cards.quotes.received'), value: data.quotes.received },
                { key: 'accepted', label: t('cards.quotes.accepted'), value: data.quotes.accepted },
              ]}
              footer={<p className="text-xs text-neutral-500">{t('cards.quotes.footer')}</p>}
            />
            <MetricCard
              id="org-bookings"
              title={t('cards.bookings.title')}
              total={data.bookings.confirmed}
              totalAriaLabel={t('cards.bookings.aria', { count: data.bookings.confirmed })}
              footer={<p className="text-xs text-neutral-500">{t('cards.bookings.hint')}</p>}
            />
            <MetricCard
              id="org-reviews"
              title={t('cards.reviews.title')}
              total={data.reviews.written}
              totalAriaLabel={t('cards.reviews.aria', { count: data.reviews.written })}
              footer={<p className="text-xs text-neutral-500">{t('cards.reviews.hint')}</p>}
            />
            <MetricCard
              id="org-notifications"
              title={t('cards.notifications.title')}
              total={data.notifications.unread}
              totalAriaLabel={t('cards.notifications.aria', { count: data.notifications.unread })}
              footer={
                <Link href="/organizer/notifications" className="text-xs font-medium text-blue-700 hover:underline">
                  {t('cards.notifications.link')} →
                </Link>
              }
            />
          </div>

          <section aria-labelledby="org-quicklinks-title" className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 id="org-quicklinks-title" className="text-sm font-semibold text-neutral-700">
              {t('quickLinks.title')}
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <li>
                <Link href="/organizer/events/new" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {t('quickLinks.newEvent')}
                </Link>
              </li>
              <li>
                <Link href="/organizer/vendors" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50">
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  {t('quickLinks.browseVendors')}
                </Link>
              </li>
              <li>
                <Link href="/organizer/events" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50">
                  <CheckSquare className="h-4 w-4" aria-hidden="true" />
                  {t('quickLinks.tasks')}
                </Link>
              </li>
              <li>
                <Link href="/organizer/notifications" className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50">
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
