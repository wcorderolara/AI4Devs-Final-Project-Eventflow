// US-075 (PB-P1-042 / QA-005 A11Y) — Unit tests DOM + a11y de los componentes admin
// del catálogo `ServiceCategory`:
//   - `CategoryTreeView`: role="tree", items role="treeitem" con aria-level y aria-expanded.
//   - `CategoryFormDialog`: <dialog> con aria-labelledby, fieldset/legend para nombres i18n,
//      es-LATAM required, code slug validation, botón "Guardar" enabled solo con inputs válidos.
//   - `CategoryDeleteDialog`: reason required [10..500] con counter aria-describedby.
//
// jsdom no implementa `showModal()`/`close()` — polyfill idéntico al de US-074.
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamAdmin from '@/messages/es-LATAM/admin.json';
import { CategoryTreeView } from '@/features/admin/categories/components/CategoryTreeView';
import { CategoryFormDialog } from '@/features/admin/categories/components/CategoryFormDialog';
import { CategoryDeleteDialog } from '@/features/admin/categories/components/CategoryDeleteDialog';
import type { AdminCategoryTreeNode } from '@/features/admin/categories/api/adminCategoriesApi.types';

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

function makeNode(overrides: Partial<AdminCategoryTreeNode> & { id: string; code: string }): AdminCategoryTreeNode {
  return {
    id: overrides.id,
    code: overrides.code,
    label: overrides.label ?? overrides.code,
    description: null,
    name_i18n: overrides.name_i18n ?? { 'es-LATAM': overrides.code },
    description_i18n: null,
    parent_id: overrides.parent_id ?? null,
    sort_order: overrides.sort_order ?? 0,
    depth_level: overrides.depth_level ?? (overrides.parent_id ? 2 : 1),
    is_active: overrides.is_active ?? true,
    created_at: NOW,
    updated_at: NOW,
    children: overrides.children ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryTreeView
// ─────────────────────────────────────────────────────────────────────────────

describe('US-075 · CategoryTreeView', () => {
  const music = makeNode({
    id: '11111111-1111-4111-8111-111111111111',
    code: 'music',
    name_i18n: { 'es-LATAM': 'Música' },
  });
  const marimba = makeNode({
    id: '22222222-2222-4222-8222-222222222222',
    code: 'marimba',
    name_i18n: { 'es-LATAM': 'Marimba' },
    parent_id: music.id,
  });
  const tree = [{ ...music, children: [marimba] }];

  it('renderiza tree con role="tree" y items con aria-level correctos', () => {
    render(
      withProviders(
        <CategoryTreeView
          tree={tree}
          onCreateRoot={vi.fn()}
          onCreateChild={vi.fn()}
          onEdit={vi.fn()}
          onSoftDelete={vi.fn()}
          onReactivate={vi.fn()}
        />,
      ),
    );
    const treeEl = screen.getByRole('tree');
    expect(treeEl).toHaveAttribute('aria-label');
    const items = screen.getAllByRole('treeitem');
    expect(items).toHaveLength(2);
    expect(items[0]!).toHaveAttribute('aria-level', '1');
    expect(items[1]!).toHaveAttribute('aria-level', '2');
    expect(items[0]!).toHaveAttribute('aria-expanded', 'true');
  });

  it('estado inactivo muestra badge y botón "Reactivar" en vez de "Desactivar"', () => {
    const inactive = { ...music, is_active: false, children: [] };
    render(
      withProviders(
        <CategoryTreeView
          tree={[inactive]}
          onCreateRoot={vi.fn()}
          onCreateChild={vi.fn()}
          onEdit={vi.fn()}
          onSoftDelete={vi.fn()}
          onReactivate={vi.fn()}
        />,
      ),
    );
    expect(screen.getByTestId(`category-inactive-badge-${inactive.code}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reactivar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Desactivar$/i })).not.toBeInTheDocument();
  });

  it('estado vacío ofrece CTA "Crear categoría"', () => {
    const onCreateRoot = vi.fn();
    render(
      withProviders(
        <CategoryTreeView
          tree={[]}
          onCreateRoot={onCreateRoot}
          onCreateChild={vi.fn()}
          onEdit={vi.fn()}
          onSoftDelete={vi.fn()}
          onReactivate={vi.fn()}
        />,
      ),
    );
    const cta = screen.getByRole('button', { name: /Crear categoría/i });
    fireEvent.click(cta);
    expect(onCreateRoot).toHaveBeenCalledTimes(1);
  });

  it('a11y: 0 violaciones serias en el tree con datos', async () => {
    const { container } = render(
      withProviders(
        <CategoryTreeView
          tree={tree}
          onCreateRoot={vi.fn()}
          onCreateChild={vi.fn()}
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
// CategoryFormDialog
// ─────────────────────────────────────────────────────────────────────────────

describe('US-075 · CategoryFormDialog', () => {
  const music = makeNode({
    id: '11111111-1111-4111-8111-111111111111',
    code: 'music',
    name_i18n: { 'es-LATAM': 'Música' },
  });

  it('modo create-root: renderiza dialog con aria-labelledby + fieldset legend + code editable', () => {
    render(
      withProviders(
        <CategoryFormDialog mode={{ kind: 'create-root' }} roots={[]} onClose={vi.fn()} />,
      ),
    );
    const dialog = screen.getByTestId('category-form-dialog') as HTMLDialogElement;
    const heading = screen.getByRole('heading');
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(screen.getByTestId('category-form-code')).not.toBeDisabled();
    // Los 4 inputs de name i18n existen (1 fieldset + 4 labels).
    expect(screen.getByTestId('category-form-name-es-LATAM')).toBeInTheDocument();
    expect(screen.getByTestId('category-form-name-en')).toBeInTheDocument();
  });

  it('esLatam vacío deshabilita submit', () => {
    render(
      withProviders(
        <CategoryFormDialog mode={{ kind: 'create-root' }} roots={[]} onClose={vi.fn()} />,
      ),
    );
    const submit = screen.getByTestId('category-form-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    // Escribo code válido pero sin name es-LATAM → sigue disabled.
    fireEvent.change(screen.getByTestId('category-form-code'), { target: { value: 'valid-slug' } });
    expect(submit.disabled).toBe(true);
  });

  it('con code válido + es-LATAM ⇒ submit habilitado', () => {
    render(
      withProviders(
        <CategoryFormDialog mode={{ kind: 'create-root' }} roots={[]} onClose={vi.fn()} />,
      ),
    );
    fireEvent.change(screen.getByTestId('category-form-code'), { target: { value: 'valid-slug' } });
    fireEvent.change(screen.getByTestId('category-form-name-es-LATAM'), {
      target: { value: 'Música' },
    });
    const submit = screen.getByTestId('category-form-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('modo edit: code disabled + toggle is_active visible', () => {
    render(
      withProviders(
        <CategoryFormDialog
          mode={{ kind: 'edit', node: { ...music, children: [] } }}
          roots={[]}
          onClose={vi.fn()}
        />,
      ),
    );
    const code = screen.getByTestId('category-form-code') as HTMLInputElement;
    expect(code.disabled).toBe(true);
    expect(screen.getByTestId('category-form-is-active')).toBeInTheDocument();
  });

  it('a11y: 0 violaciones serias en create-root', async () => {
    const { container } = render(
      withProviders(
        <CategoryFormDialog mode={{ kind: 'create-root' }} roots={[]} onClose={vi.fn()} />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CategoryDeleteDialog
// ─────────────────────────────────────────────────────────────────────────────

describe('US-075 · CategoryDeleteDialog', () => {
  const music = makeNode({
    id: '11111111-1111-4111-8111-111111111111',
    code: 'music',
    name_i18n: { 'es-LATAM': 'Música' },
  });

  it('reason vacío deshabilita submit; ≥10 chars lo habilita', () => {
    render(
      withProviders(
        <CategoryDeleteDialog node={{ ...music, children: [] }} onClose={vi.fn()} />,
      ),
    );
    const submit = screen.getByTestId('category-delete-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    const textarea = screen.getByTestId('category-delete-reason') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '1234567890 razón' } });
    expect(submit.disabled).toBe(false);
  });

  it('reason < 10 marca aria-invalid', () => {
    render(
      withProviders(
        <CategoryDeleteDialog node={{ ...music, children: [] }} onClose={vi.fn()} />,
      ),
    );
    const textarea = screen.getByTestId('category-delete-reason') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'short' } });
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
  });

  it('a11y: 0 violaciones serias', async () => {
    const { container } = render(
      withProviders(
        <CategoryDeleteDialog node={{ ...music, children: [] }} onClose={vi.fn()} />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
