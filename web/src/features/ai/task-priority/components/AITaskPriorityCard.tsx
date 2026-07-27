'use client';

// AITaskPriorityCard — surface del top 3 IA en el dashboard del evento (US-024 / FE-001).
// AC-01 (top 3 con reason + urgency) + AC-02 (empty state con CTA a US-018) + AC-04/05 (badge
// cache_hit) + AC-07 (badge fallback) + A11Y (`role="region"` + `role="list"` + headings + axe).
//
// El card se auto-invoca al montarse via `useEffect` (mismo patrón que `AITaskPriorityCard` del
// tech spec §8). El usuario dispara "Regenerar" para forzar re-fetch — si nada cambió el backend
// responde `cache_hit=true` sin invocar al provider (cost/latency friendly). Deep-link a US-030
// para marcar tareas como hechas — el card NO altera estado (HITL strict).
//
// PB-P2-032: deja de mantener su propio cromo y compone `AIRecommendationCard` +
// `AIRecommendationActions` + `StatusBadge` + `Badge` + `EmptyState` del design system. Con ello
// desaparece la paleta cruda (`red-100`, `amber-50`, `neutral-*`, `blue-50`) y el estado de carga
// pasa al único patrón aprobado (skeleton con label accesible, sin porcentaje inventado).
// El contrato HITL no cambia: sigue sin exponer ninguna acción que altere datos — los CTA son
// deep-links, y por eso el card no declara `accept` ni `reject`.
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  AIRecommendationActions,
  AIRecommendationCard,
  Badge,
  EmptyState,
  StatusBadge,
  TextLink,
  type AIRecommendationState,
  type StatusTone,
} from '@/shared/design-system';
import type { ApiError } from '@/shared/api-client';
import { type GenerateTaskPriorityResponse, type TaskPriorityItem } from '../api/aiApi';
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

/**
 * Sólo se muestran mensajes de un catálogo cerrado. Un código desconocido cae en `UNEXPECTED`:
 * así es imposible que el texto del proveedor de IA llegue a la pantalla.
 */
function errorMessage(err: ApiError | null, t: (k: string) => string): string {
  if (err && isKnownErrorCode(err.code)) return t(`errors.${err.code}`);
  return t('errors.UNEXPECTED');
}

/** Mapea `urgency_score` (1..10) a un tono semántico estable — evita cambios abruptos por 1pt. */
function urgencyTone(score: number): StatusTone {
  if (score >= 8) return 'error';
  if (score >= 5) return 'warning';
  return 'success';
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
    <li className="rounded-card border border-subtle bg-surface p-3 shadow-surface-subtle">
      <div className="flex items-start justify-between gap-3">
        <TextLink href={href} variant="inline" className="min-w-0 flex-1 text-body-sm font-medium">
          {labels.markDone}
        </TextLink>
        <StatusBadge
          status={urgencyTone(item.urgency_score)}
          showIcon={false}
          ariaLabel={`${labels.urgency}: ${item.urgency_score}/10`}
        >
          {`${item.urgency_score}/10`}
        </StatusBadge>
      </div>
      <p className="mt-1 font-body text-body-sm text-secondary">{item.reason}</p>
    </li>
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

  const loading = isPending && !response;
  const state: AIRecommendationState = loading
    ? 'loading'
    : error
      ? 'error'
      : // `locale_fallback` significa que la salida vino de la plantilla base: sigue siendo
        // revisable, sólo cambia de dónde salió.
        response?.locale_fallback
        ? 'fallback'
        : 'pending';

  return (
    <AIRecommendationCard
      state={state}
      // La divulgación de origen siempre contiene la palabra «Sugerencia» (Component
      // Foundations §31 content rules); el título del panel no sirve para eso.
      aiLabel={t('ai_label')}
      description={t('subtitle')}
      headingLevel={2}
      title={t('title')}
      loadingLabel={t('regenerating')}
      fallbackLabel={t('fallback_short')}
      fallbackAriaLabel={t('fallback')}
      errorMessage={state === 'error' ? errorMessage(error, t) : undefined}
      onRetry={state === 'error' ? handleRegenerate : undefined}
      retryLabel={t('retry')}
      isSubmitting={isPending}
      submittingLabel={t('regenerating')}
      meta={
        response?.cache_hit ? (
          <Badge variant="neutral" srLabel={t('cache_hit')}>
            {t('cache_hit_short')}
          </Badge>
        ) : null
      }
      contextNote={response?.rationale_summary ?? undefined}
      actions={
        // El único control es regenerar: el card no aplica ni descarta nada (HITL strict).
        <AIRecommendationActions
          groupLabel={t('actions_group')}
          regenerate={{
            label: t('regenerate'),
            onSelect: handleRegenerate,
            isLoading: isPending,
            loadingLabel: t('regenerating'),
          }}
        />
      }
      data-testid="ai-task-priority-card"
    >
      {response && response.top.length === 0 ? (
        <EmptyState variant="compact" title={t('empty_state.body')} headingLevel={3} />
      ) : response ? (
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
      ) : null}
    </AIRecommendationCard>
  );
}
