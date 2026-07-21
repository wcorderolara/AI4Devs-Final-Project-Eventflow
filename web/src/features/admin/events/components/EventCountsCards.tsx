'use client';

// US-078 / FE-002 — Grid de "cards" con agregados de sub-entidades del evento (Tech Spec §7).
// Complementa `AdminEventViewer` en la vista de detalle. Cada card muestra `label` + `value`.
//
// A11Y: `<ul>` semántico con `<li>` por card; cada valor es un `<span>` con `aria-label` que
// combina label + número (útil para lectores de pantalla).
import { useTranslations } from 'next-intl';
import { Money } from '@/shared/i18n';
import type {
  AdminEventBudgetSummaryModel,
  AdminEventCountsModel,
} from '../api/adminEventsApi.types';

interface Props {
  counts: AdminEventCountsModel;
  budgetSummary?: AdminEventBudgetSummaryModel | null;
  currency?: string;
}

interface Card {
  key: keyof AdminEventCountsModel;
  labelKey: string;
}

const CARDS: readonly Card[] = [
  { key: 'tasks', labelKey: 'tasks' },
  { key: 'tasksCompleted', labelKey: 'tasksCompleted' },
  { key: 'quoteRequests', labelKey: 'quoteRequests' },
  { key: 'quoteRequestsActive', labelKey: 'quoteRequestsActive' },
  { key: 'quotes', labelKey: 'quotes' },
  { key: 'quotesAccepted', labelKey: 'quotesAccepted' },
  { key: 'bookingIntents', labelKey: 'bookingIntents' },
  { key: 'bookingIntentsConfirmed', labelKey: 'bookingIntentsConfirmed' },
  { key: 'aiRecommendations', labelKey: 'aiRecommendations' },
];

function parseAmount(value: string): number | null {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function EventCountsCards({
  counts,
  budgetSummary,
  currency = 'GTQ',
}: Props): React.JSX.Element {
  const t = useTranslations('admin.events.counts');

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
        {t('sectionTitle')}
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {CARDS.map((c) => {
          const value = counts[c.key];
          const label = t(c.labelKey);
          return (
            <li
              key={c.key}
              className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm"
            >
              <span className="block text-xs font-medium text-neutral-500">{label}</span>
              <span
                className="mt-1 block text-2xl font-semibold text-neutral-900"
                aria-label={`${label}: ${value}`}
              >
                {value}
              </span>
            </li>
          );
        })}
      </ul>

      {budgetSummary ? (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
            {t('budgetSectionTitle')}
          </h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <li className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
              <span className="block text-xs font-medium text-neutral-500">
                {t('totalPlanned')}
              </span>
              <span className="mt-1 block text-2xl font-semibold text-neutral-900">
                {(() => {
                  const n = parseAmount(budgetSummary.totalPlanned);
                  return n === null ? `${currency} ${budgetSummary.totalPlanned}` : (
                    <Money amount={n} currency={currency} />
                  );
                })()}
              </span>
            </li>
            <li className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
              <span className="block text-xs font-medium text-neutral-500">
                {t('totalCommitted')}
              </span>
              <span className="mt-1 block text-2xl font-semibold text-neutral-900">
                {(() => {
                  const n = parseAmount(budgetSummary.totalCommitted);
                  return n === null ? `${currency} ${budgetSummary.totalCommitted}` : (
                    <Money amount={n} currency={currency} />
                  );
                })()}
              </span>
            </li>
          </ul>
        </>
      ) : null}
    </div>
  );
}
