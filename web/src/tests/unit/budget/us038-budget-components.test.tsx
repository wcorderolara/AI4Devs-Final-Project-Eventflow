// US-038 (PB-P1-022 / QA-001 UT-09/UT-10 + QA-004 A11Y-01..03) — Tests unit + A11Y de la
// extensión de `BudgetSummary`, `BudgetItemsTable` y `OvercommitWarning` para el warning
// con delta + badges + CTA.
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { BudgetSummary } from '@/features/budget/view/components/BudgetSummary';
import { BudgetItemsTable } from '@/features/budget/view/components/BudgetItemsTable';
import { OvercommitWarning } from '@/features/budget/view/components/OvercommitWarning';

import en from '@/messages/en/budget.json';

expect.extend(toHaveNoViolations);

function wrap(node: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={{ budget: en }}>
      {node}
    </NextIntlClientProvider>
  );
}

describe('US-038 QA-001 UT-10 — <BudgetSummary> renderiza delta cuando over_committed', () => {
  it('renderiza delta_label localizado con Intl.NumberFormat', () => {
    render(
      wrap(
        <BudgetSummary
          summary={{
            currency_code: 'USD',
            total_planned: 1000,
            total_committed: 1250,
            over_committed: true,
            overcommitted_amount: 250,
          }}
          locale="en"
        />,
      ),
    );
    const delta = screen.getByTestId('budget-summary-overcommit-delta');
    expect(delta.textContent).toMatch(/Exceeded by/);
    expect(delta.textContent).toMatch(/\$250/);
  });

  it('NO renderiza delta cuando over_committed=false', () => {
    render(
      wrap(
        <BudgetSummary
          summary={{
            currency_code: 'USD',
            total_planned: 1000,
            total_committed: 500,
            over_committed: false,
            overcommitted_amount: 0,
          }}
          locale="en"
        />,
      ),
    );
    expect(screen.queryByTestId('budget-summary-overcommit-delta')).toBeNull();
  });
});

const items = [
  {
    id: 'i1',
    label: 'Venue',
    category_code: 'venue',
    amount_planned: 500,
    amount_committed: 800,
    over_committed: true,
    overcommitted_amount: 300,
  },
  {
    id: 'i2',
    label: 'Catering',
    category_code: 'catering',
    amount_planned: 400,
    amount_committed: 200,
    over_committed: false,
    overcommitted_amount: 0,
  },
];

describe('US-038 QA-001 UT-09 + A11Y-01 — <BudgetItemsTable> badge accesible', () => {
  it('renderiza badge con role=img + aria-label localizado interpolando el delta', () => {
    render(wrap(<BudgetItemsTable items={items} currencyCode="USD" locale="en" />));
    const badge = screen.getByTestId('budget-item-badge-i1');
    expect(badge.getAttribute('role')).toBe('img');
    expect(badge.getAttribute('aria-label')).toMatch(/over-committed by \$300/i);
    // Fila anclada para focus programático.
    const row = badge.closest('tr')!;
    expect(row.getAttribute('data-overcommit')).toBe('true');
    expect(row.id).toBe('item-row-i1');
  });

  it('NO renderiza badge en items no overcommit', () => {
    render(wrap(<BudgetItemsTable items={items} currencyCode="USD" locale="en" />));
    expect(screen.queryByTestId('budget-item-badge-i2')).toBeNull();
  });

  it('A11Y-01 tabla con badges: sin violaciones (jest-axe)', async () => {
    const { container } = render(
      wrap(<BudgetItemsTable items={items} currencyCode="USD" locale="en" />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-038 QA-004 A11Y-02/A11Y-03 — <OvercommitWarning> extendido', () => {
  const summary = {
    currency_code: 'USD',
    total_planned: 1000,
    total_committed: 1250,
    over_committed: true,
    overcommitted_amount: 250,
  };

  it('renderiza delta + CTA "Edit items" con eventId presente', () => {
    render(
      wrap(<OvercommitWarning visible summary={summary} eventId="ev-1" locale="en" />),
    );
    expect(screen.getByTestId('overcommit-warning-delta').textContent).toMatch(/Exceeded by/);
    const cta = screen.getByTestId('overcommit-warning-cta');
    expect(cta.textContent).toMatch(/Edit items/);
  });

  it('CTA click invoca focusFirstOvercommitItem del hook (fallback a tabla)', () => {
    document.body.innerHTML = `
      <table data-budget-items-table>
        <tbody>
          <tr id="item-row-i1" data-overcommit="true" tabindex="-1"><td>Venue</td></tr>
        </tbody>
      </table>
      <div id="host"></div>
    `;
    const scrollSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollSpy;
    render(
      wrap(<OvercommitWarning visible summary={summary} eventId="ev-1" locale="en" />),
      { container: document.getElementById('host')! },
    );
    fireEvent.click(screen.getByTestId('overcommit-warning-cta'));
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('sin eventId: no muestra CTA (compat retro con llamados sin eventId)', () => {
    render(wrap(<OvercommitWarning visible summary={summary} locale="en" />));
    expect(screen.queryByTestId('overcommit-warning-cta')).toBeNull();
  });

  it('A11Y-02/03 sin violaciones (badge/CTA/delta)', async () => {
    const { container } = render(
      wrap(<OvercommitWarning visible summary={summary} eventId="ev-1" locale="en" />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
