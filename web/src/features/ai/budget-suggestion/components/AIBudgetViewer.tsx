'use client';

// AIBudgetViewer (US-019 / FE-002, FE-004): tabla accesible con distribución IA por categoría.
// A11y: `<caption>` semántico, headers `scope="col"`, barras de porcentaje con `role="progressbar"`,
// anuncios via `aria-live="polite"` en el contenedor.
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { AIBadge } from '@/features/ai/event-plan';
import type { BudgetSuggestionOutput } from '../api/aiApi';

interface AIBudgetViewerProps {
  distribution: BudgetSuggestionOutput;
  fallbackUsed?: boolean;
  autoFocusOnMount?: boolean;
}

function formatAmount(amount: number, currencyCode: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

function formatPercentage(percentage: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(percentage / 100);
  } catch {
    return `${percentage}%`;
  }
}

export function AIBudgetViewer({
  distribution,
  fallbackUsed = false,
  autoFocusOnMount = true,
}: AIBudgetViewerProps): React.JSX.Element {
  const t = useTranslations('ai.budget');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (autoFocusOnMount && headingRef.current) {
      headingRef.current.focus();
    }
  }, [autoFocusOnMount]);

  const { categories, currency_code, budget_estimated } = distribution;
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'es-419';

  return (
    <section
      aria-labelledby="ai-budget-heading"
      aria-live="polite"
      className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      data-testid="ai-budget-viewer"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="ai-budget-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-neutral-900 outline-none focus:ring-2 focus:ring-purple-400"
          >
            {t('viewerHeading')}
          </h2>
          <p className="mt-1 text-sm text-neutral-700">
            {t('viewerHint', {
              total: formatAmount(budget_estimated, currency_code, locale),
              count: categories.length,
            })}
          </p>
        </div>
        <AIBadge fallbackUsed={fallbackUsed} />
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" data-testid="ai-budget-table">
          <caption className="sr-only">{t('tableCaption')}</caption>
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th scope="col" className="py-2 pr-3 font-medium text-neutral-800">{t('columns.category')}</th>
              <th scope="col" className="py-2 pr-3 font-medium text-neutral-800">{t('columns.percentage')}</th>
              <th scope="col" className="py-2 pr-3 font-medium text-neutral-800">{t('columns.amount')}</th>
              <th scope="col" className="py-2 pr-3 font-medium text-neutral-800">{t('columns.notes')}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.service_category_code} className="border-b border-neutral-100 align-top">
                <td className="py-2 pr-3">
                  <p className="font-medium text-neutral-900">{c.name}</p>
                  <p className="text-xs text-neutral-500">{c.service_category_code}</p>
                </td>
                <td className="py-2 pr-3 min-w-[10rem]">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-neutral-800">
                      {formatPercentage(c.percentage, locale)}
                    </span>
                    <div
                      role="progressbar"
                      aria-label={t('progressAriaLabel', { category: c.name })}
                      aria-valuenow={c.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-2 flex-1 rounded-full bg-neutral-100"
                    >
                      <div
                        className="h-2 rounded-full bg-purple-600"
                        style={{ width: `${Math.min(100, Math.max(0, c.percentage))}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-3 tabular-nums text-neutral-800">
                  {formatAmount(c.amount, currency_code, locale)}
                </td>
                <td className="py-2 pr-3 text-neutral-700">{c.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="mt-6 border-t border-neutral-100 pt-4">
        <p className="text-xs text-neutral-500">{t('hitlNotice')}</p>
      </footer>
    </section>
  );
}
