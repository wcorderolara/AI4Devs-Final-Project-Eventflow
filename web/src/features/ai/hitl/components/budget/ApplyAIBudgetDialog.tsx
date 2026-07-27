'use client';

// US-037 (PB-P1-021 / FE-003) — Dialog principal. Preview de las items de `budget_suggestion`,
// edición inline de `estimatedAmount` por fila, toggle de inclusión por fila, total acumulado y
// botón "Aplicar" que envía `editedPayload` (subset editado; si no hay edits envía nada).
// A11Y: `role="dialog"`, `aria-labelledby`, `aria-describedby`, focus trap, ESC, `aria-busy`,
// `aria-live` para status. Consumidor pasa `initialItems` y `currencyCode` desde la recomendación.
//
// PB-P2-033: la tabla de preview pasa a las primitivas `Table` del design system y los controles
// a `Checkbox` / `Input` / `Button`. Corrige además la CTA primaria, que era `bg-blue-600` — azul
// está explícitamente prohibido como acción primaria (FC-01 / UI-DEC-003: la marca es violeta).
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/design-system';
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
        (r) =>
          r.editedAmount !== r.estimatedAmount ||
          (r.editedLabel !== '' && r.editedLabel !== (r.categoryName ?? '')),
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
          <p
            id="apply-ai-budget-dialog-desc"
            className="mt-1 font-body text-body-sm text-secondary"
          >
            {t('description')}
          </p>
        </header>

        <div
          role="region"
          aria-label={t('itemsRegionLabel')}
          className="max-h-[50vh] overflow-y-auto"
        >
          <Table ariaLabel={t('itemsRegionLabel')} density="compact">
            <TableHead>
              <TableRow>
                <TableHeaderCell density="compact" className="w-8">
                  {t('col.include')}
                </TableHeaderCell>
                <TableHeaderCell density="compact">{t('col.category')}</TableHeaderCell>
                <TableHeaderCell density="compact">{t('col.label')}</TableHeaderCell>
                <TableHeaderCell density="compact" align="end">
                  {t('col.amount')}
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => {
                const inputId = `apply-ai-budget-row-${idx}`;
                const catName =
                  r.categoryName ??
                  (translateCategory ? translateCategory(r.category) : r.category);
                return (
                  <TableRow key={r.category}>
                    <TableCell density="compact">
                      {/* El nombre accesible lo aporta el label sólo-lector: la columna ya
                          identifica visualmente el control. */}
                      <Checkbox
                        label={
                          <span className="sr-only">{t('toggleAria', { category: catName })}</span>
                        }
                        checked={r.included}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, included: e.target.checked } : row,
                            ),
                          )
                        }
                        disabled={submitting}
                      />
                    </TableCell>
                    <TableCell density="compact">
                      <label htmlFor={`${inputId}-label`} className="font-medium">
                        {catName}
                      </label>
                    </TableCell>
                    <TableCell density="compact">
                      <Input
                        id={`${inputId}-label`}
                        type="text"
                        inputSize="sm"
                        placeholder={catName}
                        value={r.editedLabel}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, editedLabel: e.target.value } : row,
                            ),
                          )
                        }
                        disabled={submitting || !r.included}
                      />
                    </TableCell>
                    <TableCell density="compact" align="end">
                      <Input
                        id={`${inputId}-amount`}
                        type="text"
                        inputMode="decimal"
                        inputSize="sm"
                        aria-label={t('amountAria', { category: catName })}
                        fullWidth={false}
                        className="w-28 text-right tabular-nums"
                        value={r.editedAmount}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, editedAmount: e.target.value } : row,
                            ),
                          )
                        }
                        disabled={submitting || !r.included}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <tfoot>
              <tr className="border-t border-subtle font-semibold">
                <td colSpan={3} className="px-3 py-2 text-right">
                  {t('total')}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <Money amount={total} currency={currencyCode} />
                </td>
              </tr>
            </tfoot>
          </Table>
        </div>

        {errorMessage ? <Alert variant="error" live className="mt-3" title={errorMessage} /> : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelBtnRef} variant="secondary" onClick={onCancel} disabled={submitting}>
            {t('cta.cancel')}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!anyIncluded || submitting}
            isLoading={submitting}
            loadingLabel={t('cta.applying')}
          >
            {t('cta.apply')}
          </Button>
        </div>
      </div>
    </div>
  );
}
