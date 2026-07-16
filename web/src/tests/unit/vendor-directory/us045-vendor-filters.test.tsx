// US-045 QA-005 — A11Y + component contract del `VendorFilters`.
// Verifica: labels semánticos sobre cada input, submit funcional, botón "Limpiar" invoca
// `onReset`, y ausencia de violaciones axe.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { VendorFilters, type VendorFiltersValue } from '@/features/vendor-directory/components/VendorFilters';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';

expect.extend(toHaveNoViolations);

const initial: VendorFiltersValue = {
  categoryCode: '',
  locationCode: '',
  priceMin: '',
  priceMax: '',
  currency: '',
};

function wrap(node: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={{ vendor: esLatamVendor }}>
      {node}
    </NextIntlClientProvider>
  );
}

describe('US-045 QA-005 — VendorFilters', () => {
  it('cada campo tiene label semántico asociado', () => {
    render(
      wrap(
        <VendorFilters value={initial} onChange={() => {}} onSubmit={() => {}} onReset={() => {}} />,
      ),
    );
    expect(screen.getByLabelText(/categoría/i)).toBeDefined();
    expect(screen.getByLabelText(/ciudad/i)).toBeDefined();
    expect(screen.getByLabelText(/precio mínimo/i)).toBeDefined();
    expect(screen.getByLabelText(/precio máximo/i)).toBeDefined();
    expect(screen.getByLabelText(/moneda/i)).toBeDefined();
  });

  it('submit invoca onSubmit', async () => {
    const onSubmit = vi.fn();
    render(
      wrap(
        <VendorFilters value={initial} onChange={() => {}} onSubmit={onSubmit} onReset={() => {}} />,
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: /aplicar/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('reset invoca onReset', async () => {
    const onReset = vi.fn();
    render(
      wrap(
        <VendorFilters value={initial} onChange={() => {}} onSubmit={() => {}} onReset={onReset} />,
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: /limpiar/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('typing propaga onChange', async () => {
    const onChange = vi.fn();
    render(
      wrap(
        <VendorFilters value={initial} onChange={onChange} onSubmit={() => {}} onReset={() => {}} />,
      ),
    );
    await userEvent.type(screen.getByLabelText(/categoría/i), 'c');
    expect(onChange).toHaveBeenCalled();
  });

  it('A11Y: sin violaciones axe', async () => {
    const { container } = render(
      wrap(
        <VendorFilters value={initial} onChange={() => {}} onSubmit={() => {}} onReset={() => {}} />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
