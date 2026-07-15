// US-044 QA-005 — A11Y + component contract del `VendorServiceTable`.
// Verifica: cabeceras semánticas (`<th scope="col">`), contador con `aria-live`, botones con
// `aria-label` distintos por acción y ausencia de violaciones axe.
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { VendorServiceTable } from '@/features/vendor-services/components/VendorServiceTable';
import type { VendorServiceView } from '@/features/vendor-services/api/vendorServicesApi.types';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

function service(overrides: Partial<VendorServiceView> = {}): VendorServiceView {
  return {
    id: 'svc-1',
    vendorProfileId: 'vp-1',
    serviceCategoryId: 'cat-1',
    packageName: 'Paquete Boda',
    description: 'Descripción demo con al menos diez caracteres.',
    basePrice: '1500.00',
    currencyCode: 'GTQ',
    isActive: true,
    aiGeneratedDescription: false,
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
    ...overrides,
  };
}

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

describe('US-044 QA-005 — VendorServiceTable', () => {
  it('renderiza cabeceras semánticas con scope="col"', () => {
    render(
      wrap(
        <VendorServiceTable
          items={[service()]}
          isLoading={false}
          onRequestCreate={() => {}}
          onRequestDeactivate={() => {}}
        />,
      ),
    );
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBe(5);
    for (const th of headers) {
      expect(th).toHaveAttribute('scope', 'col');
    }
  });

  it('contador N/50 es `aria-live="polite"` y refleja los activos', () => {
    render(
      wrap(
        <VendorServiceTable
          items={[
            service({ id: 's1', isActive: true }),
            service({ id: 's2', isActive: false }),
          ]}
          isLoading={false}
          onRequestCreate={() => {}}
          onRequestDeactivate={() => {}}
        />,
      ),
    );
    const counter = screen.getByTestId('vendor-services-counter');
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter.textContent).toContain('1 de 50');
  });

  it('empty state accesible cuando no hay items', () => {
    render(
      wrap(
        <VendorServiceTable
          items={[]}
          isLoading={false}
          onRequestCreate={() => {}}
          onRequestDeactivate={() => {}}
        />,
      ),
    );
    expect(screen.getByText(/aún no tienes paquetes/i)).toBeDefined();
  });

  it('cada botón de acción tiene aria-label específico (deactivate)', () => {
    render(
      wrap(
        <VendorServiceTable
          items={[service({ isActive: true, packageName: 'Paquete X' })]}
          isLoading={false}
          onRequestCreate={() => {}}
          onRequestDeactivate={() => {}}
        />,
      ),
    );
    const btn = screen.getByRole('button', { name: /desactivar el paquete paquete x/i });
    expect(btn).toBeDefined();
  });

  it('cada botón de acción tiene aria-label específico (reactivate)', () => {
    render(
      wrap(
        <VendorServiceTable
          items={[service({ isActive: false, packageName: 'Paquete Y' })]}
          isLoading={false}
          onRequestCreate={() => {}}
          onRequestDeactivate={() => {}}
        />,
      ),
    );
    const btn = screen.getByRole('button', { name: /reactivar el paquete paquete y/i });
    expect(btn).toBeDefined();
  });

  it('A11Y: sin violaciones axe con items', async () => {
    const { container } = render(
      wrap(
        <VendorServiceTable
          items={[
            service({ id: 's1', isActive: true }),
            service({ id: 's2', isActive: false, packageName: 'Paquete Inactivo' }),
          ]}
          isLoading={false}
          onRequestCreate={() => {}}
          onRequestDeactivate={() => {}}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('A11Y: sin violaciones axe en estado empty', async () => {
    const { container } = render(
      wrap(
        <VendorServiceTable
          items={[]}
          isLoading={false}
          onRequestCreate={() => {}}
          onRequestDeactivate={() => {}}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
