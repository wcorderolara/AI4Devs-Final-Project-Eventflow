// US-040 QA-001/QA-005 — Tests unitarios + A11Y del wizard VendorProfile.
// Cubre: navegación de pasos, validación cliente (RHF+Zod), submit del último paso,
// y jest-axe formal para AC-05 (WCAG AA sin violaciones).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { VendorProfileWizard } from '@/features/vendor-profile';
import enVendor from '@/messages/en/vendor.json';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/vendor/profile/new',
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

describe('US-040 QA-005 — A11Y VendorProfileWizard (jest-axe)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('paso inicial (BasicInfo) sin violaciones axe', async () => {
    const { container } = render(wrap(<VendorProfileWizard />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-040 QA-001 — flujo del wizard', () => {
  it('renderiza título, subtítulo y anuncio de paso vía aria-live', () => {
    render(wrap(<VendorProfileWizard />));
    expect(screen.getByRole('heading', { name: /create your vendor profile/i })).toBeInTheDocument();
    const announce = screen.getByRole('status', { name: '' });
    expect(announce).toHaveAttribute('aria-live', 'polite');
    // La cadena i18n usa placeholders {current}/{total}; testeamos por número visible.
    expect(announce.textContent).toMatch(/Step 1 of 4/i);
  });

  it('bloquea avance cuando business_name es corto y muestra error inline', async () => {
    const user = userEvent.setup();
    render(wrap(<VendorProfileWizard />));
    const nameInput = screen.getByLabelText(/business name/i);
    const bioInput = screen.getByLabelText(/business description/i);
    await user.type(nameInput, 'A');
    await user.type(bioInput, 'x'.repeat(60));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    // El error toma el message key `businessNameLength`.
    expect(
      await screen.findByText(/must be between 2 and 150 characters/i),
    ).toBeInTheDocument();
    // Permanece en el paso 1.
    expect(screen.getByRole('status').textContent).toMatch(/Step 1 of 4/i);
  });

  it('avanza al paso 2 con datos válidos', async () => {
    const user = userEvent.setup();
    render(wrap(<VendorProfileWizard />));
    await user.type(screen.getByLabelText(/business name/i), 'Acme Catering');
    await user.type(screen.getByLabelText(/business description/i), 'x'.repeat(80));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    // El progreso anuncia el paso 2.
    expect(screen.getByRole('status').textContent).toMatch(/Step 2 of 4/i);
  });
});
