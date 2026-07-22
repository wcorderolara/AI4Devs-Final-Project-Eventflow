'use client';

// AIComparisonSummary — panel lateral accesible del comparador de Quotes (US-022 / FE-001 + FE-004).
// AC-01/AC-03 (HITL informativo) + A11Y (panel `role="complementary"`, headings semánticos,
// keyboard nav) + EC-05 (snapshot mismatch banner con opción de regenerar).
//
// El panel se controla desde `QuoteComparator` con `open` / `onClose`. `currentQuoteIds` viene del
// comparador para detectar snapshot mismatch (EC-05); si difiere del `quote_ids_snapshot` de la
// respuesta AI, se muestra el banner con acción "Regenerar" que reejecuta la mutación.
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ApiError } from '@/shared/api-client';
import {
  aiQuoteSummaryApi,
  type GenerateQuoteSummaryResponse,
  type QuoteSummaryItem,
} from '../api/aiApi';
import { useGenerateAIQuoteSummary } from '../hooks/useGenerateAIQuoteSummary';

const KNOWN_ERROR_CODES = [
  'INSUFFICIENT_QUOTES',
  'INVALID_FILTERS',
  'INVALID_CATEGORY',
  'AI_TIMEOUT',
  'AI_INVALID_OUTPUT',
  'AI_PROVIDER_ERROR',
  'AI_RATE_LIMITED',
  'RATE_LIMIT_EXCEEDED',
  'EVENT_NOT_FOUND',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

function errorMessage(err: ApiError | null, t: (k: string) => string): string {
  if (err && isKnownErrorCode(err.code)) return t(`errors.${err.code}`);
  return t('errors.UNEXPECTED');
}

export interface AIComparisonSummaryProps {
  eventId: string;
  categoryCode: string;
  currentQuoteIds: string[];
  open: boolean;
  onClose: () => void;
  /** Nombre de dominio para pintar el vendor asociado al `quote_id` (opcional). */
  vendorLabelByQuoteId?: Record<string, string>;
  /** Alternativa para tests: inyecta la mutación en vez del hook TanStack. */
  useMutationHook?: typeof useGenerateAIQuoteSummary;
  /**
   * US-059 (FE-002): resumen persistido cargado por `useLatestQuoteSummary`. Cuando la mutación
   * de generación aún no ha corrido y hay `initialData`, éste se muestra como estado "filled"
   * o "stale" (si `quote_ids_snapshot` difiere de `currentQuoteIds`). Ninguna generación se
   * dispara automáticamente — el CTA queda a criterio del usuario.
   */
  initialData?: import('../api/aiApi').GenerateQuoteSummaryResponse;
  /** US-059 (FE-002): fetch inicial en vuelo → skeleton en lugar de empty state. */
  initialLoading?: boolean;
  /**
   * US-059 (FE-002 · AC-02): `true` cuando el GET latest devolvió 404. La UI muestra empty state
   * + CTA. Cuando el mutation runs se sobreescribe con su propio `data`.
   */
  initialNotFound?: boolean;
}

interface SummarySectionProps {
  heading: string;
  items: readonly string[];
}

function SummarySection({ heading, items }: SummarySectionProps): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{heading}</h4>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-neutral-800">
        {items.map((item, i) => (
          <li key={`${heading}-${i}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

interface QuoteSummaryCardProps {
  item: QuoteSummaryItem;
  vendorLabel: string;
  t: ReturnType<typeof useTranslations>;
}

function QuoteSummaryCard({ item, vendorLabel, t }: QuoteSummaryCardProps): React.JSX.Element {
  return (
    <article
      className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm"
      aria-labelledby={`quote-summary-heading-${item.quote_id}`}
    >
      <h3
        id={`quote-summary-heading-${item.quote_id}`}
        className="text-sm font-semibold text-neutral-900"
      >
        {vendorLabel}
      </h3>
      <SummarySection heading={t('panel.headings.pros')} items={item.pros} />
      <SummarySection heading={t('panel.headings.cons')} items={item.cons} />
      <SummarySection heading={t('panel.headings.missingInfo')} items={item.missing_info} />
      {item.notes && (
        <div className="mt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t('panel.headings.notes')}
          </h4>
          <p className="mt-1 text-sm text-neutral-700">{item.notes}</p>
        </div>
      )}
    </article>
  );
}

function isSnapshotStale(
  data: GenerateQuoteSummaryResponse | undefined,
  currentQuoteIds: string[],
): boolean {
  if (!data) return false;
  if (data.quote_ids_snapshot.length !== currentQuoteIds.length) return true;
  const snap = new Set(data.quote_ids_snapshot);
  return currentQuoteIds.some((id) => !snap.has(id));
}

export function AIComparisonSummary({
  eventId,
  categoryCode,
  currentQuoteIds,
  open,
  onClose,
  vendorLabelByQuoteId,
  useMutationHook,
  initialData,
  initialLoading = false,
  initialNotFound = false,
}: AIComparisonSummaryProps): React.JSX.Element | null {
  const t = useTranslations('organizer.ai.quote_summary');
  const useMutationImpl = useMutationHook ?? useGenerateAIQuoteSummary;
  const mutation = useMutationImpl();
  const { data: mutationData, isPending, isError, error, mutate, reset } = mutation;

  // US-059 (FE-002): la mutación toma precedencia sobre `initialData` — al regenerar, el usuario
  // ve inmediatamente el nuevo resultado sin refetchs innecesarios.
  const data = mutationData ?? initialData;

  const handleGenerate = (): void => {
    mutate({ eventId, categoryCode });
  };

  const stale = useMemo(
    () => isSnapshotStale(data, currentQuoteIds),
    [data, currentQuoteIds],
  );

  if (!open) return null;

  return (
    <aside
      aria-labelledby="ai-quote-summary-title"
      className="flex h-full w-full max-w-md flex-col overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-4 shadow-sm"
      data-testid="ai-quote-summary-panel"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="ai-quote-summary-title" className="text-base font-semibold text-neutral-900">
            {t('panel.title')}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">{t('panel.hitlNotice')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('trigger.ariaClose')}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          data-testid="ai-quote-summary-close"
        >
          {t('panel.close')}
        </button>
      </header>

      {isError && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
          data-testid="ai-quote-summary-error"
        >
          {errorMessage(error, t)}
          <button
            type="button"
            onClick={() => {
              reset();
              handleGenerate();
            }}
            className="ml-2 underline"
          >
            {t('panel.regenerate')}
          </button>
        </div>
      )}

      {(isPending || (initialLoading && !data)) && !data && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="mt-3 space-y-2"
          data-testid="ai-quote-summary-loading"
        >
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
          <div className="h-24 w-full animate-pulse rounded bg-neutral-100" />
          <div className="h-24 w-full animate-pulse rounded bg-neutral-100" />
          <p className="text-xs text-neutral-500">{t('panel.loading')}</p>
          <p className="text-xs text-neutral-400">{t('panel.loadingHint')}</p>
        </div>
      )}

      {!data && !isPending && !isError && !initialLoading && (
        <div
          className="mt-3 flex flex-col gap-3"
          data-testid={initialNotFound ? 'ai-quote-summary-empty-persisted' : 'ai-quote-summary-empty'}
        >
          <p className="text-sm text-neutral-700">
            {initialNotFound ? t('panel.emptyPersistedPrompt') : t('panel.emptyPrompt')}
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="self-start rounded-md bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700"
            data-testid="ai-quote-summary-generate"
          >
            {t('panel.generateCta')}
          </button>
        </div>
      )}

      {data && (
        <div className="mt-3 flex flex-col gap-3">
          {data.locale_fallback && (
            <div
              role="status"
              className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              data-testid="ai-quote-summary-fallback-notice"
            >
              {t('panel.localeFallbackNotice')}
            </div>
          )}
          {stale && (
            <div
              role="status"
              className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900"
              data-testid="ai-quote-summary-snapshot-banner"
            >
              <p className="font-semibold">{t('snapshotBanner.title')}</p>
              <p className="mt-1 text-xs">{t('snapshotBanner.description')}</p>
              <button
                type="button"
                onClick={handleGenerate}
                className="mt-2 rounded-md border border-blue-400 bg-white px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                data-testid="ai-quote-summary-regenerate-banner"
              >
                {t('snapshotBanner.action')}
              </button>
            </div>
          )}
          <p className="text-xs text-neutral-500">
            {t('panel.generatedAt', { date: data.generated_at })}
          </p>

          <div className="space-y-3">
            {data.summaries.map((item) => (
              <QuoteSummaryCard
                key={item.quote_id}
                item={item}
                vendorLabel={vendorLabelByQuoteId?.[item.quote_id] ?? item.quote_id}
                t={t}
              />
            ))}
          </div>

          {data.overall_observations && (
            <div className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t('panel.headings.overall')}
              </h3>
              <p className="mt-1 text-sm text-neutral-800">{data.overall_observations}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            className="self-start rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            data-testid="ai-quote-summary-regenerate"
            disabled={isPending}
          >
            {t('panel.regenerate')}
          </button>
        </div>
      )}
    </aside>
  );
}

// Re-export the raw api client for consumer use (composability with tests / storybook).
export { aiQuoteSummaryApi };
