'use client';

// AIRecommendedCategories (US-020 / FE-002): sección "Recomendado para ti" del dashboard del
// evento. Estados empty → loading → error → success. Reusa `AIBadge`. Click-through canónico
// hacia `/organizer/vendors?category=<code>&city=<city>` (US-045). Delegación HITL a US-037.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { useEvent } from '@/features/events/hooks/useEventsQueries';
import type { EventModel } from '@/features/events/api/eventsApi.types';
import { useGenerateAIVendorCategories } from '../hooks/useGenerateAIVendorCategories';
import type { VendorCategoriesInput } from '../api/aiApi';
import { AICategoryCard } from './AICategoryCard';

interface AIRecommendedCategoriesProps {
  eventId: string;
}

function toVendorCategoriesInput(event: EventModel): VendorCategoriesInput {
  const budget = Number(event.estimatedBudget);
  // US-020 DEV-05: `EventModel` no expone `city` como string directo (usa `locationId`).
  // El backend arma el payload informativo con lo que reciba; la ciudad para el click-through
  // se resuelve por separado (US-045). Aquí se envía sin `city` — el LLM/Mock no la requiere.
  return {
    event_type_code: event.eventTypeCode,
    guest_count: event.guestsCount,
    budget_estimated: Number.isFinite(budget) ? budget : undefined,
    currency_code: event.currencyCode,
    language_code: event.languageCode,
  };
}

function isMissingEventData(event: EventModel): boolean {
  return !event.eventTypeCode || !event.languageCode;
}

const ERROR_CODE_KEYS = new Set([
  'AI_TIMEOUT',
  'AI_INVALID_OUTPUT',
  'AI_PROVIDER_ERROR',
  'RATE_LIMITED',
  'RATE_LIMIT_EXCEEDED',
  'VALIDATION',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNAUTHORIZED',
]);

export function AIRecommendedCategories({ eventId }: AIRecommendedCategoriesProps): React.JSX.Element {
  const t = useTranslations('ai.vendorCategories');
  const { data: event, isLoading: eventLoading, isError: eventError } = useEvent(eventId);
  const mutation = useGenerateAIVendorCategories();
  const [hidden, setHidden] = useState(false);

  const input = useMemo(() => (event ? toVendorCategoriesInput(event) : null), [event]);
  const missing = event ? isMissingEventData(event) : true;

  const handleGenerate = (): void => {
    if (!event || !input || missing) return;
    mutation.mutate({ eventId, input, languageCode: event.languageCode });
  };

  const errorCode = mutation.error instanceof ApiError ? mutation.error.code : null;
  const errorLabelKey = errorCode && ERROR_CODE_KEYS.has(errorCode) ? `errors.${errorCode}` : 'errors.UNKNOWN';

  if (hidden) return <div data-testid="ai-vendor-categories-hidden" aria-hidden />;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" data-testid="ai-vendor-categories">
      <div>
        <Link
          href={`/organizer/events/${eventId}`}
          className="text-sm text-neutral-600 underline"
        >
          {t('back')}
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-neutral-700">{t('description')}</p>
        </div>
        <button
          type="button"
          onClick={(): void => setHidden(true)}
          className="text-xs text-neutral-500 underline"
        >
          {t('hideSection')}
        </button>
      </header>

      {eventLoading && (
        <div className="space-y-3" aria-hidden>
          <div className="h-6 w-1/3 animate-pulse rounded bg-neutral-200" />
          <div className="h-32 animate-pulse rounded bg-neutral-100" />
        </div>
      )}

      {eventError && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {t('errors.EVENT_LOAD_FAILED')}
        </div>
      )}

      {event && missing && (
        <div
          role="alert"
          className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800"
          data-testid="ai-vendor-categories-missing-data"
        >
          <p>{t('missingData')}</p>
          <Link
            href={`/organizer/events/${eventId}/edit`}
            className="mt-2 inline-block rounded bg-amber-700 px-3 py-1.5 text-white"
          >
            {t('completeData')}
          </Link>
        </div>
      )}

      {event && !missing && !mutation.data && !mutation.isPending && !mutation.isError && (
        <div
          className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center"
          data-testid="ai-vendor-categories-empty"
        >
          <p className="text-sm text-neutral-700">{t('emptyPrompt')}</p>
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-4 rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            {t('generateCta')}
          </button>
        </div>
      )}

      {mutation.isPending && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-neutral-200 bg-white p-6"
          data-testid="ai-vendor-categories-loading"
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"
              aria-hidden
            />
            <p className="text-sm font-medium text-neutral-800">{t('loading')}</p>
          </div>
          <p className="mt-2 text-xs text-neutral-500">{t('loadingHint')}</p>
        </div>
      )}

      {mutation.isError && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800"
          data-testid="ai-vendor-categories-error"
        >
          <p className="font-medium">{t(errorLabelKey)}</p>
          {mutation.error instanceof ApiError && mutation.error.retryAfterSeconds != null && (
            <p className="mt-1 text-xs">
              {t('retryAfter', { seconds: mutation.error.retryAfterSeconds })}
            </p>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-3 rounded bg-red-700 px-3 py-1.5 text-white"
          >
            {t('retry')}
          </button>
        </div>
      )}

      {mutation.data && (
        <section
          aria-labelledby="ai-vendor-categories-heading"
          aria-live="polite"
          className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
          data-testid="ai-vendor-categories-viewer"
        >
          <header className="mb-4">
            <h2
              id="ai-vendor-categories-heading"
              className="text-xl font-semibold text-neutral-900"
            >
              {t('viewerHeading')}
            </h2>
            <p className="mt-1 text-sm text-neutral-700">
              {t('viewerHint', { count: mutation.data.output.categories.length })}
            </p>
          </header>
          <ul className="space-y-3">
            {mutation.data.output.categories.map((c) => (
              <AICategoryCard
                key={c.service_category_code}
                category={c}
                eventId={eventId}
                fallbackUsed={mutation.data?.aiMeta?.fallbackUsed}
              />
            ))}
          </ul>
          <footer className="mt-6 border-t border-neutral-100 pt-4">
            <p className="text-xs text-neutral-500">{t('hitlNotice')}</p>
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-3 rounded-md border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-800"
            >
              {t('actions.regenerate')}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
