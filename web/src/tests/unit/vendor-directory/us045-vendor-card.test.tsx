// US-045 QA-005 — A11Y + component contract del `VendorCard`.
// Verifica: `aria-labelledby` apuntando al nombre del negocio, rating con `aria-label`,
// estado sin reviews ni categorías, y ausencia de violaciones axe.
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { VendorCard } from '@/features/vendor-directory/components/VendorCard';
import type { VendorCardDTO } from '@/features/vendor-directory/api/vendorDirectoryApi.types';
import esLatamVendor from '@/messages/es-LATAM/vendor.json';

expect.extend(toHaveNoViolations);

function card(overrides: Partial<VendorCardDTO> = {}): VendorCardDTO {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    slug: 'banquetes-el-quetzal',
    businessName: 'Banquetes El Quetzal',
    locationCode: 'GT-GUA',
    categories: ['catering'],
    ratingAvg: 4.6,
    reviewsCount: 12,
    priceRange: { min: '150.00', max: '450.00', currency: 'GTQ' },
    thumbnailUrl: null,
    ...overrides,
  };
}

function wrap(node: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={{ vendor: esLatamVendor }}>
      {node}
    </NextIntlClientProvider>
  );
}

describe('US-045 QA-005 — VendorCard', () => {
  it('renderiza el nombre del negocio y aplica aria-labelledby', () => {
    render(wrap(<VendorCard vendor={card()} />));
    const article = screen.getByRole('article', { name: 'Banquetes El Quetzal' });
    expect(article).toBeDefined();
  });

  it('muestra rating con aria-label descriptivo cuando existe', () => {
    render(wrap(<VendorCard vendor={card()} />));
    // aria-label incluye avg y count.
    expect(screen.getByLabelText(/4\.6 estrellas, 12 reviews/i)).toBeDefined();
  });

  it('muestra "Sin reviews aún" cuando ratingAvg es null', () => {
    render(wrap(<VendorCard vendor={card({ ratingAvg: null, reviewsCount: 0 })} />));
    expect(screen.getByText(/sin reviews aún/i)).toBeDefined();
  });

  it('oculta el bloque de priceRange cuando es null', () => {
    render(wrap(<VendorCard vendor={card({ priceRange: null })} />));
    expect(screen.queryByText(/rango de precio/i)).toBeNull();
  });

  it('A11Y: sin violaciones axe', async () => {
    const { container } = render(wrap(<VendorCard vendor={card()} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
