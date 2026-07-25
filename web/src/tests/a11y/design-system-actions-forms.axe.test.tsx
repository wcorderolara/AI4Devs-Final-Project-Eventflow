// PB-P2-028 — Auditoría axe-core del design system de Actions & Forms.
//
// Política del gate (Doc 20 §a11y, US-131): bloquea el merge cualquier violación
// `impact === 'critical'`. Aquí se audita además el catálogo completo en un solo árbol para
// detectar colisiones de ids y nombres accesibles ausentes.
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
  Button,
  Checkbox,
  CurrencyInput,
  DateInput,
  FileUpload,
  FormField,
  IconButton,
  Input,
  MultiSelect,
  PasswordInput,
  RadioGroup,
  SearchInput,
  Select,
  Textarea,
  TextLink,
} from '@/shared/design-system';
import { auditA11y, formatViolations } from './helpers/axe';

function Catalog(): React.JSX.Element {
  const [statuses, setStatuses] = useState<string[]>(['draft']);
  const [amount, setAmount] = useState<number | null>(1500);
  const [search, setSearch] = useState('bodas');
  const [radio, setRadio] = useState<string | null>('draft');

  return (
    <main>
      <h1>Catálogo de componentes</h1>

      <section aria-label="Acciones">
        <Button variant="primary">Guardar cambios</Button>
        <Button variant="secondary" size="sm">
          Cancelar
        </Button>
        <Button variant="destructive" leadingIcon={<Trash2 />}>
          Eliminar borrador
        </Button>
        <Button isLoading loadingLabel="Guardando…">
          Guardar
        </Button>
        <Button disabled>No disponible</Button>
        <IconButton icon={<Plus />} aria-label="Agregar tarea" />
        <IconButton icon={<Trash2 />} aria-label="Eliminar tarea" variant="destructive" />
        <TextLink href="/organizer/events">Ver eventos</TextLink>
        <TextLink href="https://example.org" external externalHintLabel="Abre en una pestaña nueva">
          Guía
        </TextLink>
      </section>

      <section aria-label="Formulario">
        <FormField
          label="Nombre del evento"
          required
          requiredIndicator="*"
          helperText="Aparecerá en las cotizaciones."
          characterCount={{ current: 4, max: 80 }}
        >
          {(field) => <Input {...field} defaultValue="Boda" />}
        </FormField>

        <FormField label="Correo electrónico" error="Ingresa un correo válido">
          {(field) => <Input {...field} type="email" defaultValue="invalido" />}
        </FormField>

        <FormField label="Contraseña">
          {(field) => (
            <PasswordInput
              {...field}
              showLabel="Mostrar contraseña"
              hideLabel="Ocultar contraseña"
            />
          )}
        </FormField>

        <FormField label="Buscar proveedores">
          {(field) => (
            <SearchInput
              {...field}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch('')}
              clearLabel="Limpiar búsqueda"
            />
          )}
        </FormField>

        <FormField label="Descripción" optionalIndicator="(opcional)">
          {(field) => <Textarea {...field} />}
        </FormField>

        <FormField label="Estado">
          {(field) => (
            <Select
              {...field}
              placeholder="Todos los estados"
              options={[
                { value: 'draft', label: 'Borrador' },
                { value: 'active', label: 'Activo' },
              ]}
            />
          )}
        </FormField>

        <FormField label="Estados del evento">
          {(field) => (
            <MultiSelect
              {...field}
              options={[
                { value: 'draft', label: 'Borrador' },
                { value: 'active', label: 'Activo' },
                { value: 'completed', label: 'Completado' },
                { value: 'cancelled', label: 'Cancelado' },
              ]}
              value={statuses}
              onChange={setStatuses}
              placeholder="Todos los estados"
              summaryLabel={(count) => `${count} seleccionados`}
              removeOptionLabel={(label) => `Quitar ${label}`}
              clearAllLabel="Limpiar todo"
            />
          )}
        </FormField>

        <FormField label="Fecha del evento">
          {(field) => <DateInput {...field} min="2026-01-01" />}
        </FormField>

        <FormField label="Monto planificado" helperText="Sin conversión de moneda.">
          {(field) => (
            <CurrencyInput
              {...field}
              currencyCode="GTQ"
              locale="es-419"
              value={amount}
              onValueChange={setAmount}
            />
          )}
        </FormField>

        <Checkbox label="Acepto los términos" description="Se aplican a todos los eventos." />
        <Checkbox label="Todos los estados" indeterminate />

        <RadioGroup
          name="axe-status"
          legend="Estado del evento"
          value={radio}
          onChange={setRadio}
          helperText="Puedes cambiarlo más tarde."
          options={[
            { value: 'draft', label: 'Borrador' },
            { value: 'active', label: 'Activo' },
          ]}
        />

        <FileUpload
          dropzoneLabel="Selecciona o arrastra un archivo"
          hintLabel="JPG, PNG o WebP · máximo 5 MB"
          removeLabel={(name) => `Quitar ${name}`}
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={5 * 1024 * 1024}
          selectedFiles={[{ name: 'portada.png', size: 2048 }]}
          statusMessage="Archivo listo para subir"
          onFilesSelected={() => {}}
          onRemoveFile={() => {}}
        />
      </section>
    </main>
  );
}

describe('PB-P2-028 · axe · design system Actions & Forms', () => {
  it('el catálogo completo no tiene violaciones críticas', async () => {
    const { container } = render(<Catalog />);
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });

  it('el MultiSelect abierto tampoco tiene violaciones críticas', async () => {
    const user = userEvent.setup();
    const { container } = render(<Catalog />);
    await user.click(screen.getByRole('combobox', { name: 'Estados del evento' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });

  it('todos los controles del catálogo tienen nombre accesible', () => {
    render(<Catalog />);
    for (const control of [
      ...screen.getAllByRole('textbox'),
      ...screen.getAllByRole('button'),
      ...screen.getAllByRole('checkbox'),
      ...screen.getAllByRole('radio'),
      ...screen.getAllByRole('combobox'),
    ]) {
      const name =
        control.getAttribute('aria-label') ??
        (control.getAttribute('aria-labelledby')
          ? document.getElementById(control.getAttribute('aria-labelledby') as string)?.textContent
          : null) ??
        (control.id ? document.querySelector(`label[for="${control.id}"]`)?.textContent : null) ??
        control.textContent;
      expect(name?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});
