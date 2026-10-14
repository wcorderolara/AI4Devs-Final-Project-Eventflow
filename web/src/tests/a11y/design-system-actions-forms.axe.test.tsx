// PB-P2-028 — Auditoría axe-core del design system de Actions & Forms.
//
// Política del gate (Doc 20 §a11y, US-131): bloquea el merge cualquier violación
// `impact === 'critical'`. Aquí se audita además el catálogo completo en un solo árbol para
// detectar colisiones de ids y nombres accesibles ausentes.
import { render } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
  Button,
  Checkbox,
  DateInput,
  FileUpload,
  FormField,
  IconButton,
  Input,
  PasswordInput,
  SearchInput,
  Select,
  Textarea,
  TextLink,
} from '@/shared/design-system';
import { auditA11y, formatViolations } from './helpers/axe';

function Catalog(): React.JSX.Element {
  const [search, setSearch] = useState('bodas');

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

        <FormField label="Fecha del evento">
          {(field) => <DateInput {...field} min="2026-01-01" />}
        </FormField>

        <Checkbox label="Acepto los términos" description="Se aplican a todos los eventos." />
        <Checkbox label="Todos los estados" indeterminate />

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

  it('todos los controles del catálogo tienen nombre accesible', () => {
    render(<Catalog />);
    for (const control of [
      ...screen.getAllByRole('textbox'),
      ...screen.getAllByRole('button'),
      ...screen.getAllByRole('checkbox'),
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
