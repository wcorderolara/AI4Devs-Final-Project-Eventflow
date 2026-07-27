'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Globe,
  StickyNote,
  Users,
  Wallet,
} from 'lucide-react';
import { Money } from '@/shared/i18n';
import { MetricCard, Tabs, type TabItem } from '@/shared/design-system/data-display';
import { EventChecklistPage } from '@/features/tasks/list';
import { BudgetPage } from '@/features/budget';
import { EventQuotesPanel } from '@/features/quotes';
import { EventActions } from '../components/EventActions';
import { EventStatusBadge } from '../components/EventStatusBadge';
import { useEvent } from '../hooks/useEventsQueries';

/**
 * Dashboard de un evento (US-014 / AC-01). Compone la vista de detalle a partir de
 * `GET /api/v1/events/:id`. Estados loading / error / not-found.
 *
 * Tareas, presupuesto y cotizaciones se montan aquí mismo en un `Tabs` en lugar de vivir sólo en
 * las rutas hijas: las tres vistas ya existían (`/tasks`, `/budget` y el listado de QuoteRequests)
 * pero el dashboard seguía enseñando tres tarjetas «próximamente» del MVP inicial, de modo que
 * desde el detalle del evento no había forma de llegar a ellas.
 *
 * El tab activo se sincroniza con `?tab=` (`replace`, sin scroll) para que la vista sea
 * enlazable y sobreviva a un refresco. Las rutas hijas se conservan: los deeplinks que ya
 * apuntan a ellas (empty states de presupuesto, notificaciones) siguen funcionando.
 *
 * Los paneles se montan sólo cuando su tab está activo: cada uno dispara su propia query y no
 * tiene sentido pagar tres fetches para enseñar uno.
 */
const TAB_IDS = ['tasks', 'budget', 'quotes'] as const;
type TabId = (typeof TAB_IDS)[number];

function isTabId(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as readonly string[]).includes(value);
}

export function EventDashboardPage({ eventId }: { eventId: string }): React.JSX.Element {
  const t = useTranslations('events');
  const { data: event, isLoading, isError, error, refetch } = useEvent(eventId);

  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const rawTab = search.get('tab');
  const activeTab: TabId = isTabId(rawTab) ? rawTab : 'tasks';

  const handleTabChange = useCallback(
    (id: string) => {
      const next = new URLSearchParams(search.toString());
      next.set('tab', id);
      // Los filtros del checklist (`status`, `page`, `range`) viven en el mismo query string;
      // se limpian al cambiar de tab para no arrastrar una página 3 de tareas al volver.
      for (const key of ['status', 'page', 'range', 'categoryCode', 'aiGenerated']) {
        next.delete(key);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, search],
  );

  const notFound =
    isError && typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 404;

  return (
    // El detalle ocupa todo el ancho disponible del shell: los tabs montan vistas de datos
    // (tablero de tareas, tabla de presupuesto, tabla de cotizaciones) que se ahogaban dentro del
    // `max-w-3xl` original.
    <div className="w-full">
      <Link
        href="/organizer/events"
        className="focus-ring group inline-flex items-center gap-2 rounded-button text-body-sm text-secondary transition-colors hover:text-link"
      >
        <ArrowLeft
          aria-hidden="true"
          className="h-icon-sm w-icon-sm transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none"
        />
        {t('dashboard.back')}
      </Link>

      {isLoading ? (
        <div className="mt-4 space-y-4" aria-hidden>
          <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-200" />
          <div className="h-40 animate-pulse rounded bg-neutral-100" />
        </div>
      ) : null}

      {notFound ? (
        <div role="alert" className="mt-6 rounded border border-neutral-300 bg-neutral-50 p-6 text-center">
          <p className="text-neutral-700">{t('dashboard.notFound')}</p>
          <Link href="/organizer/events" className="mt-3 inline-block rounded bg-neutral-900 px-4 py-2 text-sm text-white">
            {t('dashboard.back')}
          </Link>
        </div>
      ) : null}

      {isError && !notFound ? (
        <div role="alert" className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{t('errors.LOAD_FAILED')}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 rounded bg-red-700 px-3 py-1.5 text-white">
            {t('actions.retry')}
          </button>
        </div>
      ) : null}

      {event ? (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-h1 text-primary">
                {event.name || t(`types.${event.eventTypeCode}`)}
              </h1>
              <div className="flex items-center gap-3">
                <EventStatusBadge status={event.status} />
                <span className="inline-flex items-center gap-1.5 text-body-sm text-secondary">
                  <Briefcase aria-hidden="true" className="h-icon-sm w-icon-sm" />
                  {t(`types.${event.eventTypeCode}`)}
                </span>
              </div>
            </div>
            <EventActions event={event} />
          </div>

          {/* Ficha del evento como grid de métricas: cada dato lleva su glifo y el valor se lee
              como cifra, no como par clave/valor en una lista. `MetricCard` ya resuelve el
              formato (label + icono + valor + contenido extra), así que no hay card ad-hoc. */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t('fields.eventDate')}
              value={event.eventDate}
              icon={<CalendarDays />}
            />
            <MetricCard
              label={t('fields.guests')}
              value={String(event.guestsCount)}
              icon={<Users />}
            />
            <MetricCard
              label={t('fields.budget')}
              value={<Money amount={Number(event.estimatedBudget)} currency={event.currencyCode} />}
              icon={<Wallet />}
            />
            {/* Moneda e idioma comparten card: son dos códigos cortos y ocupar dos huecos del
                grid con ellos desequilibra la fila. */}
            <MetricCard
              label={t('dashboard.localeCard')}
              value={event.currencyCode}
              icon={<Globe />}
            >
              <p className="mt-1 text-body-sm text-secondary">
                {t('fields.language')}: <span className="uppercase">{event.languageCode}</span>
              </p>
            </MetricCard>
            {event.notes ? (
              <MetricCard
                className="sm:col-span-2 lg:col-span-4"
                label={t('fields.notes')}
                value={<span className="font-body text-body-md">{event.notes}</span>}
                icon={<StickyNote />}
              />
            ) : null}
          </div>

          <Tabs
            className="mt-10"
            ariaLabel={t('dashboard.sectionsLabel')}
            value={activeTab}
            onChange={handleTabChange}
            items={TAB_ITEMS.map((item) => ({ ...item, label: t(`dashboard.sections.${item.id}`) }))}
            data-testid="event-dashboard-tabs"
          >
            {(tab) => {
              // `completed` / `cancelled` dejan el evento en sólo lectura: las tres secciones
              // ocultan sus acciones de escritura en lugar de dejar que el backend responda 409.
              const readOnly = event.status === 'completed' || event.status === 'cancelled';
              if (tab === 'budget') {
                return <BudgetPage eventId={eventId} readOnly={readOnly} embedded />;
              }
              if (tab === 'quotes') {
                return <EventQuotesPanel eventId={eventId} readOnly={readOnly} />;
              }
              // `eventStatus` no llegaba en la ruta standalone `/tasks` (se montaba sin la prop),
              // así que allí los banners read-only nunca aparecían. Aquí el evento ya está
              // cargado y se propaga.
              return <EventChecklistPage eventId={eventId} eventStatus={event.status} embedded />;
            }}
          </Tabs>
        </>
      ) : null}
    </div>
  );
}

// El label se resuelve en el render (necesita `t`); aquí sólo vive el orden y los ids estables.
const TAB_ITEMS: readonly (Omit<TabItem, 'label'> & { id: TabId })[] = TAB_IDS.map((id) => ({ id }));
