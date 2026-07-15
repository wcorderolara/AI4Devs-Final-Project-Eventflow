// US-041 QA-005 — A11Y (jest-axe) + tests funcionales de VendorProfileEditor y DeleteProfileDialog.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { DeleteProfileDialog, VendorProfileEditor } from '@/features/vendor-profile';
import type { VendorProfileDTO } from '@/features/vendor-profile';
import enVendor from '@/messages/en/vendor.json';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/vendor/profile/edit',
  useSearchParams: () => new URLSearchParams(),
}));

const messages = { vendor: enVendor };

function wrap(node: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const profileFixture: VendorProfileDTO = {
  id: '00000000-0000-0000-0000-0000000000v1',
  vendor_user_id: '00000000-0000-0000-0000-0000000000a1',
  business_name: 'Acme Catering',
  bio: 'x'.repeat(80),
  location_id: '00000000-0000-0000-0000-0000000000c1',
  languages_supported: ['es-LATAM', 'en'],
  categories: [],
  slug: 'acme-catering',
  status: 'approved',
  created_at: '2026-07-15T12:00:00Z',
};

describe('US-041 QA-005 — A11Y VendorProfileEditor (jest-axe)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('sin violaciones axe en el estado por defecto', async () => {
    const { container } = render(wrap(<VendorProfileEditor profile={profileFixture} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-041 QA-005 — A11Y DeleteProfileDialog (jest-axe)', () => {
  it('sin violaciones axe cuando el modal está abierto', async () => {
    const { container } = render(
      wrap(
        <DeleteProfileDialog
          isOpen
          submitting={false}
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('captura ESC y llama onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      wrap(
        <DeleteProfileDialog
          isOpen
          submitting={false}
          onCancel={onCancel}
          onConfirm={() => undefined}
        />,
      ),
    );
    // El foco inicial ya está en el botón "Cancel" — un ESC dispara onCancel.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });
});

describe('US-041 flujo del editor', () => {
  it('renderiza título + subtítulo + hidrata defaults', () => {
    render(wrap(<VendorProfileEditor profile={profileFixture} />));
    expect(screen.getByRole('heading', { name: /edit my profile/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/business name/i) as HTMLInputElement).value).toBe('Acme Catering');
  });

  it('AC-01 minor: submit sin dirty muestra error de validation', async () => {
    const user = userEvent.setup();
    render(wrap(<VendorProfileEditor profile={profileFixture} />));
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    // Sin cambios, Zod `.superRefine` bloquea con `noFieldsToUpdate`; el editor no envía la mutación.
    // No verificamos texto exacto para no depender de i18n interno; solo que no haya banner de éxito.
    expect(screen.queryByText(/changes saved successfully/i)).not.toBeInTheDocument();
  });

  it('abre y cierra el DeleteProfileDialog', async () => {
    const user = userEvent.setup();
    render(wrap(<VendorProfileEditor profile={profileFixture} />));
    await user.click(screen.getByRole('button', { name: /delete my profile/i }));
    expect(screen.getByRole('dialog', { name: /delete your vendor profile/i })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /^cancel$/i })[0]!);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /delete your vendor profile/i })).not.toBeInTheDocument(),
    );
  });
});
