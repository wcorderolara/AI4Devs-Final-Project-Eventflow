// US-035 (PB-P1-020 / FE-003) — Tabla de items de presupuesto. Sin FE de mutación aquí;
// las acciones (crear/editar/eliminar) las inyecta US-036 vía slots opcionales.
import { useTranslations } from 'next-intl';
import type { BudgetItemDto } from '../api/budgetApi';

interface BudgetItemsTableProps {
  items: BudgetItemDto[];
  currencyCode: string;
  locale: string;
  onEdit?: (item: BudgetItemDto) => void;
  onDelete?: (item: BudgetItemDto) => void;
  readOnly?: boolean;
}

function fmt(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function BudgetItemsTable({
  items,
  currencyCode,
  locale,
  onEdit,
  onDelete,
  readOnly = false,
}: BudgetItemsTableProps): React.JSX.Element {
  const t = useTranslations('budget.table');
  const showActions = !readOnly && (onEdit || onDelete);
  return (
    <table className="w-full text-sm" aria-label={t('caption')}>
      <caption className="sr-only">{t('caption')}</caption>
      <thead>
        <tr className="border-b text-left text-neutral-500">
          <th scope="col" className="py-2">{t('col.label')}</th>
          <th scope="col" className="py-2">{t('col.category')}</th>
          <th scope="col" className="py-2 text-right">{t('col.planned')}</th>
          <th scope="col" className="py-2 text-right">{t('col.committed')}</th>
          {showActions ? <th scope="col" className="py-2 text-right">{t('col.actions')}</th> : null}
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.id} className="border-b" data-testid={`budget-item-${it.id}`}>
            <td className="py-2">{it.label}</td>
            <td className="py-2 text-neutral-700">{it.category_code ?? '—'}</td>
            <td className="py-2 text-right">{fmt(it.amount_planned, currencyCode, locale)}</td>
            <td className="py-2 text-right">{fmt(it.amount_committed, currencyCode, locale)}</td>
            {showActions ? (
              <td className="py-2 text-right">
                <div className="flex justify-end gap-2">
                  {onEdit ? (
                    <button
                      type="button"
                      onClick={() => onEdit(it)}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      aria-label={t('editAria', { label: it.label })}
                    >
                      {t('edit')}
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(it)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                      aria-label={t('deleteAria', { label: it.label })}
                    >
                      {t('delete')}
                    </button>
                  ) : null}
                </div>
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
