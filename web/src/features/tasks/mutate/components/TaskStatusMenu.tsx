'use client';

// US-029 (PB-P1-018 / FE-002) — Menú de transición de estado por tarea.
//   * Solo muestra las transiciones permitidas según `currentStatus` (constante compartida).
//   * `aria-haspopup='menu'`, `role='menu'`, navegación con flechas + `Enter`.
//   * Confirm dialog cuando la transición es a terminal (`done`/`skipped`) — AC-02, EC-02.
//   * Manejo de `409 INVALID_TRANSITION` con banner localizado.
// Nota: el estado `active` (sembrado por US-031) NO participa del state machine canónico; si
// llega, se muestra "Estado no soportado" en el menú (todos los items disabled).
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import type { TaskListItemDTO } from '../../list/api/tasksListApi.types';
import { useUpdateEventTaskStatus } from '../hooks/useMutateEventTask';
import {
  TERMINAL_TASK_STATUSES,
  allowedTransitionsFrom,
  type CanonicalTaskStatus,
} from '../domain/taskStatusTransitions';

export interface TaskStatusMenuProps {
  eventId: string;
  task: TaskListItemDTO;
  readOnly?: boolean;
}

function isCanonical(s: string): s is CanonicalTaskStatus {
  return s === 'pending' || s === 'in_progress' || s === 'done' || s === 'skipped';
}

export function TaskStatusMenu({ eventId, task, readOnly = false }: TaskStatusMenuProps): JSX.Element {
  const t = useTranslations('checklist.mutate.status');
  const [open, setOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<CanonicalTaskStatus | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mutation = useUpdateEventTaskStatus(eventId);

  const canonical: CanonicalTaskStatus | null = isCanonical(task.status) ? task.status : null;
  const transitions = useMemo(
    () => (canonical ? allowedTransitionsFrom(canonical) : []),
    [canonical],
  );

  const applyTransition = useCallback(
    async (next: CanonicalTaskStatus): Promise<void> => {
      setErrorBanner(null);
      try {
        await mutation.mutateAsync({ taskId: task.id, status: next });
        setOpen(false);
        setConfirmTarget(null);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'INVALID_TRANSITION') {
            setErrorBanner(t('errors.invalidTransition', { currentStatus: t(`labels.${task.status}` as never) }));
          } else if (err.code === 'EVENT_NOT_MUTABLE') {
            setErrorBanner(t('errors.eventNotMutable'));
          } else if (err.status === 404) {
            setErrorBanner(t('errors.notFound'));
          } else {
            setErrorBanner(t('errors.generic'));
          }
        } else {
          setErrorBanner(t('errors.generic'));
        }
      }
    },
    [mutation, task.id, task.status, t],
  );

  const handleSelect = useCallback(
    (next: CanonicalTaskStatus): void => {
      if (TERMINAL_TASK_STATUSES.has(next)) {
        setConfirmTarget(next);
      } else {
        void applyTransition(next);
      }
    },
    [applyTransition],
  );

  const disabled = readOnly || mutation.isPending;

  return (
    <div className="task-status-menu" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        onClick={(): void => setOpen((v) => !v)}
        className="btn btn--secondary"
        disabled={disabled}
      >
        {t('menuButton')} · {t(`labels.${task.status}` as never)}
      </button>

      {open && transitions.length > 0 && (
        <ul role="menu" className="task-status-menu__list">
          {transitions.map((next) => (
            <li key={next} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={(): void => handleSelect(next)}
                disabled={disabled}
              >
                {t(`labels.${next}`)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && canonical && transitions.length === 0 && (
        <p role="status" aria-live="polite" className="task-status-menu__terminal">
          {t('terminal')}
        </p>
      )}

      {open && !canonical && (
        <p role="status" aria-live="polite" className="task-status-menu__unknown">
          {t('unsupported')}
        </p>
      )}

      {confirmTarget && (
        <ConfirmTransitionDialog
          nextStatus={confirmTarget}
          onConfirm={(): void => void applyTransition(confirmTarget)}
          onCancel={(): void => setConfirmTarget(null)}
          isPending={mutation.isPending}
        />
      )}

      {errorBanner && (
        <div className="banner banner--error" role="alert" aria-live="assertive">
          {errorBanner}
        </div>
      )}
    </div>
  );
}

function ConfirmTransitionDialog({
  nextStatus,
  onConfirm,
  onCancel,
  isPending,
}: {
  nextStatus: CanonicalTaskStatus;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}): JSX.Element {
  const t = useTranslations('checklist.mutate.status.confirm');
  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onCancel}
      onKeyDown={(e): void => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        onClick={(e): void => e.stopPropagation()}
      >
        <p>{t('body', { next: nextStatus })}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={isPending}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onConfirm}
            disabled={isPending}
            aria-busy={isPending ? 'true' : undefined}
          >
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
