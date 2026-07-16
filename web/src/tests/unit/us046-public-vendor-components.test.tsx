// US-046 (PB-P1-029 / QA-001 + QA-004 A11Y + QA-005 XSS) — Unit tests DOM.
// Cobertura:
//   - `VendorHero` emite `<h1>` único con businessName + categories + rating summary.
//   - `PortfolioGallery` agrupa por workLabel, `alt` presente, empty state accesible.
//   - `PackageList` formatea precio en moneda; empty state.
//   - `ReviewList` limita a 10 con banner "N de M"; escape XSS del comment.
//   - `not-found` renderiza h1 + link al directorio.
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import esLatamPublicVendor from '@/messages/es-LATAM/public-vendor.json';
import { VendorHero } from '@/features/vendor-public/components/VendorHero';
import { PortfolioGallery } from '@/features/vendor-public/components/PortfolioGallery';
import { PackageList } from '@/features/vendor-public/components/PackageList';
import { ReviewList } from '@/features/vendor-public/components/ReviewList';
import VendorNotFound from '@/app/(public)/vendors/[slug]/not-found';
import type { PublicVendorDTO } from '@/features/vendor-public/api/vendorPublicApi.types';

const messages = { publicVendor: esLatamPublicVendor };

function withIntl(children: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const vendor: PublicVendorDTO = {
  slug: 'banquetes-el-quetzal',
  businessName: 'Banquetes El Quetzal',
  bio: 'Servicio premium con 20 años.',
  location: { display: 'Ciudad de Guatemala, Guatemala', code: 'GT-GUA' },
  categories: [
    { code: 'catering', name: 'Catering' },
    { code: 'events', name: 'Eventos' },
  ],
  ratingAvg: 4.8,
  reviewsCount: 24,
  reviewsTotalPublished: 24,
  packages: [
    {
      packageName: 'Menú clásico',
      basePrice: '250.00',
      currencyCode: 'GTQ',
      description: 'Menú de 3 tiempos.',
      serviceCategoryCode: 'catering',
    },
  ],
  portfolio: [
    { workLabel: 'boda-clasica', thumbnails: ['https://cdn/1.jpg', 'https://cdn/2.jpg'] },
    { workLabel: 'quince-anos', thumbnails: ['https://cdn/3.jpg'] },
  ],
  reviews: Array.from({ length: 10 }, (_, i) => ({
    rating: 5 - (i % 2),
    comment: i === 0 ? '<script>alert(1)</script>' : `Reseña ${i + 1}`,
    createdAt: new Date(Date.UTC(2026, 5, 15 - i)).toISOString(),
    reviewerDisplayName: 'Juan P.',
  })),
};

describe('US-046 · VendorHero', () => {
  it('renderiza `<h1>` único con businessName y muestra rating summary', () => {
    render(withIntl(<VendorHero vendor={vendor} />));
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Banquetes El Quetzal');
    // rating summary pluraliza correctamente
    expect(screen.getByText(/24 reseñas/)).toBeInTheDocument();
  });

  it('renderiza empty rating cuando no hay reseñas', () => {
    render(withIntl(<VendorHero vendor={{ ...vendor, reviewsCount: 0, ratingAvg: null }} />));
    expect(screen.getByText('Aún sin reseñas.')).toBeInTheDocument();
  });
});

describe('US-046 · PortfolioGallery', () => {
  it('agrupa por workLabel con `alt` accesible por imagen', () => {
    render(
      withIntl(<PortfolioGallery groups={vendor.portfolio} vendorName={vendor.businessName} />),
    );
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    for (const img of images) {
      expect(img.getAttribute('alt') ?? '').not.toBe('');
    }
  });

  it('renderiza empty state cuando no hay grupos', () => {
    render(withIntl(<PortfolioGallery groups={[]} vendorName={vendor.businessName} />));
    expect(screen.getByText('Este proveedor aún no publica trabajos.')).toBeInTheDocument();
  });
});

describe('US-046 · PackageList', () => {
  it('formatea precio como moneda GTQ y renderiza description', () => {
    render(withIntl(<PackageList packages={vendor.packages} />));
    expect(screen.getByText('Menú clásico')).toBeInTheDocument();
    expect(screen.getByText(/250[.,]00/)).toBeInTheDocument();
    expect(screen.getByText('Menú de 3 tiempos.')).toBeInTheDocument();
  });

  it('empty state cuando no hay paquetes', () => {
    render(withIntl(<PackageList packages={[]} />));
    expect(screen.getByText('Este proveedor no publicó paquetes.')).toBeInTheDocument();
  });
});

describe('US-046 · ReviewList', () => {
  it('renderiza los 10 reviews y `<script>` del comment viaja como texto (React auto-escape)', () => {
    render(withIntl(<ReviewList reviews={vendor.reviews} reviewsTotalPublished={24} />));
    const scriptContent = screen.getByText('<script>alert(1)</script>');
    expect(scriptContent.tagName.toLowerCase()).toBe('p');
    // El nodo NO es un <script> real — React escapa por default.
    expect(document.querySelector('script')).toBeNull();
  });

  it('muestra el banner "N de M" cuando reviewsTotalPublished > reviews.length', () => {
    render(withIntl(<ReviewList reviews={vendor.reviews.slice(0, 10)} reviewsTotalPublished={24} />));
    expect(screen.getByText('Mostrando 10 de 24 reseñas.')).toBeInTheDocument();
  });

  it('empty state cuando no hay reviews', () => {
    render(withIntl(<ReviewList reviews={[]} reviewsTotalPublished={0} />));
    expect(screen.getByText('Este proveedor aún no tiene reseñas publicadas.')).toBeInTheDocument();
  });
});

describe('US-046 · VendorNotFound (FE-005)', () => {
  it('renderiza `<h1>` + CTA al directorio', () => {
    render(withIntl(<VendorNotFound />));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Proveedor no encontrado');
    const link = screen.getByRole('link', { name: 'Volver al directorio' });
    expect(link.getAttribute('href')).toBe('/vendors');
  });
});
