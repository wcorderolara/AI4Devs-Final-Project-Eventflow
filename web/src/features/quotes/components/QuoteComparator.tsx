'use client';

// QuoteComparator (US-057 / FE-002; extendido US-022 / FE-002 con trigger AI summary).
// Orchestrator client: dispara `useCompareQuotes({eventId, categoryCode})` y decide qué UI
// mostrar según los estados de request/data:
//   - loading: skeleton.
//   - error: banner accesible (`role="alert"`) con mensaje mapeado por código estable.
//   - 0 items: empty state con CTA "Volver al evento".
//   - 1 item: vista de detalle (misma card mobile) con CTA "Marcar preferred".
//   - ≥2 items: tabla desktop / cards mobile responsive (Tailwind `hidden md:block` / `md:hidden`).
//
// US-022 (FE-002 / AC-01 + D6): botón "Resumir con IA" visible con ≥ 2 quotes activas
// (`sent`/`accepted`) que abre el panel lateral `AIComparisonSummary`. El panel se cierra desde
// su propio header; el trigger se convierte en control (aria-expanded/aria-controls).
//
// US-059 (FE-003 / D3, D7): siempre que existan ≥ 2 quotes activas, el panel se abre por
// defecto en desktop (colapsado en mobile con toggle) y consume `useLatestQuoteSummary` para
// mostrar el último resumen persistido, un empty state con CTA o un banner "stale". El CTA/
// regenerar reusa la mutación `useGenerateAIQuoteSummary` (US-022) desde el mismo componente.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCompareQuotes } from '../hooks/quotesQueries';
import { QuoteComparisonTable } from './QuoteComparisonTable';
import { QuoteComparisonCards } from './QuoteComparisonCards';
import { AIComparisonSummary, useLatestQuoteSummary } from '@/features/ai/quote-summary';
import type { ApiError } from '@/shared/api-client';

export interface QuoteComparatorProps {
  eventId: string;
  categoryCode: string;
}

const KNOWN_ERROR_CODES = [
  'INVALID_FILTERS',
  'INVALID_CATEGORY',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'EVENT_NOT_FOUND',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

function errorMessage(err: ApiError | null, t: (k: string) => string): string {
  if (err && isKnownErrorCode(err.code)) return t(`errors.${err.code}`);
  return t('errors.UNEXPECTED');
}

export function QuoteComparator({ eventId, categoryCode }: QuoteComparatorProps): JSX.Element {
  const t = useTranslations('organizer.quote.compare');
  const tAi = useTranslations('organizer.ai.quote_summary');
  const backHref = `/organizer/events/${encodeURIComponent(eventId)}`;
  const { data, isLoading, isError, error } = useCompareQuotes({ eventId, categoryCode });

  // US-022 (D7 / VR-02): activo si hay ≥ 2 quotes con status `sent` / `accepted`.
  const activeQuotes = useMemo(
    () => (data?.items ?? []).filter((q) => q.status === 'sent' || q.status === 'accepted'),
    [data?.items],
  );
  const aiTriggerAvailable = activeQuotes.length >= 2;
  const currentQuoteIds = useMemo(() => activeQuotes.map((q) => q.quoteId), [activeQuotes]);
  const vendorLabelByQuoteId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of activeQuotes) map[q.quoteId] = q.vendor.businessName;
    return map;
  }, [activeQuotes]);

  // US-059 (FE-003 / D3): panel abierto por defecto en desktop una vez que hay ≥ 2 quotes;
  // el toggle sigue disponible para colapsarlo en mobile.
  const [aiOpen, setAiOpen] = useState(false);
  useEffect(() => {
    if (aiTriggerAvailable) setAiOpen(true);
  }, [aiTriggerAvailable]);

  // US-059 (FE-001 / AC-01): fetch del último resumen persistido. `enabled` sólo cuando el
  // comparador tiene la categoría lista y ≥ 2 quotes elegibles (evita 404 ruidosos al vuelo).
  const latest = useLatestQuoteSummary({
    eventId,
    categoryCode,
    currentQuoteIds,
    enabled: aiTriggerAvailable,
  });

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="space-y-2"
        data-testid="quote-comparator-loading"
      >
        <div className="h-6 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-32 w-full animate-pulse rounded bg-neutral-100" />
        <div className="h-32 w-full animate-pulse rounded bg-neutral-100" />
        <span className="sr-only">{t('loading')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        data-testid="quote-comparator-error"
      >
        {errorMessage(error, t)}
      </div>
    );
  }

  if (!data) {
    return (
      <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        {t('errors.UNEXPECTED')}
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <section
        aria-labelledby="quote-comparator-empty"
        className="rounded-md border border-neutral-200 bg-white p-6 text-center"
        data-testid="quote-comparator-empty"
      >
        <h2 id="quote-comparator-empty" className="text-base font-semibold text-neutral-900">
          {t('empty.title')}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{t('empty.description')}</p>
        <Link
          href={backHref}
          className="mt-4 inline-flex items-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          {t('empty.backCta')}
        </Link>
      </section>
    );
  }

  // 1 Quote → vista detalle (reusa las cards mobile — mismo shape). ≥ 2 → responsive table/cards.
  if (data.items.length === 1) {
    return (
      <section aria-labelledby="quote-comparator-single" className="space-y-3">
        <h2 id="quote-comparator-single" className="text-base font-semibold text-neutral-900">
          {t('single.title', { category: data.category.name })}
        </h2>
        <QuoteComparisonCards
          eventId={eventId}
          categoryCode={categoryCode}
          categoryName={data.category.name}
          currencyCode={data.currencyCode}
          items={data.items}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="quote-comparator-multi" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="quote-comparator-multi" className="text-base font-semibold text-neutral-900">
          {t('multi.title', { count: data.items.length, category: data.category.name })}
        </h2>
        {aiTriggerAvailable && (
          <button
            type="button"
            onClick={() => setAiOpen((prev) => !prev)}
            aria-expanded={aiOpen}
            aria-controls="ai-quote-summary-panel-region"
            aria-label={aiOpen ? tAi('trigger.ariaClose') : tAi('trigger.ariaOpen')}
            className="rounded-md border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-800 hover:bg-purple-100"
            data-testid="ai-quote-summary-trigger"
          >
            {tAi('trigger.cta')}
          </button>
        )}
      </div>
      <div className={aiOpen ? 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]' : ''}>
        <div className="min-w-0 space-y-4">
          <div className="hidden md:block">
            <QuoteComparisonTable
              eventId={eventId}
              categoryCode={categoryCode}
              categoryName={data.category.name}
              currencyCode={data.currencyCode}
              items={data.items}
            />
          </div>
          <div className="md:hidden">
            <QuoteComparisonCards
              eventId={eventId}
              categoryCode={categoryCode}
              categoryName={data.category.name}
              currencyCode={data.currencyCode}
              items={data.items}
            />
          </div>
        </div>
        {aiOpen && (
          <div id="ai-quote-summary-panel-region" className="lg:sticky lg:top-4 lg:self-start">
            <AIComparisonSummary
              eventId={eventId}
              categoryCode={categoryCode}
              currentQuoteIds={currentQuoteIds}
              vendorLabelByQuoteId={vendorLabelByQuoteId}
              open={aiOpen}
              onClose={() => setAiOpen(false)}
              initialData={latest.data}
              initialLoading={latest.isLoading}
              initialNotFound={latest.notFound}
            />
          </div>
        )}
      </div>
    </section>
  );
}
