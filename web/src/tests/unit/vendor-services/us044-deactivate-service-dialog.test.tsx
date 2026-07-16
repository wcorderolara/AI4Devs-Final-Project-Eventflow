// US-044 QA-005 — A11Y del `DeactivateServiceDialog`.
// Verifica: role="dialog" + aria-modal, foco inicial en Cancelar (D2 defensivo), ESC cierra,
// ausencia de violaciones axe.
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { DeactivateServiceDialog } from '@/features/vendor-services/components/DeactivateServiceDialog';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

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

describe('US-044 QA-005 — DeactivateServiceDialog', () => {
  it('role=dialog + aria-modal + aria-labelledby con nombre del paquete', () => {
    render(
      wrap(
        <DeactivateServiceDialog
          isOpen
          serviceId="svc-1"
          packageName="Paquete Especial"
          onClose={() => {}}
          onDeactivated={() => {}}
        />,
      ),
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    if (labelledBy) {
      expect(document.getElementById(labelledBy)?.textContent).toMatch(/paquete especial/i);
    }
  });

  it('foco inicial en el botón Cancelar', async () => {
    render(
      wrap(
        <DeactivateServiceDialog
          isOpen
          serviceId="svc-1"
          packageName="Paquete Especial"
          onClose={() => {}}
          onDeactivated={() => {}}
        />,
      ),
    );
    const cancel = screen.getByRole('button', { name: /cancelar/i });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(cancel);
  });

  it('ESC dispara onClose sin desactivar', () => {
    const onClose = vi.fn();
    const onDeactivated = vi.fn();
    render(
      wrap(
        <DeactivateServiceDialog
          isOpen
          serviceId="svc-1"
          packageName="Paquete Especial"
          onClose={onClose}
          onDeactivated={onDeactivated}
        />,
      ),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDeactivated).not.toHaveBeenCalled();
  });

  it('no renderiza cuando isOpen=false', () => {
    const { queryByRole } = render(
      wrap(
        <DeactivateServiceDialog
          isOpen={false}
          serviceId="svc-1"
          packageName="Paquete Especial"
          onClose={() => {}}
          onDeactivated={() => {}}
        />,
      ),
    );
    expect(queryByRole('dialog')).toBeNull();
  });

  it('A11Y: sin violaciones axe', async () => {
    const { container } = render(
      wrap(
        <DeactivateServiceDialog
          isOpen
          serviceId="svc-1"
          packageName="Paquete Especial"
          onClose={() => {}}
          onDeactivated={() => {}}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
