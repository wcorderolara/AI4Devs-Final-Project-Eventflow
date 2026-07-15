// US-035 (PB-P1-020 / FE-002) — Componente resumen de presupuesto.
import { useTranslations } from 'next-intl';
import type { BudgetSummaryDto } from '../api/budgetApi';

interface BudgetSummaryProps {
  summary: BudgetSummaryDto;
  locale: string;
}

function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

export function BudgetSummary({ summary, locale }: BudgetSummaryProps): React.JSX.Element {
  const t = useTranslations('budget.summary');
  const remaining = summary.total_planned - summary.total_committed;
  return (
    <section
      aria-label={t('regionLabel')}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-neutral-500">{t('planned')}</dt>
          <dd className="text-lg font-medium">{formatCurrency(summary.total_planned, summary.currency_code, locale)}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">{t('committed')}</dt>
          <dd className="text-lg font-medium">{formatCurrency(summary.total_committed, summary.currency_code, locale)}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">{t('remaining')}</dt>
          <dd className={`text-lg font-medium ${remaining < 0 ? 'text-red-700' : 'text-neutral-900'}`}>
            {formatCurrency(remaining, summary.currency_code, locale)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">{t('currency')}</dt>
          <dd className="text-lg font-medium">{summary.currency_code}</dd>
        </div>
      </dl>
    </section>
  );
}
