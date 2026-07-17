'use client';

// QuoteComparator (US-057 / FE-002).
// Orchestrator client: dispara `useCompareQuotes({eventId, categoryCode})` y decide qué UI
// mostrar según los estados de request/data:
//   - loading: skeleton.
//   - error: banner accesible (`role="alert"`) con mensaje mapeado por código estable.
//   - 0 items: empty state con CTA "Volver al evento".
//   - 1 item: vista de detalle (misma card mobile) con CTA "Marcar preferred".
//   - ≥2 items: tabla desktop / cards mobile responsive (Tailwind `hidden md:block` / `md:hidden`).
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCompareQuotes } from '../hooks/quotesQueries';
import { QuoteComparisonTable } from './QuoteComparisonTable';
import { QuoteComparisonCards } from './QuoteComparisonCards';
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
  const backHref = `/organizer/events/${encodeURIComponent(eventId)}`;
  const { data, isLoading, isError, error } = useCompareQuotes({ eventId, categoryCode });

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
      <h2 id="quote-comparator-multi" className="text-base font-semibold text-neutral-900">
        {t('multi.title', { count: data.items.length, category: data.category.name })}
      </h2>
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
    </section>
  );
}
