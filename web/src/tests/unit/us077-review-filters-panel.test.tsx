// US-077 (PB-P1-040 / QA-004) — Unit tests DOM + A11Y del `ReviewFiltersPanel`.
//
// Cobertura:
//   - Renderiza los checkboxes de status con `<fieldset><legend>` accesible.
//   - Inputs con label asociado (getByLabelText).
//   - Cross-field errors (`rating_min > rating_max`, `from > to`) muestran `role="alert"`
//     y deshabilitan submit.
//   - Apply construye el filtro con valores serializados (ISO fechas, numeric rating).
//   - Reset limpia y notifica al padre con `{}`.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import esLatamAdmin from '@/messages/es-LATAM/admin.json';
import { ReviewFiltersPanel } from '@/features/admin/reviews/components/ReviewFiltersPanel';
import type { AdminReviewListFilters } from '@/features/admin/reviews';

const messages = { admin: esLatamAdmin };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

describe('US-077 · ReviewFiltersPanel', () => {
  beforeEach(cleanup);

  it('form tiene aria-label y fieldset de status accesible', () => {
    render(withIntl(<ReviewFiltersPanel value={{}} onChange={() => {}} />));
    const form = screen.getByRole('form', { name: 'Filtros del panel de reseñas' });
    expect(form).toBeInTheDocument();
    const legend = screen.getByText('Estado de la reseña');
    expect(legend.tagName.toLowerCase()).toBe('legend');
  });

  it('todos los inputs tienen label asociado', () => {
    render(withIntl(<ReviewFiltersPanel value={{}} onChange={() => {}} />));
    expect(screen.getByLabelText('ID del proveedor')).toBeInTheDocument();
    expect(screen.getByLabelText('Creada desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Creada hasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Puntuación mínima')).toBeInTheDocument();
    expect(screen.getByLabelText('Puntuación máxima')).toBeInTheDocument();
    expect(screen.getByLabelText('Con acción de moderación')).toBeInTheDocument();
  });

  it('rating_min > rating_max ⇒ role=alert y submit deshabilitado', () => {
    render(withIntl(<ReviewFiltersPanel value={{}} onChange={() => {}} />));
    fireEvent.change(screen.getByLabelText('Puntuación mínima'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Puntuación máxima'), { target: { value: '1' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La puntuación mínima debe ser menor o igual a la máxima.',
    );
    const submit = screen.getByRole('button', { name: 'Aplicar' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('createdAtFrom > createdAtTo ⇒ role=alert y submit deshabilitado', () => {
    render(withIntl(<ReviewFiltersPanel value={{}} onChange={() => {}} />));
    fireEvent.change(screen.getByLabelText('Creada desde'), { target: { value: '2026-06-15' } });
    fireEvent.change(screen.getByLabelText('Creada hasta'), { target: { value: '2026-06-01' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La fecha inicial debe ser menor o igual a la final.',
    );
    const submit = screen.getByRole('button', { name: 'Aplicar' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('apply serializa correctamente y notifica al padre', () => {
    const onChange = vi.fn<(next: AdminReviewListFilters) => void>();
    render(withIntl(<ReviewFiltersPanel value={{}} onChange={onChange} />));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Oculta' }));
    fireEvent.change(screen.getByLabelText('ID del proveedor'), {
      target: { value: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    });
    fireEvent.change(screen.getByLabelText('Puntuación mínima'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Puntuación máxima'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Con acción de moderación'), {
      target: { value: 'true' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const filters = onChange.mock.calls[0]![0];
    expect(filters.status).toEqual(['hidden']);
    expect(filters.vendorId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(filters.ratingMin).toBe(3);
    expect(filters.ratingMax).toBe(5);
    expect(filters.hasAdminAction).toBe(true);
  });

  it('reset limpia y notifica {} al padre', () => {
    const onChange = vi.fn<(next: AdminReviewListFilters) => void>();
    render(
      withIntl(
        <ReviewFiltersPanel value={{ status: ['hidden'], ratingMin: 3 }} onChange={onChange} />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('multi-status all ⇒ omite `status` para evitar noise al backend (todos los estados = sin filtro)', () => {
    const onChange = vi.fn<(next: AdminReviewListFilters) => void>();
    render(withIntl(<ReviewFiltersPanel value={{}} onChange={onChange} />));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Publicada' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Oculta' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Eliminada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    const filters = onChange.mock.calls[0]![0];
    expect(filters.status).toBeUndefined();
  });
});
