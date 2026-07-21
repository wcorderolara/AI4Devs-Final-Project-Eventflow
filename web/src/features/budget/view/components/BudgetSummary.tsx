// US-035 (PB-P1-020 / FE-002) + US-038 (PB-P1-022 / FE-002) — Componente resumen de presupuesto.
// US-038 AC-01/AC-07: renderiza `overcommitted_amount` con CLDR cuando `over_committed = true`.
// US-064 (PB-P1-037 / FE-002) — AC-04 / AC-05:
//   - `aria-live="polite" aria-atomic="true"` con anuncio comparativo cuando cambia
//     `total_committed` entre refetches (props previa vs actual).
//   - Botón manual "Actualizar presupuesto" (safety net independiente de mutations —
//     invalidaciones ya se disparan desde `useConfirmBookingIntent` / `useCancelBookingIntent`).
//   - No anuncia en el mount inicial (previous = null): sólo cuando llega una segunda snapshot
//     con `total_committed` distinto (evita ruido de screen reader al abrir la página).
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Money, formatCurrency } from '@/shared/i18n';
import type { BudgetSummaryDto } from '../api/budgetApi';

interface BudgetSummaryProps {
  summary: BudgetSummaryDto;
  locale: string;
  // US-064 (FE-002 / AC-05): callback opcional para el botón manual "Actualizar". Cuando se
  // provee, el componente renderiza la CTA y llama `onRefresh` al click. `isRefreshing` se
  // renderiza como estado de la CTA para retroalimentación inmediata.
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function BudgetSummary({
  summary,
  locale,
  onRefresh,
  isRefreshing = false,
}: BudgetSummaryProps): React.JSX.Element {
  const t = useTranslations('budget.summary');
  const tOver = useTranslations('budget.overcommit');
  const remaining = summary.total_planned - summary.total_committed;

  // US-064 (FE-002 / AC-04): anuncio aria-live cuando `total_committed` cambia entre refetches.
  // Se emite en el `<div aria-live>` al final del componente. Comparación con ref del valor
  // previo — el mount inicial no dispara anuncio (evita ruido innecesario en screen readers).
  const previousCommittedRef = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  useEffect(() => {
    const previous = previousCommittedRef.current;
    if (previous !== null && previous !== summary.total_committed) {
      setAnnouncement(
        t('liveUpdate', {
          currency: summary.currency_code,
          committed: formatCurrency(summary.total_committed, summary.currency_code, locale),
          planned: formatCurrency(summary.total_planned, summary.currency_code, locale),
        }),
      );
    }
    previousCommittedRef.current = summary.total_committed;
  }, [summary.total_committed, summary.total_planned, summary.currency_code, locale, t]);

  return (
    <section
      aria-label={t('regionLabel')}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={t('refreshAria')}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="budget-summary-refresh"
          >
            {isRefreshing ? t('refreshing') : t('refresh')}
          </button>
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-neutral-500">{t('planned')}</dt>
          <dd className="text-lg font-medium">
            <Money amount={summary.total_planned} currency={summary.currency_code} locale={locale} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">{t('committed')}</dt>
          <dd className="text-lg font-medium">
            <Money amount={summary.total_committed} currency={summary.currency_code} locale={locale} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">{t('remaining')}</dt>
          <dd className={`text-lg font-medium ${remaining < 0 ? 'text-red-700' : 'text-neutral-900'}`}>
            <Money amount={remaining} currency={summary.currency_code} locale={locale} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">{t('currency')}</dt>
          <dd className="text-lg font-medium">{summary.currency_code}</dd>
        </div>
      </dl>
      {summary.over_committed ? (
        <p
          className="mt-3 text-sm font-medium text-red-700"
          data-testid="budget-summary-overcommit-delta"
        >
          {tOver('delta_label', {
            amount: formatCurrency(summary.overcommitted_amount, summary.currency_code, locale),
          })}
        </p>
      ) : null}
      {/*
        aria-live region: invisible pero legible por screen readers. Se anuncia cuando el
        `committed` cambia entre snapshots (post-invalidación por confirm/cancel de BookingIntent).
      */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="budget-summary-live"
      >
        {announcement}
      </div>
    </section>
  );
}
