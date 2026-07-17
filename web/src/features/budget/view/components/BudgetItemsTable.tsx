// US-035 (PB-P1-020 / FE-003) + US-038 (PB-P1-022 / FE-003) — Tabla de items de presupuesto.
// US-038 AC-03/AC-07: renderiza badge accesible cuando `item.over_committed = true`, con
// `aria-label` localizado interpolando el delta y la moneda. Añade `data-overcommit="true"`
// e `id="item-row-<id>"` a las filas para que `useOvercommitFocus` pueda anclar el CTA.
// US-064 (PB-P1-037 / FE-002) — EC-02: badge accesible "Auto-creado" cuando `item.auto_created`.
// Indica ítems creados automáticamente por el `UpdateCommittedFromBookingIntentUseCase`
// (US-039 apply) al confirmar un `BookingIntent` sin `BudgetItem` previo — el organizer los
// reconoce sin ambigüedad.
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
  const tOver = useTranslations('budget.overcommit');
  const tSummary = useTranslations('budget.summary');
  const showActions = !readOnly && (onEdit || onDelete);
  return (
    <table
      className="w-full text-sm"
      aria-label={t('caption')}
      data-budget-items-table
    >
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
        {items.map((it) => {
          const badgeAriaLabel = it.over_committed
            ? tOver('item_aria_label', {
                amount: fmt(it.overcommitted_amount, currencyCode, locale),
              })
            : undefined;
          return (
            <tr
              key={it.id}
              id={`item-row-${it.id}`}
              className="border-b"
              data-testid={`budget-item-${it.id}`}
              // US-038 (FE-003): anchor para `useOvercommitFocus`; `tabIndex=-1` habilita focus
              // programático sin agregar la fila al tab order.
              {...(it.over_committed
                ? { 'data-overcommit': 'true' as const, tabIndex: -1 }
                : {})}
            >
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <span>{it.label}</span>
                  {it.over_committed ? (
                    <span
                      role="img"
                      aria-label={badgeAriaLabel}
                      data-testid={`budget-item-badge-${it.id}`}
                      className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                    >
                      {tOver('item_badge')}
                    </span>
                  ) : null}
                  {it.auto_created ? (
                    <span
                      role="img"
                      aria-label={tSummary('autoCreatedAria')}
                      data-testid={`budget-item-auto-created-${it.id}`}
                      className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
                    >
                      {tSummary('autoCreatedBadge')}
                    </span>
                  ) : null}
                </div>
              </td>
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
          );
        })}
      </tbody>
    </table>
  );
}
