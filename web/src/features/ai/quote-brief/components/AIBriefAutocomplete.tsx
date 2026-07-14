'use client';

// AIBriefAutocomplete (US-021 / FE-002 + FE-004). Página dedicada `/organizer/events/[id]/ai/quote-brief`.
// Flujo HITL: generar → editar → handoff a US-023 (creación de `QuoteRequest`). No envía la solicitud;
// la persistencia final de `QuoteRequest.brief` con `ai_generated_brief=true` es responsabilidad de US-023.
// Delega descarte al endpoint común HITL de US-025 (fuera de scope de US-021).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { useEvent } from '@/features/events/hooks/useEventsQueries';
import type { EventModel } from '@/features/events/api/eventsApi.types';
import { useGenerateAIQuoteBrief } from '../hooks/useGenerateAIQuoteBrief';
import type { QuoteBriefInput, QuoteBriefOutput } from '../api/aiApi';
import { AIBriefField } from './AIBriefField';

interface AIBriefAutocompleteProps {
  eventId: string;
}

function toQuoteBriefInput(event: EventModel, serviceCategoryCode: string): QuoteBriefInput {
  const budget = Number(event.estimatedBudget);
  return {
    service_category_code: serviceCategoryCode,
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

/** Telemetría mínima (US-021 / FE-004) sin PII. */
function emitTelemetry(event: string, payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify({ event, ...payload });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/v1/telemetry/ai', new Blob([body], { type: 'application/json' }));
      return;
    }
    if (typeof fetch === 'function') {
      void fetch('/api/v1/telemetry/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // No-op — telemetría best-effort.
  }
}

function useDraft(): [
  QuoteBriefOutput,
  (patch: Partial<QuoteBriefOutput>) => void,
  boolean,
  () => void,
  (initial: QuoteBriefOutput) => void,
] {
  const [draft, setDraft] = useState<QuoteBriefOutput>({
    brief: '',
    requirements: [],
    questions: [],
    constraints: [],
  });
  const [dirty, setDirty] = useState(false);
  const markDirty = (): void => setDirty(true);
  const patch = (p: Partial<QuoteBriefOutput>): void => setDraft((d) => ({ ...d, ...p }));
  const reset = (initial: QuoteBriefOutput): void => {
    setDraft(initial);
    setDirty(false);
  };
  return [draft, patch, dirty, markDirty, reset];
}

export function AIBriefAutocomplete({ eventId }: AIBriefAutocompleteProps): React.JSX.Element {
  const t = useTranslations('ai.quoteBrief');
  const { data: event, isLoading: eventLoading, isError: eventError } = useEvent(eventId);
  const mutation = useGenerateAIQuoteBrief();
  const [serviceCategoryCode, setServiceCategoryCode] = useState<string>('');
  const [draft, patchDraft, dirty, markDirty, resetDraft] = useDraft();

  const missing = event ? isMissingEventData(event) : true;
  const input = useMemo(
    () =>
      event && serviceCategoryCode.length > 0 ? toQuoteBriefInput(event, serviceCategoryCode) : null,
    [event, serviceCategoryCode],
  );

  const handleGenerate = (): void => {
    if (!event || !input || missing) return;
    mutation.mutate(
      { eventId, input, languageCode: event.languageCode },
      {
        onSuccess: (data) => {
          resetDraft(data.output);
          emitTelemetry('ai.quote-brief.generated', {
            event_id: eventId,
            service_category_code: input.service_category_code,
            correlation_id: data.recommendationId,
          });
        },
      },
    );
  };

  const handleRegenerate = (): void => {
    if (dirty) {
      const ok = typeof window !== 'undefined' ? window.confirm(t('regenerateConfirm')) : true;
      if (!ok) return;
    }
    emitTelemetry('ai.quote-brief.regenerated', {
      event_id: eventId,
      service_category_code: serviceCategoryCode,
    });
    handleGenerate();
  };

  const handleDiscard = (): void => {
    emitTelemetry('ai.quote-brief.discarded', {
      event_id: eventId,
      service_category_code: serviceCategoryCode,
    });
    resetDraft({ brief: '', requirements: [], questions: [], constraints: [] });
    mutation.reset();
  };

  const errorCode = mutation.error instanceof ApiError ? mutation.error.code : null;
  const errorLabelKey = errorCode && ERROR_CODE_KEYS.has(errorCode) ? `errors.${errorCode}` : 'errors.UNKNOWN';

  const showViewer = mutation.data !== undefined || dirty;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6" data-testid="ai-quote-brief">
      <div>
        <Link href={`/organizer/events/${eventId}`} className="text-sm text-neutral-600 underline">
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
          data-testid="ai-quote-brief-missing-data"
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

      {event && !missing && (
        <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <label htmlFor="ai-brief-category" className="text-sm font-medium text-neutral-800">
              {t('categoryLabel')}
            </label>
            <input
              id="ai-brief-category"
              type="text"
              value={serviceCategoryCode}
              onChange={(e): void => setServiceCategoryCode(e.target.value)}
              placeholder={t('categoryPlaceholder')}
              className="block w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
              data-testid="ai-brief-category-input"
            />
            <p className="text-xs text-neutral-500">{t('categoryHelp')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!serviceCategoryCode || mutation.isPending}
              className="rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:bg-neutral-300"
              data-testid="ai-brief-generate-cta"
            >
              {mutation.data ? t('actions.regenerate') : t('actions.autocomplete')}
            </button>
            {mutation.data && (
              <>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={mutation.isPending}
                  className="rounded-md border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-800"
                  data-testid="ai-brief-regenerate"
                >
                  {t('actions.regenerate')}
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700"
                  data-testid="ai-brief-discard"
                >
                  {t('actions.discard')}
                </button>
              </>
            )}
          </div>

          {mutation.isPending && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800"
              data-testid="ai-quote-brief-loading"
            >
              <p className="font-medium">{t('loading')}</p>
              <p className="mt-1 text-xs text-neutral-500">{t('loadingHint')}</p>
            </div>
          )}

          {mutation.isError && (
            <div
              role="alert"
              className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800"
              data-testid="ai-quote-brief-error"
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
                {t('actions.retry')}
              </button>
            </div>
          )}

          {showViewer && (
            <div
              aria-live="polite"
              className="space-y-4"
              data-testid="ai-quote-brief-viewer"
            >
              <AIBriefField
                label={t('sections.brief')}
                value={draft.brief}
                onChange={(v): void => patchDraft({ brief: v })}
                onDirty={markDirty}
                rows={5}
                maxLength={2000}
                testId="ai-brief-field-brief"
              />
              <AIBriefField
                label={t('sections.requirements')}
                value={draft.requirements.join('\n')}
                onChange={(v): void =>
                  patchDraft({ requirements: v.split('\n').filter((s) => s.length > 0) })
                }
                onDirty={markDirty}
                rows={4}
                helpText={t('multilineHelp')}
                testId="ai-brief-field-requirements"
              />
              <AIBriefField
                label={t('sections.questions')}
                value={draft.questions.join('\n')}
                onChange={(v): void =>
                  patchDraft({ questions: v.split('\n').filter((s) => s.length > 0) })
                }
                onDirty={markDirty}
                rows={4}
                helpText={t('multilineHelp')}
                testId="ai-brief-field-questions"
              />
              <AIBriefField
                label={t('sections.constraints')}
                value={draft.constraints.join('\n')}
                onChange={(v): void =>
                  patchDraft({ constraints: v.split('\n').filter((s) => s.length > 0) })
                }
                onDirty={markDirty}
                rows={3}
                helpText={t('multilineHelp')}
                testId="ai-brief-field-constraints"
              />

              <footer className="border-t border-neutral-100 pt-4">
                <p className="text-xs text-neutral-500">{t('hitlNotice')}</p>
                {mutation.data && (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title={t('actions.sendDisabledTooltip')}
                    className="mt-3 cursor-not-allowed rounded-md bg-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
                    data-testid="ai-brief-send-handoff"
                  >
                    {t('actions.prepareSend')}
                  </button>
                )}
              </footer>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
