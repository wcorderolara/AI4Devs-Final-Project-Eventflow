// US-037 (PB-P1-021 / QA-001 UT-11..13-FE + QA-004 A11Y-01..03) — Tests unitarios y de
// accesibilidad de los 3 dialogs de apply presupuesto IA.
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import {
  ApplyAIBudgetDialog,
  ReplaceConfirmationDialog,
  CategoryInactiveErrorDialog,
} from '@/features/ai/hitl';

import en from '@/messages/en/ai.json';
import esLatam from '@/messages/es-LATAM/ai.json';
import esES from '@/messages/es-ES/ai.json';
import pt from '@/messages/pt/ai.json';

expect.extend(toHaveNoViolations);

const CATALOGS = {
  en: { ai: en },
  'es-LATAM': { ai: esLatam },
  'es-ES': { ai: esES },
  pt: { ai: pt },
};

function wrap(node: React.ReactNode, locale: keyof typeof CATALOGS = 'en'): React.ReactElement {
  return (
    <NextIntlClientProvider locale={locale} messages={CATALOGS[locale]}>
      {node}
    </NextIntlClientProvider>
  );
}

const items = [
  { category: 'venue', categoryName: 'Venue', estimatedAmount: '5000.00' },
  { category: 'catering', categoryName: 'Catering', estimatedAmount: '3000.00' },
];

// ── ApplyAIBudgetDialog (UT-12-FE) ──────────────────────────────────────────
describe('US-037 UT-12-FE — <ApplyAIBudgetDialog>', () => {
  it('deshabilita "Aplicar" cuando 0 filas incluidas', () => {
    const onSubmit = vi.fn();
    render(
      wrap(
        <ApplyAIBudgetDialog
          open
          currencyCode="GTQ"
          initialItems={items}
          onCancel={vi.fn()}
          onSubmit={onSubmit}
        />,
      ),
    );
    // Desmarcar ambas filas.
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[1]!);
    const applyBtn = screen.getByRole('button', { name: /apply/i });
    expect(applyBtn).toBeDisabled();
  });

  it('envía editedPayload con solo el subset incluido y flag edited=true', () => {
    const onSubmit = vi.fn();
    render(
      wrap(
        <ApplyAIBudgetDialog
          open
          currencyCode="GTQ"
          initialItems={items}
          onCancel={vi.fn()}
          onSubmit={onSubmit}
        />,
      ),
    );
    // Desmarcar la segunda fila (catering) → subset de 1 (edited = true).
    fireEvent.click(screen.getAllByRole('checkbox')[1]!);
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0]![0];
    expect(call.edited).toBe(true);
    expect(call.editedPayload.items).toHaveLength(1);
    expect(call.editedPayload.items[0].category).toBe('venue');
  });

  it('A11Y-01: sin violaciones axe (role=dialog, aria-modal, labelledby, describedby)', async () => {
    const { container } = render(
      wrap(
        <ApplyAIBudgetDialog
          open
          currencyCode="GTQ"
          initialItems={items}
          onCancel={vi.fn()}
          onSubmit={vi.fn()}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('cierra con ESC (onCancel)', () => {
    const onCancel = vi.fn();
    render(
      wrap(
        <ApplyAIBudgetDialog
          open
          currencyCode="GTQ"
          initialItems={items}
          onCancel={onCancel}
          onSubmit={vi.fn()}
        />,
      ),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});

// ── ReplaceConfirmationDialog (UT-12-FE alt / A11Y-02) ─────────────────────
describe('US-037 A11Y-02 — <ReplaceConfirmationDialog>', () => {
  it('renderiza el conteo y las categorías afectadas', () => {
    render(
      wrap(
        <ReplaceConfirmationDialog
          open
          replaceCount={3}
          affectedCategories={['venue', 'catering']}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      ),
    );
    const desc = screen.getByRole('alertdialog').querySelector('#replace-confirm-desc');
    expect(desc?.textContent).toMatch(/3/);
    expect(desc?.textContent).toMatch(/venue/);
  });

  it('confirma al pulsar el botón principal', () => {
    const onConfirm = vi.fn();
    render(
      wrap(
        <ReplaceConfirmationDialog
          open
          replaceCount={2}
          onCancel={vi.fn()}
          onConfirm={onConfirm}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /replace and apply/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('sin violaciones axe', async () => {
    const { container } = render(
      wrap(
        <ReplaceConfirmationDialog
          open
          replaceCount={2}
          affectedCategories={['venue']}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── CategoryInactiveErrorDialog (UT-13-FE + A11Y-03) ───────────────────────
describe('US-037 UT-13-FE + A11Y-03 — <CategoryInactiveErrorDialog>', () => {
  it('renderiza la lista de inactive_categories', () => {
    render(
      wrap(
        <CategoryInactiveErrorDialog
          open
          eventId="ev-1"
          inactiveCategories={[
            { code: 'venue', name: 'Venue' },
            { code: 'catering', name: 'Catering' },
          ]}
          onClose={vi.fn()}
        />,
      ),
    );
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('Catering')).toBeInTheDocument();
  });

  it('CTAs deeplink a US-019 (regenerar) y US-036 (manual)', () => {
    render(
      wrap(
        <CategoryInactiveErrorDialog
          open
          eventId="ev-42"
          inactiveCategories={[{ code: 'venue', name: 'Venue' }]}
          onClose={vi.fn()}
        />,
      ),
    );
    const regenerate = screen.getByRole('link', { name: /regenerate suggestion/i });
    const manual = screen.getByRole('link', { name: /apply manually/i });
    expect(regenerate).toHaveAttribute('href', '/organizer/events/ev-42/ai/budget');
    expect(manual).toHaveAttribute('href', '/organizer/events/ev-42/budget');
  });

  it('sin violaciones axe', async () => {
    const { container } = render(
      wrap(
        <CategoryInactiveErrorDialog
          open
          eventId="ev-1"
          inactiveCategories={[{ code: 'venue', name: 'Venue' }]}
          onClose={vi.fn()}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
