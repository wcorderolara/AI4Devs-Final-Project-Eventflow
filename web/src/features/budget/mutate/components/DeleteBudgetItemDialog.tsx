'use client';

// US-036 (PB-P1-020 / FE-007) — Modal de confirmación para eliminar un BudgetItem.
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { BudgetItemDto } from '@/features/budget/view/api/budgetApi';

export interface DeleteBudgetItemDialogProps {
  open: boolean;
  item: BudgetItemDto | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteBudgetItemDialog({
  open,
  item,
  submitting = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: DeleteBudgetItemDialogProps): React.JSX.Element | null {
  const t = useTranslations('budget.deleteItem');
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    setTimeout(() => cancelRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);
  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-budget-item-title"
        aria-describedby="delete-budget-item-desc"
        aria-busy={submitting}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl focus:outline-none"
        tabIndex={-1}
      >
        <h2 id="delete-budget-item-title" className="text-lg font-semibold">
          {t('title')}
        </h2>
        <p id="delete-budget-item-desc" className="mt-2 text-sm text-neutral-700">
          {t('body', { label: item.label })}
        </p>
        {errorMessage ? (
          <p role="alert" aria-live="polite" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
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
            {submitting ? t('cta.deleting') : t('cta.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
