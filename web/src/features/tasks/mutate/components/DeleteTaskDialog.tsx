'use client';

// US-029 (PB-P1-018 / FE-003) — Diálogo destructivo de soft delete.
//   * `role='dialog'`, `aria-modal='true'`, `aria-labelledby`.
//   * Focus trap Tab/Shift+Tab; foco inicial en "Cancelar" (patrón destructivo).
//   * Cierre con `Esc` (solo cierra; no elimina).
//   * Botón "Eliminar" con `data-testid` claro y estado loading.
//   * Manejo de errores: 409 EVENT_NOT_MUTABLE banner; 404 toast + cierre.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { useDeleteEventTask } from '../hooks/useMutateEventTask';

export interface DeleteTaskDialogProps {
  eventId: string;
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

export function DeleteTaskDialog({
  eventId,
  taskId,
  isOpen,
  onClose,
  onDeleted,
  returnFocusRef,
}: DeleteTaskDialogProps): JSX.Element | null {
  const t = useTranslations('checklist.mutate.delete');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mutation = useDeleteEventTask(eventId);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    const prev = document.activeElement as HTMLElement | null;
    const returnTarget = returnFocusRef?.current;
    const raf = window.requestAnimationFrame(() => cancelBtnRef.current?.focus());
    return (): void => {
      window.cancelAnimationFrame(raf);
      const target = returnTarget ?? prev;
      target?.focus?.();
    };
  }, [isOpen, returnFocusRef]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [isOpen, onClose],
  );

  const onConfirm = useCallback(async (): Promise<void> => {
    setErrorMsg(null);
    try {
      await mutation.mutateAsync({ taskId });
      onDeleted?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EVENT_NOT_MUTABLE') {
          setErrorMsg(t('errors.eventNotMutable'));
        } else if (err.status === 404) {
          setErrorMsg(t('errors.notFound'));
        } else if (err.status === 403) {
          setErrorMsg(t('errors.forbidden'));
        } else if (err.status === 401) {
          setErrorMsg(t('errors.unauthorized'));
        } else {
          setErrorMsg(t('errors.generic'));
        }
      } else {
        setErrorMsg(t('errors.generic'));
      }
    }
  }, [mutation, taskId, onDeleted, onClose, t]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onKeyDown={onKeyDown}
      onClick={(e): void => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-card modal-card--destructive"
      >
        <h2 id={titleId} className="modal-title">
          {t('title')}
        </h2>
        <p>{t('body')}</p>

        {errorMsg && (
          <div className="banner banner--error" role="alert" aria-live="assertive">
            {errorMsg}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            ref={cancelBtnRef}
            onClick={onClose}
            className="btn btn--secondary"
            disabled={mutation.isPending}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={(): void => void onConfirm()}
            className="btn btn--danger"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending ? 'true' : undefined}
            data-testid="delete-task-confirm"
          >
            {mutation.isPending ? t('deleting') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
