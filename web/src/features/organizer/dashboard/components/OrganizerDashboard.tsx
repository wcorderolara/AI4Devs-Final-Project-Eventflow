'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { CalendarPlus, Store } from 'lucide-react';
import { useEventsList, useEventTypes, useLocations, type EventModel } from '@/features/events';
import { useSession } from '@/shared/auth-session';
import { ActionLink, Button } from '@/shared/design-system';
import { useOrganizerMetrics } from '../hooks/useOrganizerMetrics';

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` de hoy en UTC: las fechas de evento se guardan a medianoche UTC. */
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(eventDateIso: string): number {
  const today = Date.parse(`${todayIsoDate()}T00:00:00Z`);
  return Math.max(0, Math.round((Date.parse(eventDateIso) - today) / DAY_MS));
}

function formatWeekRange(startIso: string, endIso: string, locale: string): string {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

/**
 * Panel del organizador.
 *
 * Lo primero es **el próximo evento**, presentado como una invitación: el día en grande, el mes,
 * el nombre y la cuenta regresiva, con acceso directo a abrirlo. Es lo que una persona que
 * organiza su propio evento necesita ver al entrar; las métricas pasan a una fila de lectura
 * rápida debajo, en vez de seis cajas iguales.
 *
 * El próximo evento es el activo o en borrador más cercano a partir de hoy. Si no hay ninguno,
 * se dice así y se ofrece crear uno: nunca una cuenta regresiva negativa.
 */
export function OrganizerDashboard(): React.JSX.Element {
  const t = useTranslations('organizer.dashboard');
  const locale = useLocale();
  const { user } = useSession();
  const metrics = useOrganizerMetrics();
  const upcoming = useEventsList({ eventDateFrom: todayIsoDate(), sort: 'eventDate:asc', pageSize: 10 });

  const nextEvent = useMemo<EventModel | undefined>(
    () => upcoming.data?.items.find((e) => e.status === 'active' || e.status === 'draft'),
    [upcoming.data],
  );

  const firstName = user?.displayName?.split(' ')[0];
  const data = metrics.data;

  return (
    <section aria-labelledby="organizer-dashboard-title" className="mx-auto max-w-content space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            id="organizer-dashboard-title"
            className="font-display text-[2.25rem] font-medium leading-tight text-primary sm:text-[2.75rem]"
          >
            {firstName ? t('greeting', { name: firstName }) : t('title')}
          </h1>
          <p className="mt-2 font-body text-body-md text-secondary">
            {data
              ? `${t('weekBanner', { count: data.events.thisWeek })} (${formatWeekRange(
                  data.weekRange.start,
                  data.weekRange.end,
                  locale,
                )})`
              : t('subtitle')}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void metrics.refetch();
            void upcoming.refetch();
          }}
          disabled={metrics.isPending || metrics.isRefetching}
        >
          {metrics.isRefetching ? t('actions.refreshing') : t('actions.refresh')}
        </Button>
      </header>

      <NextEventCard event={nextEvent} isLoading={upcoming.isPending} locale={locale} />

      {metrics.isError ? (
        <div role="alert" className="border border-feedback-error bg-feedback-error p-4 text-body-sm text-feedback-error">
          {t('error')}
        </div>
      ) : null}

      <section aria-labelledby="org-activity-title">
        <h2 id="org-activity-title" className="font-heading text-body-lg font-semibold text-primary">
          {t('activity.heading')}
        </h2>
        {metrics.isPending ? (
          <div role="status" aria-busy="true" className="mt-4 h-28 animate-pulse bg-surface-disabled" />
        ) : null}
        {data ? (
          <dl className="mt-4 grid grid-cols-2 border-y border-subtle sm:grid-cols-3 lg:grid-cols-6">
            <Ledger
              id="org-events"
              label={t('cards.events.title')}
              value={data.events.total}
              detail={t('activity.eventsDetail', {
                active: data.events.byStatus.active,
                draft: data.events.byStatus.draft,
              })}
              href="/organizer/events"
              linkLabel={t('cards.events.link')}
            />
            <Ledger
              id="org-tasks"
              label={t('cards.tasks.title')}
              value={data.tasks.pending}
              ariaLabel={t('cards.tasks.aria', { count: data.tasks.pending })}
              detail={t('cards.tasks.hint')}
            />
            <Ledger
              id="org-quotes"
              label={t('cards.quotes.title')}
              value={data.quotes.requestsSent}
              detail={t('activity.quotesDetail', {
                accepted: data.quotes.accepted,
                received: data.quotes.received,
              })}
            />
            <Ledger
              id="org-bookings"
              label={t('cards.bookings.title')}
              value={data.bookings.confirmed}
              ariaLabel={t('cards.bookings.aria', { count: data.bookings.confirmed })}
              detail={t('cards.bookings.hint')}
              tone="money"
            />
            <Ledger
              id="org-reviews"
              label={t('cards.reviews.title')}
              value={data.reviews.written}
              ariaLabel={t('cards.reviews.aria', { count: data.reviews.written })}
              detail={t('cards.reviews.hint')}
            />
            <Ledger
              id="org-notifications"
              label={t('cards.notifications.title')}
              value={data.notifications.unread}
              ariaLabel={t('cards.notifications.aria', { count: data.notifications.unread })}
              href="/organizer/notifications"
              linkLabel={t('cards.notifications.link')}
            />
          </dl>
        ) : null}
      </section>

      <nav aria-label={t('quickLinks.title')} className="flex flex-wrap gap-3">
        {/* Sin próximo evento, "Crear evento" ya es la acción principal del estado vacío. */}
        {nextEvent ? (
          <ActionLink href="/organizer/events/new" variant="secondary" leadingIcon={<CalendarPlus />}>
            {t('quickLinks.newEvent')}
          </ActionLink>
        ) : null}
        <ActionLink href="/organizer/vendors" variant="secondary" leadingIcon={<Store />}>
          {t('quickLinks.browseVendors')}
        </ActionLink>
      </nav>
    </section>
  );
}

interface NextEventCardProps {
  event: EventModel | undefined;
  isLoading: boolean;
  locale: string;
}

function NextEventCard({ event, isLoading, locale }: NextEventCardProps): React.JSX.Element {
  const t = useTranslations('organizer.dashboard.nextEvent');
  const eventTypes = useEventTypes();
  const locations = useLocations();

  if (isLoading) {
    return <div role="status" aria-busy="true" className="h-56 animate-pulse bg-surface-disabled" />;
  }

  if (!event) {
    return (
      <section
        aria-labelledby="org-next-event-title"
        data-testid="org-next-event-empty"
        className="border border-dashed border-default bg-surface px-6 py-10 sm:px-10"
      >
        <h2 id="org-next-event-title" className="font-display text-[1.75rem] font-medium leading-snug text-primary">
          {t('emptyTitle')}
        </h2>
        <p className="mt-2 max-w-[52ch] font-body text-body-md text-secondary">{t('emptyBody')}</p>
        <div className="mt-6">
          <ActionLink href="/organizer/events/new" variant="primary" leadingIcon={<CalendarPlus />}>
            {t('emptyCta')}
          </ActionLink>
        </div>
      </section>
    );
  }

  const date = new Date(event.eventDate);
  const fmt = (options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date);
  const typeLabel = eventTypes.data?.find((type) => type.code === event.eventTypeCode)?.label;
  const location = locations.data?.find((loc) => loc.id === event.locationId);
  const place = location ? [location.city, location.region].filter(Boolean).join(', ') : undefined;
  const days = daysUntil(event.eventDate);
  const meta = [typeLabel, t('guests', { count: event.guestsCount }), place].filter(Boolean);

  return (
    <section
      aria-labelledby="org-next-event-title"
      data-testid="org-next-event"
      className="grid gap-6 border border-subtle bg-surface p-6 shadow-surface-subtle sm:grid-cols-[auto_1fr] sm:gap-10 sm:p-10"
    >
      <p className="font-ui text-body-sm text-secondary sm:col-span-2">{t('heading')}</p>

      <div className="flex items-baseline gap-4 sm:block sm:border-r sm:border-subtle sm:pr-10 sm:text-center">
        <p className="font-display text-[4.5rem] font-medium leading-none text-link sm:text-[6rem]">
          {fmt({ day: 'numeric' })}
        </p>
        <div>
          <p className="font-display text-h3 italic text-primary">{fmt({ month: 'long' })}</p>
          <p className="font-ui text-body-sm text-muted">{fmt({ year: 'numeric' })}</p>
        </div>
      </div>

      <div className="min-w-0 self-center">
        <h2
          id="org-next-event-title"
          className="font-display text-[2rem] font-medium leading-tight text-primary sm:text-[2.5rem]"
        >
          {event.name}
        </h2>
        {meta.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-ui text-body-sm text-secondary">
            {meta.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-4 font-ui text-body-lg font-semibold text-link">{t('countdown', { days })}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ActionLink href={`/organizer/events/${event.id}`} variant="primary">
            {t('open')}
          </ActionLink>
          <ActionLink href={`/organizer/events/${event.id}/tasks`} variant="secondary">
            {t('tasks')}
          </ActionLink>
        </div>
      </div>
    </section>
  );
}

interface LedgerProps {
  id: string;
  label: string;
  value: number;
  ariaLabel?: string;
  detail?: string;
  href?: string;
  linkLabel?: string;
  /** `money`: reservas confirmadas = compromisos con proveedores, en jade. */
  tone?: 'default' | 'money';
}

/** Una cifra del libro de cuentas del panel: etiqueta, número y una línea de contexto. */
function Ledger({ id, label, value, ariaLabel, detail, href, linkLabel, tone = 'default' }: LedgerProps): React.JSX.Element {
  return (
    <div
      data-testid={id}
      className="border-subtle px-4 py-5 [&:not(:first-child)]:border-l max-lg:[&:nth-child(odd)]:border-l-0 sm:max-lg:[&:nth-child(odd)]:border-l sm:max-lg:[&:nth-child(3n+1)]:border-l-0"
    >
      <dt className="font-ui text-body-sm text-secondary">{label}</dt>
      <dd
        aria-label={ariaLabel}
        className={`mt-2 font-ui text-[2rem] font-semibold leading-none tabular-nums ${
          tone === 'money' ? 'text-feedback-success' : 'text-primary'
        }`}
      >
        {value}
      </dd>
      {detail ? <dd className="mt-2 font-ui text-caption text-muted">{detail}</dd> : null}
      {href && linkLabel ? (
        <dd className="mt-2">
          <Link href={href} className="focus-ring font-ui text-caption font-semibold text-link hover:underline">
            {linkLabel}
          </Link>
        </dd>
      ) : null}
    </div>
  );
}
