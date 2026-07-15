// US-035 (PB-P1-020 / FE-004) + US-038 (PB-P1-022 / FE-004) — Banner de advertencia cuando
// `over_committed = true`. US-038 AC-04/AC-07: agrega delta bruto + CTA "Editar items" con
// scroll + focus a la primera fila `over_committed=true` vía `useOvercommitFocus`.
import { useTranslations } from 'next-intl';
import type { BudgetSummaryDto } from '../api/budgetApi';
import { useOvercommitFocus } from '../hooks/useOvercommitFocus';

interface OvercommitWarningProps {
  visible: boolean;
  summary?: BudgetSummaryDto;
  eventId?: string;
  locale?: string;
}

function formatCurrency(amount: number, currencyCode: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

export function OvercommitWarning({
  visible,
  summary,
  eventId,
  locale = 'en',
}: OvercommitWarningProps): React.JSX.Element | null {
  const t = useTranslations('budget.overcommit');
  const focus = useOvercommitFocus(eventId ?? '');
  if (!visible) return null;
  const hasDelta = summary !== undefined && summary.overcommitted_amount > 0;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
    >
      <p className="font-medium">{t('title')}</p>
      <p className="mt-1">{t('body')}</p>
      {hasDelta ? (
        <p className="mt-2 text-sm font-medium" data-testid="overcommit-warning-delta">
          {t('delta_label', {
            amount: formatCurrency(summary!.overcommitted_amount, summary!.currency_code, locale),
          })}
        </p>
      ) : null}
      {eventId ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={focus.focusFirstOvercommitItem}
            data-testid="overcommit-warning-cta"
            className="inline-flex items-center rounded border border-red-400 bg-white px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
          >
            {t('cta_edit_items')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
