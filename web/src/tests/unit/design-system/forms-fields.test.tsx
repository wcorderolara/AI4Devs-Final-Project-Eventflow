// PB-P2-028 — FormField + controles de texto del design system.
// Fuente normativa: docs/ux-ui/EventFlow-Component-Foundations.md §15 y §16.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FormField, Input, PasswordInput, SearchInput, Textarea } from '@/shared/design-system';

describe('FormField', () => {
  it('asocia label, descripción, helper, contador y error con el control', () => {
    render(
      <FormField
        label="Nombre completo"
        description="Como aparece en tu identificación."
        helperText="Máximo 50 caracteres."
        error="El nombre es obligatorio."
        characterCount={{ current: 0, max: 50 }}
        required
        requiredIndicator="*"
      >
        {(field) => <Input {...field} />}
      </FormField>,
    );

    const input = screen.getByLabelText(/Nombre completo/);
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const ids = describedBy.split(' ');
    expect(ids).toHaveLength(4);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');

    for (const id of ids) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(screen.getByRole('alert')).toHaveTextContent('El nombre es obligatorio.');
    expect(screen.getByText('0/50')).toBeInTheDocument();
  });

  it('`labelAction` renderiza la acción en la fila del label, antes del control', () => {
    render(
      <FormField
        label="Contraseña"
        labelAction={<a href="/forgot-password">¿Olvidaste tu contraseña?</a>}
      >
        {(field) => <Input {...field} type="password" />}
      </FormField>,
    );

    const control = screen.getByLabelText('Contraseña');
    const action = screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' });
    expect(action).toBeInTheDocument();
    // La acción no forma parte del nombre accesible del campo y precede al control en el DOM.
    expect(control).toHaveAccessibleName('Contraseña');
    expect(action.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sin error no marca aria-invalid ni añade descripción de error', () => {
    render(
      <FormField label="Correo electrónico" helperText="Te enviaremos un enlace.">
        {(field) => <Input {...field} type="email" />}
      </FormField>,
    );
    const input = screen.getByLabelText('Correo electrónico');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('propaga disabled y readOnly al control', () => {
    const { unmount } = render(
      <FormField label="Moneda" disabled>
        {(field) => <Input {...field} />}
      </FormField>,
    );
    expect(screen.getByLabelText('Moneda')).toBeDisabled();
    unmount();

    render(
      <FormField label="Moneda" readOnly>
        {(field) => <Input {...field} defaultValue="GTQ" />}
      </FormField>,
    );
    expect(screen.getByLabelText('Moneda')).toHaveAttribute('readonly');
  });

  it('renderiza el indicador de opcional cuando el campo no es obligatorio', () => {
    render(
      <FormField label="Teléfono" optionalIndicator="(opcional)">
        {(field) => <Input {...field} />}
      </FormField>,
    );
    expect(screen.getByText('(opcional)')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renderiza prefijo y sufijo sin romper la asociación del label', () => {
    render(
      <FormField label="Presupuesto">
        {(field) => <Input {...field} prefix="GTQ" suffix="por persona" />}
      </FormField>,
    );
    expect(screen.getByLabelText('Presupuesto')).toBeInTheDocument();
    expect(screen.getByText('GTQ')).toBeInTheDocument();
    expect(screen.getByText('por persona')).toBeInTheDocument();
  });

  it('el icono leading es decorativo y el error usa el borde semántico', () => {
    render(
      <FormField label="Correo" error="Formato inválido">
        {(field) => <Input {...field} leadingIcon={<Mail />} />}
      </FormField>,
    );
    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // El contenedor decorado pinta el borde de error.
    expect(input.parentElement?.className).toContain('border-feedback-error');
  });

  it('acepta ref y atributos nativos (autocomplete, inputMode)', () => {
    render(<Input aria-label="Correo" autoComplete="email" inputMode="email" />);
    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toHaveAttribute('inputmode', 'email');
  });
});

describe('PasswordInput', () => {
  it('alterna la visibilidad sin cambiar el valor y anuncia el estado', async () => {
    const user = userEvent.setup();
    render(
      <FormField label="Contraseña">
        {(field) => (
          <PasswordInput
            {...field}
            defaultValue="segura12345"
            showLabel="Mostrar contraseña"
            hideLabel="Ocultar contraseña"
            autoComplete="current-password"
          />
        )}
      </FormField>,
    );

    const input = screen.getByLabelText('Contraseña') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input.value).toBe('segura12345');

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(input.value).toBe('segura12345');
  });
});

describe('SearchInput', () => {
  function SearchHarness(): React.JSX.Element {
    const [value, setValue] = useState('bodas');
    return (
      <FormField label="Buscar proveedores">
        {(field) => (
          <SearchInput
            {...field}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onClear={() => setValue('')}
            clearLabel="Limpiar búsqueda"
            clearOnEscape
          />
        )}
      </FormField>
    );
  }

  it('usa semántica nativa de búsqueda y limpia con la acción accesible', async () => {
    const user = userEvent.setup();
    render(<SearchHarness />);
    const input = screen.getByLabelText('Buscar proveedores') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'search');

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(input.value).toBe('');
    // Sin valor, la acción de limpiar desaparece (estado vacío).
    expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).not.toBeInTheDocument();
  });

  it('`clearOnEscape` limpia con Escape cuando el consumidor lo habilita', async () => {
    const user = userEvent.setup();
    render(<SearchHarness />);
    const input = screen.getByLabelText('Buscar proveedores') as HTMLInputElement;
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(input.value).toBe('');
  });

  it('muestra el indicador de carga sin duplicar anuncios', () => {
    const onClear = vi.fn();
    render(
      <SearchInput
        aria-label="Buscar"
        value="a"
        onChange={() => {}}
        onClear={onClear}
        clearLabel="Limpiar"
        loading
      />,
    );
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('permite redimensionado vertical y expone estados de error y sólo lectura', () => {
    const { unmount } = render(
      <FormField label="Descripción" error="Requerido" characterCount={{ current: 12, max: 1000 }}>
        {(field) => <Textarea {...field} minRows={4} />}
      </FormField>,
    );
    const textarea = screen.getByLabelText('Descripción');
    expect(textarea).toHaveAttribute('rows', '4');
    expect(textarea.className).toContain('resize-y');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('12/1000')).toBeInTheDocument();
    unmount();

    render(
      <FormField label="Notas" readOnly>
        {(field) => <Textarea {...field} defaultValue="Sin cambios" />}
      </FormField>,
    );
    expect(screen.getByLabelText('Notas')).toHaveAttribute('readonly');
  });
});
