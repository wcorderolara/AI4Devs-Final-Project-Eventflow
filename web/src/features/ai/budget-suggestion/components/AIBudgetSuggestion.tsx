'use client';

// AIBudgetSuggestion (US-019 / FE-002): pantalla principal de sugerencia IA de distribución.
// Estados empty → loading → error → success. Reusa AIBadge (US-017). Delegación HITL a US-037.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { useEvent } from '@/features/events/hooks/useEventsQueries';
import type { EventModel } from '@/features/events/api/eventsApi.types';
import { useGenerateAIBudget } from '../hooks/useGenerateAIBudget';
import type { BudgetSuggestionInput } from '../api/aiApi';
import { AIBudgetViewer } from './AIBudgetViewer';
// US-037 (PB-P1-021 / FE-006) — Integración del apply HITL con los 3 dialogs.
import { BudgetApplyContainer, type BudgetItemPreview } from '@/features/ai/hitl';

interface AIBudgetSuggestionProps {
  eventId: string;
}

function toBudgetInput(event: EventModel): BudgetSuggestionInput {
  const budget = Number(event.estimatedBudget);
  return {
    eventTypeCode: event.eventTypeCode,
    guest_count: event.guestsCount,
    budget_estimated: Number.isFinite(budget) ? budget : 0,
    currency_code: event.currencyCode,
    language_code: event.languageCode,
  };
}

function isMissingEventData(event: EventModel): boolean {
  const budget = Number(event.estimatedBudget);
  return !event.eventTypeCode || !event.currencyCode || !event.languageCode || !Number.isFinite(budget) || budget <= 0;
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
  'INVALID_BUDGET',
]);

export function AIBudgetSuggestion({ eventId }: AIBudgetSuggestionProps): React.JSX.Element {
  const t = useTranslations('ai.budget');
  const { data: event, isLoading: eventLoading, isError: eventError } = useEvent(eventId);
  const mutation = useGenerateAIBudget();
  const [triggered, setTriggered] = useState(false);

  const input = useMemo(() => (event ? toBudgetInput(event) : null), [event]);
  const missing = event ? isMissingEventData(event) : true;

  const handleGenerate = (): void => {
    if (!event || !input || missing) return;
    setTriggered(true);
    mutation.mutate({ eventId, input, languageCode: event.languageCode });
  };

  const errorCode = mutation.error instanceof ApiError ? mutation.error.code : null;
  const errorLabelKey = errorCode && ERROR_CODE_KEYS.has(errorCode)
    ? `errors.${errorCode}`
    : 'errors.UNKNOWN';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <Link
          href={`/organizer/events/${eventId}`}
          className="text-sm text-neutral-600 underline"
        >
          {t('back')}
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-neutral-700">{t('description')}</p>
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
          data-testid="ai-budget-missing-data"
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
          data-testid="ai-budget-empty"
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
          data-testid="ai-budget-loading"
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
          data-testid="ai-budget-error"
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
        <>
          <AIBudgetViewer
            distribution={mutation.data.output}
            fallbackUsed={mutation.data.aiMeta?.fallbackUsed}
            autoFocusOnMount={triggered}
          />
          <div className="flex flex-wrap gap-2">
            {/* US-037 (FE-006): reemplaza el botón placeholder "Aplicar" por el orquestador HITL. */}
            <BudgetApplyContainer
              eventId={eventId}
              aiRecommendationId={mutation.data.recommendationId}
              currencyCode={mutation.data.output.currency_code}
              items={mutation.data.output.categories.map(
                (c): BudgetItemPreview => ({
                  category: c.service_category_code,
                  categoryName: c.name,
                  estimatedAmount: String(c.amount ?? 0),
                  notes: c.notes,
                }),
              )}
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-md border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-800"
            >
              {t('actions.regenerate')}
            </button>
            <button
              type="button"
              disabled
              title={t('actionsDisabledTooltip')}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-500"
            >
              {t('actions.discard')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
