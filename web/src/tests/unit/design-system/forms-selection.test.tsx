// PB-P2-028 — Controles de selección del design system (Select, MultiSelect, Checkbox, RadioGroup).
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §17 y §24.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox, FormField, MultiSelect, RadioGroup, Select } from '@/shared/design-system';
import type { MultiSelectOption } from '@/shared/design-system';

/**
 * Ejemplo de uso del MultiSelect: los estados de evento son datos del feature, NO del
 * componente reutilizable (§17: "No hardcode these options in the reusable component").
 */
const EVENT_STATUS_OPTIONS: readonly MultiSelectOption[] = [
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

describe('MultiSelect', () => {
  function MultiSelectHarness({
    initial = [],
    disabled = false,
  }: {
    initial?: string[];
    disabled?: boolean;
  }): React.JSX.Element {
    const [value, setValue] = useState<string[]>(initial);
    return (
      <FormField label="Estados del evento">
        {(field) => (
          <MultiSelect
            {...field}
            options={EVENT_STATUS_OPTIONS}
            value={value}
            onChange={setValue}
            disabled={disabled}
            placeholder="Todos los estados"
            summaryLabel={(count) => `${count} seleccionados`}
            removeOptionLabel={(label) => `Quitar ${label}`}
            clearAllLabel="Limpiar todo"
          />
        )}
      </FormField>
    );
  }

  it('abre con teclado, permite selección múltiple y expone el estado de cada opción', async () => {
    const user = userEvent.setup();
    render(<MultiSelectHarness />);

    const trigger = screen.getByRole('combobox', { name: 'Estados del evento' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');

    // La opción activa se comunica por `aria-activedescendant`, no moviendo el foco del DOM.
    expect(listbox).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: /Borrador/ }).id,
    );
    await user.keyboard('{Enter}');
    expect(screen.getByRole('option', { name: /Borrador/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(screen.getByRole('option', { name: /Completado/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(trigger).toHaveTextContent('2 seleccionados');
  });

  it('Escape cierra y devuelve el foco al trigger', async () => {
    const user = userEvent.setup();
    render(<MultiSelectHarness />);
    const trigger = screen.getByRole('combobox', { name: 'Estados del evento' });

    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('el clic fuera cierra el popup', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <MultiSelectHarness />
        <button type="button">Fuera</button>
      </div>,
    );
    await user.click(screen.getByRole('combobox', { name: 'Estados del evento' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fuera' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('quita una selección desde su chip y limpia todo', async () => {
    const user = userEvent.setup();
    render(<MultiSelectHarness initial={['draft', 'active']} />);

    expect(screen.getByRole('combobox')).toHaveTextContent('2 seleccionados');
    await user.click(screen.getByRole('button', { name: 'Quitar Borrador' }));
    expect(screen.getByRole('combobox')).toHaveTextContent('1 seleccionados');

    await user.click(screen.getByRole('button', { name: 'Limpiar todo' }));
    expect(screen.getByRole('combobox')).toHaveTextContent('Todos los estados');
    expect(screen.queryByRole('button', { name: 'Limpiar todo' })).not.toBeInTheDocument();
  });

  it('anuncia la selección en una región aria-live', () => {
    const { container } = render(<MultiSelectHarness initial={['draft']} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent('1 seleccionados');
  });

  it('estado disabled: no abre el popup', async () => {
    const user = userEvent.setup();
    render(<MultiSelectHarness disabled />);
    const trigger = screen.getByRole('combobox', { name: 'Estados del evento' });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('propaga el estado de error del FormField al trigger', () => {
    render(
      <FormField label="Estados" error="Selecciona al menos uno">
        {(field) => (
          <MultiSelect
            {...field}
            options={EVENT_STATUS_OPTIONS}
            value={[]}
            onChange={() => {}}
            placeholder="Todos"
            summaryLabel={(count) => `${count}`}
            removeOptionLabel={(label) => `Quitar ${label}`}
          />
        )}
      </FormField>,
    );
    expect(screen.getByRole('combobox', { name: 'Estados' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
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

describe('RadioGroup', () => {
  function RadioHarness({ disabled = false }: { disabled?: boolean }): React.JSX.Element {
    const [value, setValue] = useState<string | null>('draft');
    return (
      <RadioGroup
        name="event-status"
        legend="Estado del evento"
        value={value}
        onChange={setValue}
        disabled={disabled}
        helperText="Puedes cambiarlo más tarde."
        options={[
          { value: 'draft', label: 'Borrador' },
          { value: 'active', label: 'Activo' },
          { value: 'cancelled', label: 'Cancelado', disabled: true },
        ]}
      />
    );
  }

  it('usa fieldset + legend y expone el grupo con su nombre accesible', () => {
    render(<RadioHarness />);
    const group = screen.getByRole('group', { name: /Estado del evento/ });
    expect(group.tagName).toBe('FIELDSET');
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
  });

  it('selecciona con teclado (flechas nativas del grupo)', async () => {
    const user = userEvent.setup();
    render(<RadioHarness />);
    expect(screen.getByRole('radio', { name: 'Borrador' })).toBeChecked();

    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Activo' })).toBeChecked();
  });

  it('respeta la opción deshabilitada y el grupo deshabilitado', () => {
    const { unmount } = render(<RadioHarness />);
    expect(screen.getByRole('radio', { name: 'Cancelado' })).toBeDisabled();
    unmount();

    render(<RadioHarness disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('asocia el error con el grupo', () => {
    render(
      <RadioGroup
        name="status"
        legend="Estado"
        value={null}
        onChange={() => {}}
        error="Selecciona un estado"
        options={[{ value: 'draft', label: 'Borrador' }]}
      />,
    );
    const group = screen.getByRole('group', { name: 'Estado' });
    expect(group).toHaveAttribute('aria-invalid', 'true');
    const ids = (group.getAttribute('aria-describedby') ?? '').split(' ');
    expect(document.getElementById(ids[0] as string)).toHaveTextContent('Selecciona un estado');
  });
});
