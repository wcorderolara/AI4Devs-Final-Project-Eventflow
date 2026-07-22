'use client';

// AITaskPriorityCard — surface del top 3 IA en el dashboard del evento (US-024 / FE-001).
// AC-01 (top 3 con reason + urgency) + AC-02 (empty state con CTA a US-018) + AC-04/05 (badge
// cache_hit) + AC-07 (badge fallback) + A11Y (`role="region"` + `role="list"` + headings + axe).
//
// El card se auto-invoca al montarse via `useEffect` (mismo patrón que `AITaskPriorityCard` del
// tech spec §8). El usuario dispara "Regenerar" para forzar re-fetch — si nada cambió el backend
// responde `cache_hit=true` sin invocar al provider (cost/latency friendly). Deep-link a US-030
// para marcar tareas como hechas — el card NO altera estado (HITL strict).
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { ApiError } from '@/shared/api-client';
import {
  type GenerateTaskPriorityResponse,
  type TaskPriorityItem,
} from '../api/aiApi';
import { useTaskPriority } from '../hooks/useTaskPriority';

const KNOWN_ERROR_CODES = [
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

/** Mapea `urgency_score` (1..10) a un `variant` de color estable — evita cambios abruptos por 1pt. */
function urgencyVariant(score: number): 'high' | 'medium' | 'low' {
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

const URGENCY_STYLES: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

interface UrgencyBadgeProps {
  score: number;
  label: string;
}

function UrgencyBadge({ score, label }: UrgencyBadgeProps): React.JSX.Element {
  const variant = urgencyVariant(score);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[variant]}`}
      aria-label={`${label}: ${score}/10`}
    >
      {`${score}/10`}
    </span>
  );
}

export interface AITaskPriorityCardProps {
  eventId: string;
  /** Deep-link handler: navega a la tarea (US-030 mark done). Si se omite, se renderiza un `<a>` estático. */
  buildTaskHref?: (taskId: string) => string;
  /** Alternativa para tests: inyecta la mutación en vez del hook TanStack. */
  useMutationHook?: typeof useTaskPriority;
  /** Si `true`, no dispara la mutación automáticamente al montar (útil en Storybook / tests). */
  autoFetch?: boolean;
}

interface TaskItemRowProps {
  item: TaskPriorityItem;
  href: string;
  labels: {
    markDone: string;
    urgency: string;
  };
}

function TaskItemRow({ item, href, labels }: TaskItemRowProps): React.JSX.Element {
  return (
    <li
      className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm"
      aria-label={`Sugerencia IA para tarea ${item.task_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <a
          href={href}
          className="flex-1 text-sm font-medium text-neutral-900 underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
        >
          {labels.markDone}
        </a>
        <UrgencyBadge score={item.urgency_score} label={labels.urgency} />
      </div>
      <p className="mt-1 text-sm text-neutral-700">{item.reason}</p>
    </li>
  );
}

function EmptyState({
  t,
  onGenerate,
}: {
  t: ReturnType<typeof useTranslations>;
  onGenerate?: () => void;
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center">
      <p className="text-sm text-neutral-700">{t('empty_state.body')}</p>
      {onGenerate ? (
        <button
          type="button"
          onClick={onGenerate}
          className="mt-3 inline-flex items-center rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          {t('empty_state.cta')}
        </button>
      ) : null}
    </div>
  );
}

function LoadingSkeleton(): React.JSX.Element {
  return (
    <ul className="space-y-2" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-14 animate-pulse rounded-md bg-neutral-100" aria-hidden="true" />
      ))}
    </ul>
  );
}

function CacheHitPill({ t }: { t: ReturnType<typeof useTranslations> }): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
      aria-label={t('cache_hit')}
      title={t('cache_hit')}
    >
      {t('cache_hit_short')}
    </span>
  );
}

function FallbackBadge({ t }: { t: ReturnType<typeof useTranslations> }): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
      aria-label={t('fallback')}
      title={t('fallback')}
    >
      {t('fallback_short')}
    </span>
  );
}

function ErrorBanner({
  message,
  onRetry,
  retryLabel,
}: {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}): React.JSX.Element {
  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
      role="alert"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-900 hover:bg-red-200"
      >
        {retryLabel}
      </button>
    </div>
  );
}

export function AITaskPriorityCard({
  eventId,
  buildTaskHref,
  useMutationHook = useTaskPriority,
  autoFetch = true,
}: AITaskPriorityCardProps): React.JSX.Element {
  const t = useTranslations('organizer.ai.task_priority');
  const mutation = useMutationHook();
  const { data, error, isPending } = mutation;

  useEffect(() => {
    if (!autoFetch) return;
    mutation.mutate({ eventId });
    // Solo al montar y cuando cambia eventId — evita loops. La regeneración explícita usa el botón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, eventId]);

  const handleRegenerate = (): void => {
    mutation.mutate({ eventId });
  };

  const response = data as GenerateTaskPriorityResponse | undefined;
  const hrefFor = (taskId: string): string =>
    buildTaskHref ? buildTaskHref(taskId) : `#task-${taskId}`;

  return (
    <section
      aria-labelledby="ai-task-priority-heading"
      className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2
            id="ai-task-priority-heading"
            className="text-base font-semibold text-neutral-900"
          >
            {t('title')}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-600">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {response?.cache_hit ? <CacheHitPill t={t} /> : null}
          {response?.locale_fallback ? <FallbackBadge t={t} /> : null}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending}
            className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t('regenerating') : t('regenerate')}
          </button>
        </div>
      </header>

      {isPending && !response ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorBanner
          message={errorMessage(error, t)}
          onRetry={handleRegenerate}
          retryLabel={t('retry')}
        />
      ) : response && response.top.length === 0 ? (
        <EmptyState t={t} />
      ) : response ? (
        <>
          <ul className="space-y-2">
            {response.top.map((item) => (
              <TaskItemRow
                key={item.task_id}
                item={item}
                href={hrefFor(item.task_id)}
                labels={{ markDone: t('mark_done'), urgency: t('urgency') }}
              />
            ))}
          </ul>
          {response.rationale_summary ? (
            <footer className="mt-3 text-xs text-neutral-600">{response.rationale_summary}</footer>
          ) : null}
        </>
      ) : (
        <LoadingSkeleton />
      )}
    </section>
  );
}
