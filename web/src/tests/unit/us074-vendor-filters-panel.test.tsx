// US-074 (PB-P1-041 / QA-004) — Unit tests DOM del `VendorFiltersPanel`.
//
// Verifica:
//   - Fieldset accesible con legend + checkboxes para status multi-select.
//   - Select de visibilidad (is_hidden: any/only-hidden/only-visible).
//   - Input business_name con debounce 300 ms (commit onChange asíncrono; no en tiempo real).
//   - Cross-field error en fechas (from > to) muestra `role="alert"` + `aria-invalid`.
//   - Botón "Aplicar" commitea los filtros de forma síncrona.
//   - Botón "Limpiar filtros" resetea el draft y el commit externo.
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import esLatamAdmin from '@/messages/es-LATAM/admin.json';
import { VendorFiltersPanel } from '@/features/admin/vendors/components/VendorFiltersPanel';

const messages = { admin: esLatamAdmin };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  cleanup();
  vi.useFakeTimers();
});

describe('US-074 · VendorFiltersPanel', () => {
  it('renderiza checkboxes de status accesibles bajo <fieldset><legend>', () => {
    const onChange = vi.fn();
    render(withIntl(<VendorFiltersPanel value={{}} onChange={onChange} />));
    const group = screen.getByRole('group', { name: /Estado del proveedor/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Pendiente/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Aprobado/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Rechazado/i })).toBeInTheDocument();
  });

  it('cross-field: from > to muestra alert + aria-invalid', () => {
    const onChange = vi.fn();
    render(withIntl(<VendorFiltersPanel value={{}} onChange={onChange} />));
    const from = screen.getByLabelText(/Alta desde/) as HTMLInputElement;
    const to = screen.getByLabelText(/Alta hasta/) as HTMLInputElement;
    fireEvent.change(from, { target: { value: '2026-08-01' } });
    fireEvent.change(to, { target: { value: '2026-07-01' } });
    expect(screen.getByRole('alert').textContent).toMatch(/menor o igual/i);
    expect(from.getAttribute('aria-invalid')).toBe('true');
    expect(to.getAttribute('aria-invalid')).toBe('true');
  });

  it('submit "Aplicar" commitea filtros seleccionados', () => {
    const onChange = vi.fn();
    render(withIntl(<VendorFiltersPanel value={{}} onChange={onChange} />));
    fireEvent.click(screen.getByRole('checkbox', { name: /Pendiente/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: ['pending'] }));
  });

  it('"Limpiar filtros" resetea el draft y comitea {}', () => {
    const onChange = vi.fn();
    render(
      withIntl(
        <VendorFiltersPanel value={{ status: ['approved'], businessName: 'x' }} onChange={onChange} />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /Limpiar filtros/i }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('business_name debounce 300ms: commit asíncrono tras dejar de tipear', () => {
    const onChange = vi.fn();
    render(withIntl(<VendorFiltersPanel value={{}} onChange={onChange} />));
    const input = screen.getByLabelText(/Nombre comercial/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'cate' } });
    // Antes del timeout no commitea.
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ businessName: 'cate' }));
  });

  it('is_hidden select mapea correctamente al filtro boolean', () => {
    const onChange = vi.fn();
    render(withIntl(<VendorFiltersPanel value={{}} onChange={onChange} />));
    const select = screen.getByLabelText(/Visibilidad/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ isHidden: true }));
  });
});
