'use client';

// US-037 (PB-P1-021 / FE-003) — Dialog principal. Preview de las items de `budget_suggestion`,
// edición inline de `estimatedAmount` por fila, toggle de inclusión por fila, total acumulado y
// botón "Aplicar" que envía `editedPayload` (subset editado; si no hay edits envía nada).
// A11Y: `role="dialog"`, `aria-labelledby`, `aria-describedby`, focus trap, ESC, `aria-busy`,
// `aria-live` para status. Consumidor pasa `initialItems` y `currencyCode` desde la recomendación.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/shared/i18n';

export interface BudgetItemPreview {
  category: string;
  categoryName?: string;
  estimatedAmount: string;
  notes?: string;
}

interface Row extends BudgetItemPreview {
  included: boolean;
  editedAmount: string;
  editedLabel: string;
}

export interface ApplyAIBudgetDialogProps {
  open: boolean;
  currencyCode: string;
  initialItems: BudgetItemPreview[];
  /** Renderiza label por category cuando `categoryName` no viene. */
  translateCategory?: (code: string) => string;
  submitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  /** Recibe `editedPayload` completo (canonical). Cuando se aceptan TODAS as-is, se puede omitir el `editedPayload` desde el consumidor. */
  onSubmit: (payload: {
    editedPayload: {
      currencyCode: string;
      items: Array<{ category: string; estimatedAmount: string; label?: string }>;
    };
    edited: boolean;
    replacedItemsCountHint?: number;
  }) => void;
  /** Cuando > 0, el consumidor debe abrir `ReplaceConfirmationDialog` antes de invocar `onSubmit`. */
  replacedItemsCountHint?: number;
}

function totalAmount(rows: Row[]): number {
  return rows
    .filter((r) => r.included)
    .reduce((acc, r) => acc + (Number.parseFloat(r.editedAmount) || 0), 0);
}

export function ApplyAIBudgetDialog({
  open,
  currencyCode,
  initialItems,
  translateCategory,
  submitting = false,
  errorMessage = null,
  onCancel,
  onSubmit,
  replacedItemsCountHint,
}: ApplyAIBudgetDialogProps): JSX.Element | null {
  const t = useTranslations('ai.budgetApply');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const [rows, setRows] = useState<Row[]>(() =>
    initialItems.map((it) => ({
      ...it,
      included: true,
      editedAmount: it.estimatedAmount,
      editedLabel: it.categoryName ?? '',
    })),
  );

  // Reset rows when items change (nueva recomendación).
  useEffect(() => {
    setRows(
      initialItems.map((it) => ({
        ...it,
        included: true,
        editedAmount: it.estimatedAmount,
        editedLabel: it.categoryName ?? '',
      })),
    );
  }, [initialItems]);

  // ESC cierra; focus trap simple sobre el dialog.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKey);
    // Focus inicial en Cancelar (evita submit accidental por Enter).
    setTimeout(() => cancelBtnRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  const anyIncluded = rows.some((r) => r.included);
  const total = useMemo(() => totalAmount(rows), [rows]);

  const handleApply = useCallback(() => {
    const included = rows.filter((r) => r.included);
    const items = included.map((r) => {
      const item: { category: string; estimatedAmount: string; label?: string } = {
        category: r.category,
        estimatedAmount: r.editedAmount,
      };
      if (r.editedLabel && r.editedLabel !== (r.categoryName ?? '')) {
        item.label = r.editedLabel;
      }
      return item;
    });
    // edited flag: cambia si subset o si cualquier estimatedAmount/label difiere.
    const edited =
      included.length !== rows.length ||
      included.some(
        (r) => r.editedAmount !== r.estimatedAmount || (r.editedLabel !== '' && r.editedLabel !== (r.categoryName ?? '')),
      );
    onSubmit({
      editedPayload: { currencyCode, items },
      edited,
      replacedItemsCountHint,
    });
  }, [rows, currencyCode, onSubmit, replacedItemsCountHint]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-ai-budget-dialog-title"
        aria-describedby="apply-ai-budget-dialog-desc"
        aria-busy={submitting}
        className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl focus:outline-none"
        tabIndex={-1}
      >
        <header className="mb-4">
          <h2 id="apply-ai-budget-dialog-title" className="text-lg font-semibold">
            {t('title')}
          </h2>
          <p id="apply-ai-budget-dialog-desc" className="mt-1 text-sm text-neutral-600">
            {t('description')}
          </p>
        </header>

        <div role="region" aria-label={t('itemsRegionLabel')} className="max-h-[50vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="w-8 pb-2">{t('col.include')}</th>
                <th className="pb-2">{t('col.category')}</th>
                <th className="pb-2">{t('col.label')}</th>
                <th className="pb-2 text-right">{t('col.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const inputId = `apply-ai-budget-row-${idx}`;
                const catName = r.categoryName ?? (translateCategory ? translateCategory(r.category) : r.category);
                return (
                  <tr key={r.category} className="border-t">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        aria-label={t('toggleAria', { category: catName })}
                        checked={r.included}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, included: e.target.checked } : row)),
                          )
                        }
                        disabled={submitting}
                      />
                    </td>
                    <td className="py-2">
                      <label htmlFor={`${inputId}-label`} className="font-medium">
                        {catName}
                      </label>
                    </td>
                    <td className="py-2">
                      <input
                        id={`${inputId}-label`}
                        type="text"
                        className="w-full rounded border border-neutral-300 px-2 py-1"
                        placeholder={catName}
                        value={r.editedLabel}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, editedLabel: e.target.value } : row)),
                          )
                        }
                        disabled={submitting || !r.included}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <input
                        id={`${inputId}-amount`}
                        type="text"
                        inputMode="decimal"
                        aria-label={t('amountAria', { category: catName })}
                        className="w-28 rounded border border-neutral-300 px-2 py-1 text-right"
                        value={r.editedAmount}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, editedAmount: e.target.value } : row)),
                          )
                        }
                        disabled={submitting || !r.included}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={3} className="py-2 text-right">
                  {t('total')}
                </td>
                <td className="py-2 text-right">
                  <Money amount={total} currency={currencyCode} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {errorMessage ? (
          <p role="alert" aria-live="polite" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

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
            onClick={handleApply}
            disabled={!anyIncluded || submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? t('cta.applying') : t('cta.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
