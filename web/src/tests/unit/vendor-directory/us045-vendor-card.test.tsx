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

  it('describe el rating completo para lectores de pantalla cuando existe', () => {
    render(wrap(<VendorCard vendor={card()} />));
    // aria-label incluye avg y count.
    expect(screen.getByText('4.6 de 5 estrellas, 12 reseñas')).toBeDefined();
  });

  it('muestra "Aún sin reseñas" cuando ratingAvg es null', () => {
    render(wrap(<VendorCard vendor={card({ ratingAvg: null, reviewsCount: 0 })} />));
    expect(screen.getByText('Aún sin reseñas')).toBeDefined();
  });

  it('muestra ciudad y país legibles y el nombre de la categoría, nunca los códigos', () => {
    render(
      wrap(
        <VendorCard
          vendor={card({
            locationDisplay: 'Antigua Guatemala, Sacatepéquez, Guatemala',
            categoryLabels: [{ code: 'catering', name: 'Banquetes y Catering' }],
          })}
        />,
      ),
    );
    expect(screen.getByText('Antigua Guatemala, Guatemala')).toBeDefined();
    expect(screen.getByText('Banquetes y Catering')).toBeDefined();
    expect(screen.queryByText('GT-GUA')).toBeNull();
    expect(screen.queryByText('catering')).toBeNull();
  });

  it('muestra "Desde" con el precio mínimo formateado cuando hay rango', () => {
    render(wrap(<VendorCard vendor={card({ priceRange: { min: '150.00', max: '450.00', currency: 'GTQ' } })} />));
    expect(screen.getByText(/^Desde/)).toBeDefined();
  });

  it('oculta el bloque de priceRange cuando es null', () => {
    render(wrap(<VendorCard vendor={card({ priceRange: null })} />));
    expect(screen.queryByText(/rango de precio/i)).toBeNull();
  });

  it('linkToProfile: enlaza al perfil por slug y estira el enlace sobre toda la card', () => {
    render(wrap(<VendorCard vendor={card()} linkToProfile />));
    const link = screen.getByRole('link', { name: 'Banquetes El Quetzal' });
    expect(link.getAttribute('href')).toBe('/vendors/banquetes-el-quetzal');
    // Stretched link: el `::after` absoluto cubre la card (`relative`) → toda la card es clicable.
    expect(link.className).toContain('after:absolute');
    expect(link.className).toContain('after:inset-0');
    expect(screen.getByRole('article').className).toContain('relative');
  });

  it('linkToProfile sin slug: no renderiza enlace (evita /vendors/null)', () => {
    render(wrap(<VendorCard vendor={card({ slug: null })} linkToProfile />));
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('article', { name: 'Banquetes El Quetzal' })).toBeDefined();
  });

  it('A11Y: sin violaciones axe con linkToProfile', async () => {
    const { container } = render(wrap(<VendorCard vendor={card()} linkToProfile />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('A11Y: sin violaciones axe', async () => {
    const { container } = render(wrap(<VendorCard vendor={card()} />));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
