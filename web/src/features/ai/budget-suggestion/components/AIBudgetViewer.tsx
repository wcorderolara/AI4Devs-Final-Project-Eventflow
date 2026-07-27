'use client';

// AIBudgetViewer (US-019 / FE-002, FE-004): tabla accesible con distribución IA por categoría.
// A11y: `<caption>` semántico, headers `scope="col"`, barras de porcentaje con `role="progressbar"`,
// anuncios via `aria-live="polite"` en el contenedor.
//
// PB-P2-033: la tabla pasa a las primitivas `Table` del design system y la barra de porcentaje
// abandona `bg-purple-600` (escala prohibida: la marca es violeta aprobado, UI-DEC-002) por
// `bg-action-primary` sobre pista `bg-surface-disabled`.
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { AIBadge } from '@/features/ai/event-plan';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/design-system';
import { Money, formatCurrency } from '@/shared/i18n';
import type { BudgetSuggestionOutput } from '../api/aiApi';

interface AIBudgetViewerProps {
  distribution: BudgetSuggestionOutput;
  fallbackUsed?: boolean;
  autoFocusOnMount?: boolean;
}

// US-019 conserva `maximumFractionDigits: 0` (montos IA sin decimales). El helper compartido
// acepta `Intl.NumberFormatOptions` como override — se usa en interpolación de traducción.
function formatAmountNoDecimals(amount: number, currencyCode: string, locale: string): string {
  return formatCurrency(amount, currencyCode, locale, { maximumFractionDigits: 0 });
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
    <Card
      as="section"
      aria-labelledby="ai-budget-heading"
      aria-live="polite"
      data-testid="ai-budget-viewer"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="ai-budget-heading"
            ref={headingRef}
            tabIndex={-1}
            className="focus-ring font-heading text-h3 font-semibold text-primary"
          >
            {t('viewerHeading')}
          </h2>
          <p className="mt-1 font-body text-body-sm text-secondary">
            {t('viewerHint', {
              total: formatAmountNoDecimals(budget_estimated, currency_code, locale),
              count: categories.length,
            })}
          </p>
        </div>
        <AIBadge fallbackUsed={fallbackUsed} />
      </header>

      <Table caption={t('tableCaption')} density="compact" data-testid="ai-budget-table">
        <TableHead>
          <TableRow>
            <TableHeaderCell density="compact">{t('columns.category')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('columns.percentage')}</TableHeaderCell>
            <TableHeaderCell density="compact" align="numeric">
              {t('columns.amount')}
            </TableHeaderCell>
            <TableHeaderCell density="compact">{t('columns.notes')}</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c.service_category_code}>
              <TableCell density="compact" header description={c.service_category_code}>
                {c.name}
              </TableCell>
              <TableCell density="compact" className="min-w-[10rem] align-top">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{formatPercentage(c.percentage, locale)}</span>
                  {/* Medidor en línea dentro de la celda: `ProgressIndicator` no encaja aquí
                      porque renderiza su propio label visible sobre la barra. Se conservan la
                      semántica ARIA y los tokens de acción/superficie. */}
                  <div
                    role="progressbar"
                    aria-label={t('progressAriaLabel', { category: c.name })}
                    aria-valuenow={c.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 flex-1 overflow-hidden rounded-badge bg-surface-disabled"
                  >
                    <div
                      className="h-2 rounded-badge bg-action-primary"
                      style={{ width: `${Math.min(100, Math.max(0, c.percentage))}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell density="compact" align="numeric">
                <Money
                  amount={c.amount}
                  currency={currency_code}
                  locale={locale}
                  formatOptions={{ maximumFractionDigits: 0 }}
                />
              </TableCell>
              <TableCell density="compact">{c.notes ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <footer className="mt-6 border-t border-subtle pt-4">
        <p className="font-body text-caption text-muted">{t('hitlNotice')}</p>
      </footer>
    </Card>
  );
}
