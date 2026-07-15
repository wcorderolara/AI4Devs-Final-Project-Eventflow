'use client';

// US-037 (PB-P1-021 / FE-004) — Modal de confirmación D2. Se muestra ANTES de invocar apply
// cuando el preview detecta `replaced_items_count > 0`. Copy localizado con conteo. A11Y completa.
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

export interface ReplaceConfirmationDialogProps {
  open: boolean;
  replaceCount: number;
  affectedCategories?: string[];
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReplaceConfirmationDialog({
  open,
  replaceCount,
  affectedCategories = [],
  submitting = false,
  onCancel,
  onConfirm,
}: ReplaceConfirmationDialogProps): JSX.Element | null {
  const t = useTranslations('ai.budgetApply.replaceConfirm');
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    setTimeout(() => cancelBtnRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="replace-confirm-title"
        aria-describedby="replace-confirm-desc"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl focus:outline-none"
        tabIndex={-1}
      >
        <h2 id="replace-confirm-title" className="text-lg font-semibold">
          {t('title')}
        </h2>
        <p id="replace-confirm-desc" className="mt-2 text-sm text-neutral-700">
          {t('body', {
            count: replaceCount,
            categories: affectedCategories.join(', ') || t('anyCategory'),
          })}
        </p>
        <p className="mt-2 text-xs text-neutral-500">{t('manualPreserved')}</p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded border border-neutral-300 px-4 py-2 text-sm"
          >
            {t('cta.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? t('cta.confirming') : t('cta.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
