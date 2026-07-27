// US-035 (PB-P1-020 / FE-003) + US-038 (PB-P1-022 / FE-003) — Tabla de items de presupuesto.
// US-038 AC-03/AC-07: renderiza badge accesible cuando `item.over_committed = true`, con
// `aria-label` localizado interpolando el delta y la moneda. Añade `data-overcommit="true"`
// e `id="item-row-<id>"` a las filas para que `useOvercommitFocus` pueda anclar el CTA.
// US-064 (PB-P1-037 / FE-002) — EC-02: badge accesible "Auto-creado" cuando `item.auto_created`.
//
// PB-P2-031: compone las primitivas `Table` / `ResponsiveTable` / `CurrencyDisplay` /
// `StatusBadge` / `Button` del design system.
//   * Desktop conserva la tabla semántica (`th scope="col"`, `caption`, montos a la derecha con
//     numeración tabular).
//   * Móvil pivota a cards de resumen — el patrón que muestra la pantalla Stitch— alimentadas
//     por **la misma lista `items`**: no hay segunda consulta ni un segundo modelo de fila.
//   * Las dos vistas son mutuamente excluyentes por CSS, así que sólo un juego de acciones
//     («Editar» / «Eliminar») es alcanzable por teclado en cada viewport.
import { useTranslations } from 'next-intl';
import {
  Button,
  Card,
  CurrencyDisplay,
  ResponsiveSummaryRow,
  ResponsiveTable,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/design-system';
import { formatCurrency } from '@/shared/i18n';
import type { BudgetItemDto } from '../api/budgetApi';

interface BudgetItemsTableProps {
  items: BudgetItemDto[];
  currencyCode: string;
  locale: string;
  onEdit?: (item: BudgetItemDto) => void;
  onDelete?: (item: BudgetItemDto) => void;
  readOnly?: boolean;
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
  const showActions = !readOnly && Boolean(onEdit || onDelete);

  const overcommitAria = (item: BudgetItemDto): string =>
    tOver('item_aria_label', {
      amount: formatCurrency(item.overcommitted_amount, currencyCode, locale),
    });

  /** Marcas de estado del ítem, compartidas por la fila de escritorio y la card móvil. */
  const badges = (item: BudgetItemDto, scope: 'row' | 'summary'): React.JSX.Element | null => {
    if (!item.over_committed && !item.auto_created) return null;
    const suffix = scope === 'summary' ? 'summary-' : '';
    return (
      <>
        {item.over_committed ? (
          <StatusBadge
            status="error"
            ariaLabel={overcommitAria(item)}
            data-testid={`budget-item-${suffix}badge-${item.id}`}
          >
            {tOver('item_badge')}
          </StatusBadge>
        ) : null}
        {item.auto_created ? (
          <StatusBadge
            status="warning"
            ariaLabel={tSummary('autoCreatedAria')}
            data-testid={`budget-item-${suffix}auto-created-${item.id}`}
          >
            {tSummary('autoCreatedBadge')}
          </StatusBadge>
        ) : null}
      </>
    );
  };

  const actions = (item: BudgetItemDto, fullWidth: boolean): React.JSX.Element => (
    <div className={fullWidth ? 'flex gap-2' : 'flex justify-end gap-2'}>
      {onEdit ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(item)}
          aria-label={t('editAria', { label: item.label })}
        >
          {t('edit')}
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(item)}
          aria-label={t('deleteAria', { label: item.label })}
        >
          {t('delete')}
        </Button>
      ) : null}
    </div>
  );

  return (
    // `useOvercommitFocus` hace scroll a este contenedor cuando no hay ninguna fila excedida.
    <div data-budget-items-table>
      <ResponsiveTable
        items={items}
        getRowKey={(item) => item.id}
        summaryLabel={t('caption')}
        renderSummary={(item) => (
          <Card padding="sm" data-testid={`budget-item-summary-${item.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 font-ui text-body-sm font-semibold text-primary">
                {item.label}
              </span>
              <span className="flex flex-wrap gap-1">{badges(item, 'summary')}</span>
            </div>
            <div className="mt-3 space-y-1">
              <ResponsiveSummaryRow label={t('col.category')}>
                {item.category_code ?? '—'}
              </ResponsiveSummaryRow>
              <ResponsiveSummaryRow label={t('col.planned')}>
                <CurrencyDisplay
                  amount={item.amount_planned}
                  currencyCode={currencyCode}
                  locale={locale}
                />
              </ResponsiveSummaryRow>
              <ResponsiveSummaryRow label={t('col.committed')}>
                <CurrencyDisplay
                  amount={item.amount_committed}
                  currencyCode={currencyCode}
                  locale={locale}
                />
              </ResponsiveSummaryRow>
            </div>
            {showActions ? <div className="mt-3">{actions(item, true)}</div> : null}
          </Card>
        )}
      >
        <Table caption={t('caption')} density="compact">
          <TableHead>
            <TableRow>
              <TableHeaderCell density="compact">{t('col.label')}</TableHeaderCell>
              <TableHeaderCell density="compact">{t('col.category')}</TableHeaderCell>
              <TableHeaderCell density="compact" align="numeric">
                {t('col.planned')}
              </TableHeaderCell>
              <TableHeaderCell density="compact" align="numeric">
                {t('col.committed')}
              </TableHeaderCell>
              {showActions ? (
                <TableHeaderCell density="compact" align="end">
                  {t('col.actions')}
                </TableHeaderCell>
              ) : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                id={`item-row-${item.id}`}
                interactive={showActions}
                data-testid={`budget-item-${item.id}`}
                // US-038 (FE-003): ancla para `useOvercommitFocus`; `tabIndex=-1` habilita el
                // foco programático sin añadir la fila al orden de tabulación.
                {...(item.over_committed
                  ? { 'data-overcommit': 'true' as const, tabIndex: -1 }
                  : {})}
              >
                <TableCell density="compact">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{item.label}</span>
                    {badges(item, 'row')}
                  </div>
                </TableCell>
                <TableCell density="compact">{item.category_code ?? '—'}</TableCell>
                <TableCell density="compact" align="numeric">
                  <CurrencyDisplay
                    amount={item.amount_planned}
                    currencyCode={currencyCode}
                    locale={locale}
                  />
                </TableCell>
                <TableCell density="compact" align="numeric">
                  <CurrencyDisplay
                    amount={item.amount_committed}
                    currencyCode={currencyCode}
                    locale={locale}
                  />
                </TableCell>
                {showActions ? (
                  <TableCell density="compact" align="end">
                    {actions(item, false)}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveTable>
    </div>
  );
}
