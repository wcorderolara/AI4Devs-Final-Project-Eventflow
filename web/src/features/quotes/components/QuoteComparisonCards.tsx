'use client';

// QuoteComparisonCards (US-057 / FE-002).
// Vista responsive mobile (< md). Cada Quote es una `<article>` (card) con `aria-labelledby`
// apuntando al título del vendor. Los CTAs son idénticos al desktop (deep-links a US-058 / US-022).
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import type { CompareQuoteItemView } from '../api/quotesApi.types';
import { Button } from '@/shared/design-system';
import { QuoteStatusIndicator } from './QuoteStatusIndicator';
import { PreferredToggleButton } from './PreferredToggleButton';

export interface QuoteComparisonCardsProps {
  eventId: string;
  categoryCode: string;
  categoryName: string;
  currencyCode: string;
  items: CompareQuoteItemView[];
  /** Abre el panel de resumen IA del comparador (sólo con el resumen disponible). */
  onOpenAiSummary?: () => void;
}

function isSelectable(status: CompareQuoteItemView['status']): boolean {
  return status !== 'expired' && status !== 'rejected';
}

function formatPrice(amount: string, currencyCode: string): string {
  return `${currencyCode} ${amount}`;
}

interface QuoteCardProps {
  item: CompareQuoteItemView;
  eventId: string;
  categoryCode: string;
  currencyCode: string;
  onError: (message: string) => void;
}

function QuoteCard({ item, eventId, categoryCode, currencyCode, onError }: QuoteCardProps): JSX.Element {
  const t = useTranslations('organizer.quote.compare');
  const titleId = useId();

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
      data-status={item.status}
      data-preferred={item.isPreferred ? 'true' : 'false'}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 id={titleId} className="text-base font-semibold text-neutral-900">
          {item.vendor.businessName}
        </h3>
        <QuoteStatusIndicator status={item.status} isPreferred={item.isPreferred} />
      </header>

      {item.vendor.ratingAvg !== null ? (
        <p
          className="mt-1 text-xs text-neutral-600"
          aria-label={t('table.ratingAria', {
            rating: item.vendor.ratingAvg,
            reviews: item.vendor.reviewsCount,
          })}
        >
          {`★ ${item.vendor.ratingAvg.toFixed(1)} `}
          <span className="text-neutral-500">{`(${item.vendor.reviewsCount})`}</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-neutral-500">{t('table.noRating')}</p>
      )}

      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs font-medium text-neutral-600">{t('table.rowLabels.totalPrice')}</dt>
          <dd className="text-base font-semibold text-neutral-900">
            {formatPrice(item.totalPrice, currencyCode)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-neutral-600">{t('table.rowLabels.breakdown')}</dt>
          <dd className="text-xs text-neutral-800">
            {item.breakdown && item.breakdown.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {item.breakdown.map((row) => (
                  <li key={`${item.quoteId}-${row.label}`}>
                    <span className="text-neutral-600">{row.label}:</span>{' '}
                    <span className="font-medium">{formatPrice(row.amount, currencyCode)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-neutral-500">{t('table.noBreakdown')}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-neutral-600">{t('table.rowLabels.validUntil')}</dt>
          <dd className="text-xs text-neutral-800">
            {item.validUntil ? (
              <time dateTime={item.validUntil}>{item.validUntil.slice(0, 10)}</time>
            ) : (
              <span className="text-neutral-500">{t('table.noValidUntil')}</span>
            )}
          </dd>
        </div>
        {item.conditions ? (
          <div>
            <dt className="text-xs font-medium text-neutral-600">{t('table.rowLabels.conditions')}</dt>
            <dd className="text-xs text-neutral-700">{item.conditions}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4">
        {isSelectable(item.status) ? (
          <PreferredToggleButton
            quoteId={item.quoteId}
            vendorName={item.vendor.businessName}
            isPreferred={item.isPreferred}
            selectable
            eventId={eventId}
            categoryCode={categoryCode}
            onError={onError}
          />
        ) : (
          <span
            className="inline-flex w-full items-center justify-center rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-500"
            aria-label={t('table.notSelectableAria', { status: item.status })}
          >
            {t('table.notSelectable')}
          </span>
        )}
      </div>
    </article>
  );
}

export function QuoteComparisonCards({
  eventId,
  categoryCode,
  categoryName: _categoryName,
  currencyCode,
  items,
  onOpenAiSummary,
}: QuoteComparisonCardsProps): JSX.Element {
  const t = useTranslations('organizer.quote.compare');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3" data-testid="quote-comparison-cards">
      {items.map((item) => (
        <QuoteCard
          key={item.quoteId}
          item={item}
          eventId={eventId}
          categoryCode={categoryCode}
          currencyCode={currencyCode}
          onError={setError}
        />
      ))}
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
          data-testid="preferred-toggle-error"
        >
          {error}
        </div>
      ) : null}
      {onOpenAiSummary ? (
        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            leadingIcon={<Sparkles />}
            onClick={onOpenAiSummary}
            aria-controls="ai-quote-summary-panel-region"
          >
            {t('table.aiSummaryCta')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
