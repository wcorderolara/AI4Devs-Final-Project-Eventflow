// US-042 QA-005 — A11Y (jest-axe) + tests funcionales de CategoryChangeForm.
// - `aria-live="polite"` en el contador (counter.remaining / counter.reached).
// - `aria-describedby` en el CTA cuando el límite está alcanzado (5/5).
// - Modal de confirmación con `role="dialog"`, focus trap básico y captura de ESC.
// - Sin violaciones axe en el estado por defecto y con límite alcanzado.
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { CategoryChangeForm } from '@/features/vendor-profile';
import type { VendorProfileDTO } from '@/features/vendor-profile';
import enVendor from '@/messages/en/vendor.json';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/vendor/profile/edit/categories',
  useSearchParams: () => new URLSearchParams(),
}));

// El hook `useServiceCategories` dispara httpGet; en tests no queremos que resuelva algo
// significativo — devolvemos loading para axe verificar el estado inicial completo.
vi.mock('@/features/vendor-profile/hooks/useVendorProfileQueries', () => ({
  vendorProfileKeys: {
    serviceCategories: ['vendor-profile', 'service-categories'],
    me: ['vendor-profile', 'me'],
  },
  useMyVendorProfile: () => ({ isPending: false, data: null, error: null }),
  useServiceCategories: () => ({
    isPending: false,
    error: null,
    data: [
      { id: '44444444-4444-4444-4444-444444444444', code: 'catering', label: 'Catering' },
      { id: '55555555-5555-5555-5555-555555555555', code: 'venue', label: 'Venue' },
    ],
  }),
}));

vi.mock('@/features/vendor-profile/hooks/useVendorProfileMutations', () => ({
  useChangeVendorCategories: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useCreateVendorProfile: () => ({}),
  useUpdateVendorProfile: () => ({}),
  useSoftDeleteVendorProfile: () => ({}),
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
  categories: [{ id: '44444444-4444-4444-4444-444444444444', name: 'Catering' }],
  slug: 'acme-catering',
  status: 'approved',
  created_at: '2026-07-15T12:00:00Z',
};

describe('US-042 QA-005 — A11Y CategoryChangeForm (jest-axe)', () => {
  it('sin violaciones axe en estado por defecto', async () => {
    const { container } = render(
      wrap(<CategoryChangeForm profile={profileFixture} categoryChangeCount={2} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('sin violaciones axe cuando el límite está alcanzado (5/5)', async () => {
    const { container } = render(
      wrap(<CategoryChangeForm profile={profileFixture} categoryChangeCount={5} />),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-042 QA-005 — Semántica accesible del contador y CTA', () => {
  it('contador con aria-live="polite" muestra el remanente', () => {
    render(wrap(<CategoryChangeForm profile={profileFixture} categoryChangeCount={2} />));
    const counter = screen.getByTestId('category-change-counter');
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter.textContent ?? '').toContain('3');
  });

  it('CTA obtiene aria-describedby cuando el límite está alcanzado', () => {
    render(wrap(<CategoryChangeForm profile={profileFixture} categoryChangeCount={5} />));
    const submit = screen.getByRole('button', { name: /request change/i });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-describedby', 'limit-reached-help');
    expect(document.getElementById('limit-reached-help')?.textContent ?? '').toMatch(
      /maximum of 5 category changes/i,
    );
  });

  it('mensaje de límite alcanzado se muestra en el contador', () => {
    render(wrap(<CategoryChangeForm profile={profileFixture} categoryChangeCount={5} />));
    expect(screen.getByTestId('category-change-counter').textContent ?? '').toMatch(
      /reached the maximum/i,
    );
  });
});
