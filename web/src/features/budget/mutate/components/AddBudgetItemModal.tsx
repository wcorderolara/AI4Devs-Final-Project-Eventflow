'use client';

// US-036 (PB-P1-020 / FE-005) — Modal para agregar un BudgetItem. Accesible: role=dialog,
// focus trap básico, ESC, aria-labelledby/describedby, aria-busy en submitting.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface AddBudgetItemFormValues {
  label: string;
  category_code: string;
  amount_planned: string;
}

export interface AddBudgetItemModalProps {
  open: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: { label: string; category_code: string | null; amount_planned: number }) => void;
}

export function AddBudgetItemModal({
  open,
  submitting = false,
  errorMessage = null,
  onCancel,
  onSubmit,
}: AddBudgetItemModalProps): React.JSX.Element | null {
  const t = useTranslations('budget.addItem');
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const [values, setValues] = useState<AddBudgetItemFormValues>({
    label: '',
    category_code: '',
    amount_planned: '0',
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    setTimeout(() => cancelRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      setValues({ label: '', category_code: '', amount_planned: '0' });
      setTouched(false);
    }
  }, [open]);

  if (!open) return null;

  const amount = Number.parseFloat(values.amount_planned);
  const labelValid = values.label.trim().length > 0;
  const amountValid = !Number.isNaN(amount) && amount >= 0;
  const canSubmit = labelValid && amountValid && !submitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-budget-item-title"
        aria-describedby="add-budget-item-desc"
        aria-busy={submitting}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl focus:outline-none"
        tabIndex={-1}
      >
        <h2 id="add-budget-item-title" className="text-lg font-semibold">
          {t('title')}
        </h2>
        <p id="add-budget-item-desc" className="mt-1 text-sm text-neutral-600">
          {t('description')}
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!canSubmit) return;
            onSubmit({
              label: values.label.trim(),
              category_code: values.category_code.trim() || null,
              amount_planned: amount,
            });
          }}
        >
          <div>
            <label htmlFor="add-item-label" className="text-sm font-medium">
              {t('field.label')}
            </label>
            <input
              id="add-item-label"
              type="text"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
              value={values.label}
              onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
              aria-invalid={touched && !labelValid}
              aria-describedby={touched && !labelValid ? 'add-item-label-err' : undefined}
              disabled={submitting}
            />
            {touched && !labelValid ? (
              <p id="add-item-label-err" role="alert" className="mt-1 text-xs text-red-700">
                {t('field.labelRequired')}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="add-item-category" className="text-sm font-medium">
              {t('field.category')}
            </label>
            <input
              id="add-item-category"
              type="text"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
              placeholder={t('field.categoryPlaceholder')}
              value={values.category_code}
              onChange={(e) => setValues((v) => ({ ...v, category_code: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="add-item-amount" className="text-sm font-medium">
              {t('field.amount')}
            </label>
            <input
              id="add-item-amount"
              type="text"
              inputMode="decimal"
              className="mt-1 w-32 rounded border border-neutral-300 px-2 py-1"
              value={values.amount_planned}
              onChange={(e) => setValues((v) => ({ ...v, amount_planned: e.target.value }))}
              aria-invalid={touched && !amountValid}
              aria-describedby={touched && !amountValid ? 'add-item-amount-err' : undefined}
              disabled={submitting}
            />
            {touched && !amountValid ? (
              <p id="add-item-amount-err" role="alert" className="mt-1 text-xs text-red-700">
                {t('field.amountInvalid')}
              </p>
            ) : null}
          </div>

          {errorMessage ? (
            <p role="alert" aria-live="polite" className="rounded bg-red-50 p-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
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
              type="submit"
              disabled={!canSubmit}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? t('cta.saving') : t('cta.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
