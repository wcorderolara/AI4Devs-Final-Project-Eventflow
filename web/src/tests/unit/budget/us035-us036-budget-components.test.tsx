// US-035 QA-004 + US-036 QA-004 — Tests unit + A11Y para componentes del presupuesto.
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { BudgetSummary } from '@/features/budget/view/components/BudgetSummary';
import { OvercommitWarning } from '@/features/budget/view/components/OvercommitWarning';
import { BudgetItemsTable } from '@/features/budget/view/components/BudgetItemsTable';
import { EmptyBudgetState } from '@/features/budget/view/components/EmptyBudgetState';
import { AddBudgetItemModal } from '@/features/budget/mutate/components/AddBudgetItemModal';
import { DeleteBudgetItemDialog } from '@/features/budget/mutate/components/DeleteBudgetItemDialog';

import en from '@/messages/en/budget.json';

expect.extend(toHaveNoViolations);

function wrap(node: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={{ budget: en }}>
      {node}
    </NextIntlClientProvider>
  );
}

const items = [
  { id: 'i1', label: 'Venue rental', category_code: 'venue', amount_planned: 5000, amount_committed: 2000 },
  { id: 'i2', label: 'Catering', category_code: 'catering', amount_planned: 3000, amount_committed: 1000 },
];

describe('US-035 — <BudgetSummary>', () => {
  it('renders planned/committed/remaining/currency', () => {
    render(
      wrap(
        <BudgetSummary
          summary={{ currency_code: 'USD', total_planned: 8000, total_committed: 3000, over_committed: false }}
          locale="en"
        />,
      ),
    );
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText(/\$8,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$3,000/)).toBeInTheDocument();
  });

  it('A11Y: sin violaciones', async () => {
    const { container } = render(
      wrap(
        <BudgetSummary
          summary={{ currency_code: 'USD', total_planned: 100, total_committed: 50, over_committed: false }}
          locale="en"
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-035 — <OvercommitWarning>', () => {
  it('renderiza cuando visible=true; nada cuando visible=false', () => {
    const { rerender, container } = render(wrap(<OvercommitWarning visible={false} />));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    rerender(wrap(<OvercommitWarning visible={true} />));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('A11Y: sin violaciones', async () => {
    const { container } = render(wrap(<OvercommitWarning visible={true} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-035 — <BudgetItemsTable>', () => {
  it('renderiza items y llama onDelete al click', () => {
    const onDelete = vi.fn();
    render(wrap(<BudgetItemsTable items={items} currencyCode="USD" locale="en" onDelete={onDelete} />));
    expect(screen.getByText('Venue rental')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /delete venue rental/i }));
    expect(onDelete).toHaveBeenCalledWith(items[0]);
  });

  it('readOnly oculta las acciones', () => {
    render(wrap(<BudgetItemsTable items={items} currencyCode="USD" locale="en" readOnly />));
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  it('A11Y: sin violaciones', async () => {
    const { container } = render(wrap(<BudgetItemsTable items={items} currencyCode="USD" locale="en" onDelete={vi.fn()} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-035 — <EmptyBudgetState>', () => {
  it('renderiza CTAs con deeplinks correctos', () => {
    render(wrap(<EmptyBudgetState eventId="ev-42" />));
    expect(screen.getByRole('link', { name: /suggest with ai/i })).toHaveAttribute(
      'href',
      '/organizer/events/ev-42/ai/budget',
    );
    expect(screen.getByRole('link', { name: /add manually/i })).toHaveAttribute(
      'href',
      '/organizer/events/ev-42/budget?add=1',
    );
  });

  it('A11Y: sin violaciones', async () => {
    const { container } = render(wrap(<EmptyBudgetState eventId="ev-1" />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-036 — <AddBudgetItemModal>', () => {
  it('valida label vacío y monto inválido', () => {
    const onSubmit = vi.fn();
    const { container } = render(wrap(<AddBudgetItemModal open onSubmit={onSubmit} onCancel={vi.fn()} />));
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/label is required/i)).toBeInTheDocument();
  });

  it('envía valores válidos', () => {
    const onSubmit = vi.fn();
    const { container } = render(wrap(<AddBudgetItemModal open onSubmit={onSubmit} onCancel={vi.fn()} />));
    fireEvent.change(screen.getByLabelText(/^label$/i), { target: { value: 'Photo' } });
    fireEvent.change(screen.getByLabelText(/category code/i), { target: { value: 'photography' } });
    fireEvent.change(screen.getByLabelText(/planned amount/i), { target: { value: '1500.50' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSubmit).toHaveBeenCalledWith({
      label: 'Photo',
      category_code: 'photography',
      amount_planned: 1500.5,
    });
  });

  it('A11Y: sin violaciones', async () => {
    const { container } = render(wrap(<AddBudgetItemModal open onSubmit={vi.fn()} onCancel={vi.fn()} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-036 — <DeleteBudgetItemDialog>', () => {
  it('confirma con el label del item', () => {
    const onConfirm = vi.fn();
    render(
      wrap(
        <DeleteBudgetItemDialog
          open
          item={items[0]!}
          onCancel={vi.fn()}
          onConfirm={onConfirm}
        />,
      ),
    );
    expect(screen.getByText(/Venue rental/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cierra con ESC', () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <DeleteBudgetItemDialog open item={items[0]!} onCancel={onCancel} onConfirm={vi.fn()} />,
      ),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('A11Y: sin violaciones', async () => {
    const { container } = render(
      wrap(
        <DeleteBudgetItemDialog open item={items[0]!} onCancel={vi.fn()} onConfirm={vi.fn()} />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
