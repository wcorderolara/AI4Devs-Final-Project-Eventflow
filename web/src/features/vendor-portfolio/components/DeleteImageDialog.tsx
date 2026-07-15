'use client';

// DeleteImageDialog (US-048 / PB-P1-026 / FE-001).
// Modal accesible con `role="dialog"`, `aria-modal="true"`, focus trap básico (TAB queda
// dentro del diálogo), ESC cierra sin confirmar, foco inicial en "Cancelar" (D2 / A11Y).
// Textarea opcional para `deletion_reason` (label visible, contador de caracteres,
// límite 500 alineado con el backend).
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDeletePortfolioImage } from '../hooks/useDeletePortfolioImage';

const MAX_REASON = 500;

export interface DeleteImageDialogProps {
  isOpen: boolean;
  imageId: string;
  workLabel: string;
  onClose: () => void;
  onDeleted: (imageId: string) => void;
}

type ErrorCode =
  | 'ATTACHMENT_NOT_FOUND'
  | 'INVALID_DELETION_REASON'
  | 'PROFILE_HIDDEN'
  | 'PROFILE_NOT_FOUND'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'UNEXPECTED';

interface ApiErrorShape {
  code?: unknown;
}

function resolveErrorCode(err: unknown): ErrorCode {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as ApiErrorShape).code;
    if (typeof code === 'string') {
      const known: readonly ErrorCode[] = [
        'ATTACHMENT_NOT_FOUND',
        'INVALID_DELETION_REASON',
        'PROFILE_HIDDEN',
        'PROFILE_NOT_FOUND',
        'AUTHENTICATION_REQUIRED',
        'FORBIDDEN',
      ];
      if ((known as readonly string[]).includes(code)) return code as ErrorCode;
    }
  }
  return 'UNEXPECTED';
}

export function DeleteImageDialog(props: DeleteImageDialogProps): JSX.Element | null {
  const t = useTranslations('vendor.portfolio.delete');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<ErrorCode | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const errorId = useId();
  const mutation = useDeletePortfolioImage();

  useEffect(() => {
    if (props.isOpen) {
      setReason('');
      setError(null);
      // Foco inicial en "Cancelar" (D2 / A11Y): opción segura por defecto.
      requestAnimationFrame(() => cancelRef.current?.focus());
    }
  }, [props.isOpen]);

  const handleClose = useCallback(() => {
    if (mutation.isPending) return;
    props.onClose();
  }, [mutation.isPending, props]);

  useEffect(() => {
    if (!props.isOpen) return;
    // ESC + focus trap se gestionan como listener global mientras el diálogo está abierto
    // — evita colgar el keydown de un `role="dialog"` (ESLint jsx-a11y lo considera no
    // interactivo) y garantiza que Tab/Shift+Tab funcionan aunque el foco viva en el body.
    const handleKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        handleClose();
        return;
      }
      if (ev.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (first === undefined || last === undefined) return;
        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [props.isOpen, handleClose]);

  const onConfirm = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await mutation.mutateAsync({
        imageId: props.imageId,
        deletionReason: reason.trim().length > 0 ? reason.trim() : undefined,
      });
      props.onDeleted(props.imageId);
      props.onClose();
    } catch (err) {
      setError(resolveErrorCode(err));
    }
  }, [mutation, props, reason]);

  if (!props.isOpen) return null;

  const remaining = MAX_REASON - reason.length;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
          {t('title', { workLabel: props.workLabel })}
        </h2>
        <p id={descId} className="mt-2 text-sm text-neutral-600">
          {t('description')}
        </p>

        <label className="mt-4 block text-sm font-medium text-neutral-800">
          <span>{t('reason.label')}</span>
          <textarea
            value={reason}
            onChange={(ev) => setReason(ev.target.value.slice(0, MAX_REASON))}
            placeholder={t('reason.placeholder')}
            maxLength={MAX_REASON}
            rows={3}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <p className="mt-1 text-xs text-neutral-500" aria-live="polite">
          {t('reason.remaining', { remaining })}
        </p>

        {error !== null && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {t(`errors.${error}`)}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={mutation.isPending}
            aria-describedby={error !== null ? errorId : undefined}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {mutation.isPending ? t('actions.deleting') : t('actions.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
