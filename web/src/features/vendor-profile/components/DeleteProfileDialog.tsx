'use client';

// DeleteProfileDialog (US-041 / FE-003, AC-05 / AC-09).
// Modal accesible con `role="dialog"`, `aria-modal="true"`, `aria-labelledby` + `aria-describedby`,
// focus trap simple (autofocus + ESC cierra), y bloqueo del submit mientras la mutación está in-flight.
import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface DeleteProfileDialogProps {
  isOpen: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  errorMessage?: string | null;
}

export function DeleteProfileDialog({
  isOpen,
  submitting,
  onCancel,
  onConfirm,
  errorMessage = null,
}: DeleteProfileDialogProps): React.JSX.Element | null {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Enfoca el botón "Cancelar" al abrir — WCAG focus visible en apertura de modal.
    cancelRef.current?.focus();
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && !submitting) {
        event.stopPropagation();
        onCancel();
      }
      if (event.key === 'Tab') {
        // Focus trap mínimo: circular entre los dos botones del modal.
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    },
    [onCancel, submitting],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button
        type="button"
        aria-label="close overlay"
        onClick={submitting ? undefined : onCancel}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
        tabIndex={-1}
      />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- role="dialog" es interactivo por naturaleza (WAI-ARIA); necesita capturar Tab/ESC. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="delete-dialog-title" className="text-lg font-semibold">
          <DeleteTitle />
        </h2>
        <p id="delete-dialog-desc" className="mt-2 text-sm text-neutral-700">
          <DeleteDescription />
        </p>

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            <CancelLabel />
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            aria-busy={submitting}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? <SubmittingLabel /> : <ConfirmLabel />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componentes pequeños para aislar los `useTranslations` de la sub-namespace `delete`.
function DeleteTitle(): React.JSX.Element {
  const t = useTranslations('vendor.profile.edit.delete');
  return <>{t('title')}</>;
}
function DeleteDescription(): React.JSX.Element {
  const t = useTranslations('vendor.profile.edit.delete');
  return <>{t('description')}</>;
}
function CancelLabel(): React.JSX.Element {
  const t = useTranslations('vendor.profile.edit.delete');
  return <>{t('cancel')}</>;
}
function ConfirmLabel(): React.JSX.Element {
  const t = useTranslations('vendor.profile.edit.delete');
  return <>{t('confirm')}</>;
}
function SubmittingLabel(): React.JSX.Element {
  const t = useTranslations('vendor.profile.edit.delete');
  return <>{t('submitting')}</>;
}
