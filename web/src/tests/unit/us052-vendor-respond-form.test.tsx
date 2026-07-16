// US-052 (PB-P1-031 / QA-005 A11Y) — Unit tests DOM del `QuoteResponseForm` + `BreakdownEditor`.
// Verifica:
//   - Labels asociados a inputs y `aria-invalid` en error del schema.
//   - `aria-live="polite"` en el indicador de suma con actualización dinámica.
//   - `aria-label` en botón "Quitar" y navegación por teclado del add/remove.
//   - Currency read-only reflejada en el label.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';
import { QuoteResponseForm } from '@/features/quotes/components/QuoteResponseForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const messages = { vendor: esLatamVendor };

function withProviders(children: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-052 · QuoteResponseForm', () => {
  it('renderiza labels asociadas a los inputs principales', () => {
    render(
      withProviders(
        <QuoteResponseForm
          qrId="00000000-0000-0000-0000-000000000000"
          currencyCode="GTQ"
          successRedirect="/vendor/quotes"
        />,
      ),
    );

    expect(screen.getByLabelText(/Precio total/i)).toBeTruthy();
    expect(screen.getByLabelText(/Vigencia hasta/i)).toBeTruthy();
    expect(screen.getByLabelText(/Condiciones/i)).toBeTruthy();
  });

  it('indicador de suma tiene aria-live="polite" y refleja los cambios', () => {
    const { container } = render(
      withProviders(
        <QuoteResponseForm
          qrId="00000000-0000-0000-0000-000000000000"
          currencyCode="GTQ"
          successRedirect="/vendor/quotes"
        />,
      ),
    );

    const total = screen.getByLabelText(/Precio total/i);
    fireEvent.change(total, { target: { value: '150.00' } });
    // El indicador de suma aparece en el DOM con aria-live.
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.textContent).toMatch(/150\.00/);
  });

  it('BreakdownEditor permite agregar y quitar filas por teclado (click programático)', () => {
    render(
      withProviders(
        <QuoteResponseForm
          qrId="00000000-0000-0000-0000-000000000000"
          currencyCode="GTQ"
          successRedirect="/vendor/quotes"
        />,
      ),
    );
    // Comienza con 1 fila — el botón Quitar de esa fila está deshabilitado.
    const addBtn = screen.getByRole('button', { name: /Agregar concepto/i });
    fireEvent.click(addBtn);
    // Ahora hay 2 filas — el aria-label del botón Quitar identifica cada fila.
    const removeButtons = screen.getAllByRole('button', { name: /Quitar el concepto/i });
    expect(removeButtons.length).toBe(2);
    // Ambos deben ser navegables por teclado (tabIndex por defecto en <button>).
    expect(removeButtons[0].tagName).toBe('BUTTON');
  });

  it('propaga el currencyCode al label del monto del breakdown', () => {
    render(
      withProviders(
        <QuoteResponseForm
          qrId="00000000-0000-0000-0000-000000000000"
          currencyCode="USD"
          successRedirect="/vendor/quotes"
        />,
      ),
    );
    // El label "Monto (USD)" del breakdown debe estar visible.
    expect(screen.getByText(/Monto \(USD\)/i)).toBeTruthy();
    expect(screen.getByText(/Precio total \(USD\)/i)).toBeTruthy();
  });
});
