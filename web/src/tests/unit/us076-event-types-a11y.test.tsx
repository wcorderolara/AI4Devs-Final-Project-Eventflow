// US-076 (PB-P1-043 / QA-004 A11Y) — Unit tests DOM + a11y de los componentes admin
// del catálogo `EventType`:
//   - `EventTypeTable`: role="table" + role="row" + role="cell"; encabezados con role="columnheader".
//   - `EventTypeFormDialog`: <dialog> con aria-labelledby, fieldset/legend para nombres i18n,
//      es-LATAM required, code slug validation (acepta underscore), botón "Guardar" enabled solo
//      con inputs válidos.
//   - `EventTypeDeleteDialog`: reason required [10..500] con counter aria-describedby.
//
// jsdom no implementa `showModal()`/`close()` — polyfill idéntico al de US-075.
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamAdmin from '@/messages/es-LATAM/admin.json';
import { EventTypeTable } from '@/features/admin/event-types/components/EventTypeTable';
import { EventTypeFormDialog } from '@/features/admin/event-types/components/EventTypeFormDialog';
import { EventTypeDeleteDialog } from '@/features/admin/event-types/components/EventTypeDeleteDialog';
import type { AdminEventTypeNode } from '@/features/admin/event-types/api/adminEventTypesApi.types';

expect.extend(toHaveNoViolations);

beforeEach(() => {
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  proto.showModal = function showModal(this: HTMLDialogElement): void {
    (this as unknown as { open: boolean }).open = true;
  };
  proto.close = function close(this: HTMLDialogElement): void {
    (this as unknown as { open: boolean }).open = false;
  };
  cleanup();
});

const messages = { admin: esLatamAdmin };

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

const NOW = '2026-07-20T00:00:00.000Z';

function makeNode(overrides: Partial<AdminEventTypeNode> & { id: string; code: string }): AdminEventTypeNode {
  return {
    id: overrides.id,
    code: overrides.code,
    label: overrides.label ?? overrides.code,
    description: overrides.description ?? null,
    name_i18n: overrides.name_i18n ?? { 'es-LATAM': overrides.code },
    description_i18n: overrides.description_i18n ?? null,
    sort_order: overrides.sort_order ?? 0,
    is_active: overrides.is_active ?? true,
    created_at: NOW,
    updated_at: NOW,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EventTypeTable
// ─────────────────────────────────────────────────────────────────────────────

describe('US-076 · EventTypeTable', () => {
  const wedding = makeNode({
    id: '11111111-1111-4111-8111-111111111111',
    code: 'wedding',
    name_i18n: { 'es-LATAM': 'Boda' },
    sort_order: 10,
  });
  const inactive = makeNode({
    id: '22222222-2222-4222-8222-222222222222',
    code: 'legacy',
    name_i18n: { 'es-LATAM': 'Legado' },
    is_active: false,
    sort_order: 999,
  });

  it('renderiza filas con roles semánticos de tabla', () => {
    render(
      withProviders(
        <EventTypeTable
          items={[wedding, inactive]}
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onSoftDelete={vi.fn()}
          onReactivate={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole('table', { name: /tipos de evento/i })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByTestId('event-type-row-wedding')).toBeInTheDocument();
    expect(screen.getByTestId('event-type-row-legacy')).toBeInTheDocument();
  });

  it('muestra badge inactivo con aria-label y acción Reactivar en filas inactivas', () => {
    render(
      withProviders(
        <EventTypeTable
          items={[inactive]}
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onSoftDelete={vi.fn()}
          onReactivate={vi.fn()}
        />,
      ),
    );
    expect(screen.getByTestId('event-type-inactive-badge-legacy')).toHaveAccessibleName(/Legado está inactivo/);
    expect(screen.getByRole('button', { name: /Reactivar Legado/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Desactivar Legado/i })).not.toBeInTheDocument();
  });

  it('empty state muestra CTA de crear', () => {
    const onCreate = vi.fn();
    render(
      withProviders(
        <EventTypeTable
          items={[]}
          onCreate={onCreate}
          onEdit={vi.fn()}
          onSoftDelete={vi.fn()}
          onReactivate={vi.fn()}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /Crear tipo de evento/i }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('axe sin violaciones', async () => {
    const { container } = render(
      withProviders(
        <EventTypeTable
          items={[wedding, inactive]}
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onSoftDelete={vi.fn()}
          onReactivate={vi.fn()}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EventTypeFormDialog
// ─────────────────────────────────────────────────────────────────────────────

describe('US-076 · EventTypeFormDialog', () => {
  it('crear: es-LATAM required + code slug + underscore permitido', async () => {
    render(
      withProviders(<EventTypeFormDialog mode={{ kind: 'create' }} onClose={vi.fn()} />),
    );
    // Sin nombre es-LATAM: alerta visible y submit disabled.
    expect(screen.getByTestId('event-type-form-name-es-latam-error')).toBeInTheDocument();
    expect(screen.getByTestId('event-type-form-submit')).toBeDisabled();

    // Code inválido con mayúsculas.
    fireEvent.change(screen.getByTestId('event-type-form-code'), { target: { value: 'Wedding' } });
    expect(screen.getByTestId('event-type-form-code')).toHaveValue('Wedding');
    // Aún inválido — la validación local muestra `codeInvalid`.
    expect(screen.getByTestId('event-type-form-submit')).toBeDisabled();

    // Code válido con underscore (`baby_shower`).
    fireEvent.change(screen.getByTestId('event-type-form-code'), { target: { value: 'baby_shower' } });
    fireEvent.change(screen.getByTestId('event-type-form-name-es-LATAM'), {
      target: { value: 'Baby Shower' },
    });
    expect(screen.getByTestId('event-type-form-submit')).not.toBeDisabled();
  });

  it('edit: code disabled + toggle is_active visible', () => {
    const node = makeNode({
      id: '33333333-3333-4333-8333-333333333333',
      code: 'wedding',
      name_i18n: { 'es-LATAM': 'Boda' },
      is_active: false,
    });
    render(
      withProviders(
        <EventTypeFormDialog mode={{ kind: 'edit', node }} onClose={vi.fn()} />,
      ),
    );
    expect(screen.getByTestId('event-type-form-code')).toBeDisabled();
    expect(screen.getByTestId('event-type-form-code')).toHaveValue('wedding');
    expect(screen.getByTestId('event-type-form-is-active')).toBeInTheDocument();
  });

  it('axe sin violaciones (create abierto)', async () => {
    const { container } = render(
      withProviders(<EventTypeFormDialog mode={{ kind: 'create' }} onClose={vi.fn()} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EventTypeDeleteDialog
// ─────────────────────────────────────────────────────────────────────────────

describe('US-076 · EventTypeDeleteDialog', () => {
  const node = makeNode({
    id: '44444444-4444-4444-8444-444444444444',
    code: 'wedding',
    name_i18n: { 'es-LATAM': 'Boda' },
  });

  it('reason: submit deshabilitado hasta [10..500] chars', () => {
    render(withProviders(<EventTypeDeleteDialog node={node} onClose={vi.fn()} />));
    const textarea = screen.getByTestId('event-type-delete-reason');
    const submit = screen.getByTestId('event-type-delete-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'corto' } });
    expect(submit).toBeDisabled();
    expect(textarea).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(textarea, { target: { value: 'razón suficientemente larga' } });
    expect(submit).not.toBeDisabled();
  });

  it('axe sin violaciones', async () => {
    const { container } = render(
      withProviders(<EventTypeDeleteDialog node={node} onClose={vi.fn()} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
