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
//
// PB-P2-030 — El aviso de fallo pasa del banner ad-hoc (`banner banner--error`, hojas de estilo
// propias fuera del sistema) al `Alert` compartido del design system, con `Button` para el
// reintento. Mantiene `role="alert"` (`live` lo activa para la variante `error`), el mismo copy y
// la misma lógica de reintento. Es un mensaje **persistente en la página**, no un toast: el error
// crítico no puede desvanecerse (CMP-DEC-022 / Component Foundations §27).
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, Button } from '@/shared/design-system';
import { cx } from '@/shared/design-system/internal/cx';
import type { TaskListItemDTO } from '../list/api/tasksListApi.types';
import type { CanonicalTaskStatus } from '../mutate/domain/taskStatusTransitions';
import {
  computeQuickActions,
  type EventMutabilityStatus,
  type QuickActionMatrixRow,
} from './compute-quick-actions';
import { extractErrorMapping, useQuickActionStatusMutation } from './useQuickActionStatusMutation';

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
    // Las clases BEM originales (`task-quick-toggle__check`, …) nunca tuvieron hoja de estilo:
    // los dos controles se renderizaban como texto plano pegado. Pasan a utilidades del design
    // system, con el target táctil ≥ 44 px que el comentario de cabecera ya declaraba como
    // convención pero que ningún CSS aplicaba.
    // Los controles se apilan a ancho completo dentro de la tarjeta del tablero: la acción
    // principal («marcar como hecha») queda como botón sólido y la secundaria («omitir») como
    // texto, jerarquía que a la altura de una card se lee mejor que dos botones en fila.
    <div className="flex flex-col gap-1" data-event-status={eventStatus ?? 'unknown'}>
      {checkRow && (
        <button
          type="button"
          role="checkbox"
          aria-checked={task.status === 'done'}
          aria-label={t(checkRow.ariaLabelKey as never)}
          aria-disabled={disabled ? 'true' : undefined}
          disabled={disabled}
          title={disabled ? t(disabledTooltipKey as never) : undefined}
          className={cx(
            'focus-ring inline-flex min-h-touch w-full items-center justify-center gap-1.5',
            'rounded-button border px-3 py-2 font-ui text-body-sm font-medium',
            'transition-colors duration-fast ease-standard motion-reduce:transition-none',
            task.status === 'done'
              ? 'border-feedback-success bg-feedback-success text-feedback-success'
              : 'border-subtle bg-surface text-primary shadow-surface-subtle hover:border-interactive hover:bg-action-primary hover:text-action-primary-foreground',
            'disabled:cursor-not-allowed disabled:opacity-disabled',
          )}
          onClick={(): void => void apply(checkRow)}
          data-testid={`task-quick-check-${task.id}`}
        >
          <span>{t(checkRow.labelKey as never)}</span>
          {mutation.isPending && (
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
              role="presentation"
            />
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
          className={cx(
            'focus-ring inline-flex min-h-touch w-full items-center justify-center rounded-button px-3 py-2',
            'font-ui text-body-sm font-medium text-secondary hover:text-feedback-error',
            'transition-colors duration-fast ease-standard motion-reduce:transition-none',
            'disabled:cursor-not-allowed disabled:opacity-disabled',
          )}
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
        // `live` ⇒ `role="alert"` en la variante `error`: el aviso se inserta tras una acción
        // fallida del usuario, así que debe interrumpir. No se añade `aria-live` manual: el rol
        // `alert` ya implica `assertive` y duplicarlo provoca anuncios repetidos.
        <Alert
          variant="error"
          live
          className="mt-2"
          action={
            toastMessage.retry && checkRow ? (
              <Button variant="secondary" size="sm" onClick={(): void => void apply(checkRow)}>
                {t('tasks.status.error.retry' as never)}
              </Button>
            ) : undefined
          }
        >
          <span>{t(toastMessage.key as never)}</span>
        </Alert>
      )}
    </div>
  );
}
