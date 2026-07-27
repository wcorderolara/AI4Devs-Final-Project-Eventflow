'use client';

// QuoteComparisonTable (US-057 / FE-002).
// Vista comparativa desktop (≥ md). Cada columna es una Quote; las filas comparan campos
// homogéneos. Semántica accesible: `<table>` con `<caption>` (sr-only), `<th scope="col">`
// para la cabecera de vendor, `<th scope="row">` para las etiquetas de fila.
// Los CTAs "Marcar preferred" y "Resumir con IA" son deep-links (US-058 / US-022 respectivamente).
//
// PB-P2-033: compone las primitivas `Table` del design system. Además corrige dos desviaciones
// de token: la escala **indigo** de Tailwind (prohibida como acento: la marca es violeta,
// UI-DEC-002/003) y la alerta con paleta cruda, que pasa a `Alert`.
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextLink,
} from '@/shared/design-system';
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

  // La primera columna queda fija al hacer scroll horizontal: la fila sigue siendo legible
  // cuando hay muchas cotizaciones. `bg-surface` es obligatorio para que el contenido no se
  // transparente por debajo.
  const ROW_LABEL = 'sticky left-0 z-sticky bg-surface align-top font-medium text-secondary';

  return (
    <div data-testid="quote-comparison-table">
      <Table
        caption={t('table.caption', { category: categoryName })}
        density="compact"
        containerClassName="rounded-card border border-subtle bg-surface"
      >
        <TableHead>
          <TableRow>
            <TableHeaderCell density="compact" className={ROW_LABEL}>
              {t('table.rowLabels.vendor')}
            </TableHeaderCell>
            {items.map((item) => (
              <TableHeaderCell
                key={item.quoteId}
                density="compact"
                className="min-w-[220px] align-top text-primary"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span>{item.vendor.businessName}</span>
                    <QuoteStatusIndicator status={item.status} isPreferred={item.isPreferred} />
                  </div>
                  {vendorHref(item.vendor.slug) ? (
                    <TextLink
                      href={vendorHref(item.vendor.slug) as string}
                      variant="inline"
                      className="text-caption font-normal"
                    >
                      {t('table.viewProfile')}
                    </TextLink>
                  ) : null}
                </div>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell density="compact" header className={ROW_LABEL}>
              {t('table.rowLabels.rating')}
            </TableCell>
            {items.map((item) => (
              <TableCell key={item.quoteId} density="compact" className="align-top">
                {item.vendor.ratingAvg !== null ? (
                  <span
                    aria-label={t('table.ratingAria', {
                      rating: item.vendor.ratingAvg,
                      reviews: item.vendor.reviewsCount,
                    })}
                  >
                    {`★ ${item.vendor.ratingAvg.toFixed(1)} `}
                    <span className="text-caption text-muted">
                      {`(${item.vendor.reviewsCount})`}
                    </span>
                  </span>
                ) : (
                  <span className="text-caption text-muted">{t('table.noRating')}</span>
                )}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell density="compact" header className={ROW_LABEL}>
              {t('table.rowLabels.totalPrice')}
            </TableCell>
            {items.map((item) => (
              <TableCell
                key={item.quoteId}
                density="compact"
                className="align-top font-semibold tabular-nums"
              >
                {formatPrice(item.totalPrice, currencyCode)}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell density="compact" header className={ROW_LABEL}>
              {t('table.rowLabels.breakdown')}
            </TableCell>
            {items.map((item) => (
              <TableCell key={item.quoteId} density="compact" className="align-top">
                {item.breakdown && item.breakdown.length > 0 ? (
                  <ul className="list-disc space-y-0.5 pl-4 text-caption">
                    {item.breakdown.map((row) => (
                      <li key={`${item.quoteId}-${row.label}`}>
                        <span className="text-secondary">{row.label}:</span>{' '}
                        <span className="font-medium tabular-nums">
                          {formatPrice(row.amount, currencyCode)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-caption text-muted">{t('table.noBreakdown')}</span>
                )}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell density="compact" header className={ROW_LABEL}>
              {t('table.rowLabels.validUntil')}
            </TableCell>
            {items.map((item) => (
              <TableCell key={item.quoteId} density="compact" className="align-top">
                {item.validUntil ? (
                  <time dateTime={item.validUntil}>{item.validUntil.slice(0, 10)}</time>
                ) : (
                  <span className="text-caption text-muted">{t('table.noValidUntil')}</span>
                )}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell density="compact" header className={ROW_LABEL}>
              {t('table.rowLabels.conditions')}
            </TableCell>
            {items.map((item) => (
              <TableCell
                key={item.quoteId}
                density="compact"
                className="align-top text-caption text-secondary"
              >
                {item.conditions ?? <span className="text-muted">{t('table.noConditions')}</span>}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell density="compact" header className={ROW_LABEL}>
              {t('table.rowLabels.actions')}
            </TableCell>
            {items.map((item) => (
              <TableCell key={item.quoteId} density="compact" className="align-top">
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
                  // No es un control: es una explicación de por qué no hay acción. Se mantiene
                  // como `span` (no `Button` deshabilitado) con su nombre accesible.
                  <span
                    className="inline-flex items-center rounded-button bg-surface-disabled px-3 py-1.5 font-ui text-caption font-medium text-disabled"
                    aria-label={t('table.notSelectableAria', { status: item.status })}
                  >
                    {t('table.notSelectable')}
                  </span>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>

      {error ? (
        <Alert
          variant="error"
          live
          className="mt-3"
          data-testid="preferred-toggle-error"
          title={error}
        />
      ) : null}

      {items.length >= 2 ? (
        <div className="mt-4 flex justify-end">
          {/* Deep-link a la síntesis de IA: el icono acompaña al label, nunca lo sustituye
              (UI-DEC-010). Violeta de marca, no indigo. */}
          <TextLink
            href={aiSummaryHref}
            className="text-body-sm font-semibold"
            leadingIcon={<Sparkles />}
          >
            {t('table.aiSummaryCta')}
          </TextLink>
        </div>
      ) : null}
    </div>
  );
}
