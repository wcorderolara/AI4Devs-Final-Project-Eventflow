// US-064 (PB-P1-037 / QA-003 + QA-004) — Unit tests DOM + A11Y del `BudgetSummary` refactorizado.
//
// Verifica:
//   - AC-04 aria-live: al re-renderizar con distinto `total_committed`, la región `aria-live`
//     anuncia "Presupuesto actualizado: {currency} {committed} comprometido de {planned}
//     planificado." — pero NO en el mount inicial (evita ruido de screen reader).
//   - AC-05 refresh: cuando se provee `onRefresh`, la CTA "Actualizar presupuesto" se renderiza
//     con `aria-label` accesible; disparar el click invoca el callback. `isRefreshing` deshabilita
//     el botón y cambia su copy.
//   - jest-axe: 0 violaciones sin refresh, con refresh, con exceso.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import esLatamBudget from '@/messages/es-LATAM/budget.json';
import { BudgetSummary } from '@/features/budget/view/components/BudgetSummary';
import type { BudgetSummaryDto } from '@/features/budget/view/api/budgetApi';

expect.extend(toHaveNoViolations);

const messages = { budget: esLatamBudget };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

function summary(overrides: Partial<BudgetSummaryDto> = {}): BudgetSummaryDto {
  return {
    currency_code: 'GTQ',
    total_planned: 10000,
    total_committed: 4000,
    over_committed: false,
    overcommitted_amount: 0,
    available: 6000,
    ...overrides,
  };
}

describe('US-064 · BudgetSummary — refresh + aria-live', () => {
  it('AC-05: renderiza CTA "Actualizar presupuesto" cuando se provee `onRefresh`', () => {
    const onRefresh = vi.fn();
    render(withIntl(<BudgetSummary summary={summary()} locale="es-LATAM" onRefresh={onRefresh} />));
    const cta = screen.getByRole('button', { name: 'Actualizar el resumen del presupuesto' });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('AC-05: sin `onRefresh` no renderiza la CTA (retro-compat con US-035 consumers)', () => {
    render(withIntl(<BudgetSummary summary={summary()} locale="es-LATAM" />));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('AC-05: `isRefreshing=true` deshabilita la CTA y cambia el copy', () => {
    render(
      withIntl(
        <BudgetSummary summary={summary()} locale="es-LATAM" onRefresh={() => {}} isRefreshing />,
      ),
    );
    const cta = screen.getByRole('button', { name: 'Actualizar el resumen del presupuesto' });
    expect(cta).toBeDisabled();
    expect(cta.textContent).toContain('Actualizando');
  });

  it('AC-04: mount inicial NO dispara anuncio aria-live (evita ruido de screen reader)', () => {
    render(withIntl(<BudgetSummary summary={summary()} locale="es-LATAM" />));
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveAttribute('aria-atomic', 'true');
    expect(live.textContent).toBe('');
  });

  it('AC-04: cambio de `total_committed` entre renders dispara anuncio comparativo', () => {
    const { rerender } = render(
      withIntl(<BudgetSummary summary={summary({ total_committed: 4000 })} locale="es-LATAM" />),
    );
    // Segundo render con committed distinto ⇒ anuncio.
    rerender(
      withIntl(<BudgetSummary summary={summary({ total_committed: 5500 })} locale="es-LATAM" />),
    );
    const live = screen.getByRole('status');
    expect(live.textContent).toMatch(/Presupuesto actualizado/);
    expect(live.textContent).toMatch(/GTQ/);
  });

  it('AC-04: re-render con MISMO `total_committed` NO dispara anuncio', () => {
    const { rerender } = render(
      withIntl(<BudgetSummary summary={summary({ total_committed: 4000 })} locale="es-LATAM" />),
    );
    rerender(
      withIntl(<BudgetSummary summary={summary({ total_committed: 4000 })} locale="es-LATAM" />),
    );
    const live = screen.getByRole('status');
    expect(live.textContent).toBe('');
  });

  it('AC-03: renderiza el delta cuando `over_committed = true`', () => {
    render(
      withIntl(
        <BudgetSummary
          summary={summary({
            total_committed: 12000,
            over_committed: true,
            overcommitted_amount: 2000,
            available: -2000,
          })}
          locale="es-LATAM"
        />,
      ),
    );
    expect(screen.getByTestId('budget-summary-overcommit-delta').textContent).toMatch(/Excede/);
  });

  it('jest-axe: 0 violaciones (estado normal)', async () => {
    const { container } = render(withIntl(<BudgetSummary summary={summary()} locale="es-LATAM" />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('jest-axe: 0 violaciones (con refresh CTA + exceso)', async () => {
    const { container } = render(
      withIntl(
        <BudgetSummary
          summary={summary({
            total_committed: 12000,
            over_committed: true,
            overcommitted_amount: 2000,
          })}
          locale="es-LATAM"
          onRefresh={() => {}}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
