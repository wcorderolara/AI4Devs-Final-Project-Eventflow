'use client';

// QuoteComparisonTable (US-057 / FE-002).
// Vista comparativa desktop (≥ md). Cada columna es una Quote; las filas comparan campos
// homogéneos. Semántica accesible: `<table>` con `<caption>` (sr-only), `<th scope="col">`
// para la cabecera de vendor, `<th scope="row">` para las etiquetas de fila.
// Los CTAs "Marcar preferred" y "Resumir con IA" son deep-links (US-058 / US-022 respectivamente).
import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CompareQuoteItemView } from '../api/quotesApi.types';
import { QuoteStatusIndicator } from './QuoteStatusIndicator';
import { PreferredToggleButton } from './PreferredToggleButton';

export interface QuoteComparisonTableProps {
  eventId: string;
  categoryCode: string;
  categoryName: string;
  currencyCode: string;
  items: CompareQuoteItemView[];
}

/** Slug vacío = vendor sin perfil público disponible (edge case histórico). */
function vendorHref(slug: string | null): string | null {
  return slug ? `/vendors/${encodeURIComponent(slug)}` : null;
}

function formatPrice(amount: string, currencyCode: string): string {
  return `${currencyCode} ${amount}`;
}

function isSelectable(status: CompareQuoteItemView['status']): boolean {
  return status !== 'expired' && status !== 'rejected';
}

export function QuoteComparisonTable({
  eventId,
  categoryCode,
  categoryName,
  currencyCode,
  items,
}: QuoteComparisonTableProps): JSX.Element {
  const t = useTranslations('organizer.quote.compare');
  const [error, setError] = useState<string | null>(null);

  const aiSummaryHref = `/organizer/events/${encodeURIComponent(
    eventId,
  )}/quotes/compare/ai-summary?categoryCode=${encodeURIComponent(categoryCode)}`;

  return (
    <div className="overflow-x-auto" data-testid="quote-comparison-table">
      <table className="min-w-full border-collapse text-sm">
        <caption className="sr-only">
          {t('table.caption', { category: categoryName })}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold text-neutral-700">
              {t('table.rowLabels.vendor')}
            </th>
            {items.map((item) => (
              <th
                key={item.quoteId}
                scope="col"
                className="min-w-[220px] px-3 py-2 text-left align-top font-semibold text-neutral-900"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span>{item.vendor.businessName}</span>
                    <QuoteStatusIndicator status={item.status} isPreferred={item.isPreferred} />
                  </div>
                  {vendorHref(item.vendor.slug) ? (
                    <Link
                      href={vendorHref(item.vendor.slug) as string}
                      className="text-xs font-normal text-indigo-700 underline hover:text-indigo-900"
                    >
                      {t('table.viewProfile')}
                    </Link>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-neutral-600">
              {t('table.rowLabels.rating')}
            </th>
            {items.map((item) => (
              <td key={item.quoteId} className="px-3 py-2 align-top text-neutral-800">
                {item.vendor.ratingAvg !== null ? (
                  <span
                    aria-label={t('table.ratingAria', {
                      rating: item.vendor.ratingAvg,
                      reviews: item.vendor.reviewsCount,
                    })}
                  >
                    {`★ ${item.vendor.ratingAvg.toFixed(1)} `}
                    <span className="text-xs text-neutral-500">
                      {`(${item.vendor.reviewsCount})`}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">{t('table.noRating')}</span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-neutral-600">
              {t('table.rowLabels.totalPrice')}
            </th>
            {items.map((item) => (
              <td key={item.quoteId} className="px-3 py-2 align-top font-semibold text-neutral-900">
                {formatPrice(item.totalPrice, currencyCode)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top font-medium text-neutral-600">
              {t('table.rowLabels.breakdown')}
            </th>
            {items.map((item) => (
              <td key={item.quoteId} className="px-3 py-2 align-top text-neutral-800">
                {item.breakdown && item.breakdown.length > 0 ? (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs">
                    {item.breakdown.map((row) => (
                      <li key={`${item.quoteId}-${row.label}`}>
                        <span className="text-neutral-600">{row.label}:</span>{' '}
                        <span className="font-medium">{formatPrice(row.amount, currencyCode)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-neutral-500">{t('table.noBreakdown')}</span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top font-medium text-neutral-600">
              {t('table.rowLabels.validUntil')}
            </th>
            {items.map((item) => (
              <td key={item.quoteId} className="px-3 py-2 align-top text-neutral-800">
                {item.validUntil ? (
                  <time dateTime={item.validUntil}>{item.validUntil.slice(0, 10)}</time>
                ) : (
                  <span className="text-xs text-neutral-500">{t('table.noValidUntil')}</span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top font-medium text-neutral-600">
              {t('table.rowLabels.conditions')}
            </th>
            {items.map((item) => (
              <td key={item.quoteId} className="px-3 py-2 align-top text-xs text-neutral-700">
                {item.conditions ?? (
                  <span className="text-neutral-500">{t('table.noConditions')}</span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top font-medium text-neutral-600">
              {t('table.rowLabels.actions')}
            </th>
            {items.map((item) => (
              <td key={item.quoteId} className="px-3 py-2 align-top">
                {isSelectable(item.status) ? (
                  <PreferredToggleButton
                    quoteId={item.quoteId}
                    vendorName={item.vendor.businessName}
                    isPreferred={item.isPreferred}
                    selectable
                    eventId={eventId}
                    categoryCode={categoryCode}
                    onError={setError}
                  />
                ) : (
                  <span
                    className="inline-flex items-center rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500"
                    aria-label={t('table.notSelectableAria', { status: item.status })}
                  >
                    {t('table.notSelectable')}
                  </span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {error ? (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
          data-testid="preferred-toggle-error"
        >
          {error}
        </div>
      ) : null}

      {items.length >= 2 ? (
        <div className="mt-4 flex justify-end">
          <Link
            href={aiSummaryHref}
            className="inline-flex items-center rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {t('table.aiSummaryCta')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
