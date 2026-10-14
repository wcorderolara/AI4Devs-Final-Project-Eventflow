// PB-P2-028 — Controles de selección del design system (Select, Checkbox).
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §17 y §24.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox, FormField, Select } from '@/shared/design-system';
import type { SelectOption } from '@/shared/design-system';

/**
 * Los estados de evento son datos del feature, NO del componente reutilizable
 * (§17: "No hardcode these options in the reusable component").
 */
const EVENT_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'active', label: 'Activo' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

describe('Select', () => {
  it('usa `<select>` nativo, asocia el label y expone placeholder + opciones', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FormField label="Estado">
        {(field) => (
          <Select
            {...field}
            placeholder="Todos los estados"
            options={EVENT_STATUS_OPTIONS}
            defaultValue=""
            onChange={onChange}
          />
        )}
      </FormField>,
    );

    const select = screen.getByLabelText('Estado');
    expect(select.tagName).toBe('SELECT');
    expect(within(select).getAllByRole('option')).toHaveLength(5);

    await user.selectOptions(select, 'active');
    expect(onChange).toHaveBeenCalled();
    expect((select as HTMLSelectElement).value).toBe('active');
  });

  it('estado disabled y error', () => {
    render(
      <FormField label="Estado" error="Selecciona un estado" disabled>
        {(field) => <Select {...field} options={EVENT_STATUS_OPTIONS} />}
      </FormField>,
    );
    const select = screen.getByLabelText('Estado');
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Checkbox', () => {
  it('marca y desmarca desde el label completo', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Recibir notificaciones" defaultChecked={false} />);
    const checkbox = screen.getByRole('checkbox', { name: /Recibir notificaciones/ });
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByText('Recibir notificaciones'));
    expect(checkbox).toBeChecked();
  });

  it('aplica el estado indeterminado por propiedad del DOM', () => {
    render(<Checkbox label="Todos los estados" indeterminate />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
    // El navegador expone el estado "mixed" desde la propiedad del DOM: no se añade
    // `aria-checked` redundante sobre un control nativo (Component Foundations §37).
    expect(checkbox).toBePartiallyChecked();
  });

  it('asocia descripción y error, y respeta disabled', () => {
    render(
      <Checkbox
        label="Acepto los términos"
        description="Se aplican a todos los eventos."
        error="Debes aceptar los términos"
        disabled
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    const ids = (checkbox.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Debes aceptar los términos');
  });
});
