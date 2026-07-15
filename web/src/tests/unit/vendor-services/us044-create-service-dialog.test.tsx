// US-044 QA-005 — A11Y + comportamiento del `CreateServiceDialog`.
// Verifica: role="dialog", aria-modal="true", labelled por título, focus inicial en el primer
// input, ESC cierra sin submit y ausencia de violaciones axe.
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { CreateServiceDialog } from '@/features/vendor-services/components/CreateServiceDialog';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const categories = [
  { id: '00000000-0000-0000-0000-000000000001', code: 'catering', label: 'Catering' },
  { id: '00000000-0000-0000-0000-000000000002', code: 'venue', label: 'Venue' },
];

function wrap(node: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="es-LATAM" messages={{ vendor: esLatamVendor }}>
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-044 QA-005 — CreateServiceDialog', () => {
  it('expone role=dialog + aria-modal + aria-labelledby', () => {
    render(
      wrap(
        <CreateServiceDialog
          isOpen
          categories={categories}
          onClose={() => {}}
          onCreated={() => {}}
        />,
      ),
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    // El elemento apuntado por aria-labelledby debe contener el título del modal.
    if (labelledBy) {
      expect(document.getElementById(labelledBy)?.textContent).toMatch(/nuevo paquete/i);
    }
  });

  it('foco inicial en el primer input (package_name)', async () => {
    render(
      wrap(
        <CreateServiceDialog
          isOpen
          categories={categories}
          onClose={() => {}}
          onCreated={() => {}}
        />,
      ),
    );
    // El primer input es `package_name` — labelled por su span.
    const input = screen.getByRole('textbox', { name: /nombre del paquete/i });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(input);
  });

  it('ESC dispara onClose sin submit', () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    render(
      wrap(
        <CreateServiceDialog
          isOpen
          categories={categories}
          onClose={onClose}
          onCreated={onCreated}
        />,
      ),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('no renderiza cuando isOpen=false', () => {
    const { queryByRole } = render(
      wrap(
        <CreateServiceDialog
          isOpen={false}
          categories={categories}
          onClose={() => {}}
          onCreated={() => {}}
        />,
      ),
    );
    expect(queryByRole('dialog')).toBeNull();
  });

  it('A11Y: sin violaciones axe', async () => {
    const { container } = render(
      wrap(
        <CreateServiceDialog
          isOpen
          categories={categories}
          onClose={() => {}}
          onCreated={() => {}}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
