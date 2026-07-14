'use client';

// US-030 (PB-P1-018 / FE-005) — Componente reusable `TaskStatusQuickToggle`.
//   * Checkbox principal `role="checkbox"` + `aria-checked` para `check_done` / `uncheck_done`.
//   * Botón secundario `role="button"` + `aria-pressed` para `skip` / `resume`.
//   * Estado deshabilitado con `aria-disabled` + tooltip cuando `event.status ∈ {cancelled, completed}`
//     o `mutation.isPending`.
//   * Región `aria-live="polite"` que anuncia el nuevo estado al éxito.
//   * Soporte teclado `Space`/`Enter` (nativo en `<button role="checkbox">`).
//   * Spinner inline durante `mutation.isPending`.
//   * Animación reducida vía CSS `@media (prefers-reduced-motion: reduce)`.
//   * Target táctil ≥ 44 × 44 px (estilo aplicado en CSS externo — se documenta como convención).
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TaskListItemDTO } from '../list/api/tasksListApi.types';
import type { CanonicalTaskStatus } from '../mutate/domain/taskStatusTransitions';
import {
  computeQuickActions,
  type EventMutabilityStatus,
  type QuickActionMatrixRow,
} from './compute-quick-actions';
import {
  extractErrorMapping,
  useQuickActionStatusMutation,
} from './useQuickActionStatusMutation';

export interface TaskStatusQuickToggleProps {
  eventId: string;
  task: TaskListItemDTO;
  eventStatus?: EventMutabilityStatus;
}

function isCanonical(s: string): s is CanonicalTaskStatus {
  return s === 'pending' || s === 'in_progress' || s === 'done' || s === 'skipped';
}

export function TaskStatusQuickToggle({
  eventId,
  task,
  eventStatus,
}: TaskStatusQuickToggleProps): JSX.Element | null {
  const t = useTranslations();
  const mutation = useQuickActionStatusMutation(eventId);
  const [announceKey, setAnnounceKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ key: string; retry: boolean } | null>(null);

  const canonicalStatus = isCanonical(task.status) ? task.status : null;
  const rows: QuickActionMatrixRow[] = useMemo(
    () => (canonicalStatus ? computeQuickActions(canonicalStatus, eventStatus) : []),
    [canonicalStatus, eventStatus],
  );

  if (!canonicalStatus || rows.length === 0) return null;

  const eventBlocked = eventStatus === 'cancelled' || eventStatus === 'completed';
  const disabled = eventBlocked || mutation.isPending;

  const checkRow = rows.find((r) => r.action === 'check_done' || r.action === 'uncheck_done');
  const secondaryRow = rows.find((r) => r.action === 'skip' || r.action === 'resume');

  async function apply(row: QuickActionMatrixRow): Promise<void> {
    if (!canonicalStatus || !row.enabled || disabled) return;
    setToastMessage(null);
    try {
      await mutation.mutateAsync({
        taskId: task.id,
        fromStatus: canonicalStatus,
        toStatus: row.targetStatus,
        action: row.action,
      });
      setAnnounceKey(`tasks.status.quick_action.announce.${row.targetStatus}`);
    } catch (err) {
      const mapping = extractErrorMapping(err);
      setToastMessage({ key: mapping.i18nKey, retry: mapping.includeRetry });
    }
  }

  const disabledTooltipKey = eventBlocked
    ? 'tasks.status.disabled.event_locked'
    : 'tasks.status.disabled.mutation_pending';

  return (
    <div className="task-quick-toggle" data-event-status={eventStatus ?? 'unknown'}>
      {checkRow && (
        <button
          type="button"
          role="checkbox"
          aria-checked={task.status === 'done'}
          aria-label={t(checkRow.ariaLabelKey as never)}
          aria-disabled={disabled ? 'true' : undefined}
          disabled={disabled}
          title={disabled ? t(disabledTooltipKey as never) : undefined}
          className="task-quick-toggle__check"
          onClick={(): void => void apply(checkRow)}
          data-testid={`task-quick-check-${task.id}`}
        >
          <span className="task-quick-toggle__label">{t(checkRow.labelKey as never)}</span>
          {mutation.isPending && (
            <span className="task-quick-toggle__spinner" aria-hidden="true" role="presentation" />
          )}
        </button>
      )}

      {secondaryRow && (
        <button
          type="button"
          aria-pressed={task.status === 'skipped' ? 'true' : 'false'}
          aria-label={t(secondaryRow.ariaLabelKey as never)}
          aria-disabled={disabled ? 'true' : undefined}
          disabled={disabled}
          title={disabled ? t(disabledTooltipKey as never) : undefined}
          className="task-quick-toggle__secondary"
          onClick={(): void => void apply(secondaryRow)}
          data-testid={`task-quick-secondary-${task.id}`}
        >
          {t(secondaryRow.labelKey as never)}
        </button>
      )}

      {/* aria-live: se re-anuncia cada vez que el estado cambia con éxito. */}
      <span className="sr-only" role="status" aria-live="polite">
        {announceKey ? t(announceKey as never) : null}
      </span>

      {toastMessage && (
        <div className="banner banner--error" role="alert" aria-live="assertive">
          <span>{t(toastMessage.key as never)}</span>
          {toastMessage.retry && checkRow && (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={(): void => void apply(checkRow)}
            >
              {t('tasks.status.error.retry' as never)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
