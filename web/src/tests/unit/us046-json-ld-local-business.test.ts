// US-046 (PB-P1-029 / QA-001) — Unit tests para `buildLocalBusinessLd`.
// Cubre las reglas D2 y §8 Tech Spec:
//   - `image` omitido cuando no hay portfolio.
//   - `aggregateRating` omitido cuando `reviewsCount === 0` o `ratingAvg === null`.
//   - `address.addressLocality` omitido cuando `location.display` vacío.
//   - URL canónica sin doble slash.
import { describe, expect, it } from 'vitest';
import { buildLocalBusinessLd } from '@/features/vendor-public/components/JsonLdLocalBusiness';
import type { PublicVendorDTO } from '@/features/vendor-public/api/vendorPublicApi.types';

const baseVendor: PublicVendorDTO = {
  slug: 'banquetes-el-quetzal',
  businessName: 'Banquetes El Quetzal',
  bio: 'Servicio premium.',
  location: { display: 'Ciudad de Guatemala, Guatemala', code: 'GT-GUA' },
  categories: [{ code: 'catering', name: 'Catering' }],
  ratingAvg: 4.8,
  reviewsCount: 24,
  reviewsTotalPublished: 24,
  packages: [],
  portfolio: [
    { workLabel: 'boda-clasica', thumbnails: ['https://cdn/1.jpg', 'https://cdn/2.jpg'] },
  ],
  reviews: [],
};

describe('US-046 · buildLocalBusinessLd (JSON-LD LocalBusiness)', () => {
  it('emite `@context` y `@type` de schema.org (D2)', () => {
    const ld = buildLocalBusinessLd(baseVendor, 'https://eventflow.test');
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('LocalBusiness');
    expect(ld.name).toBe('Banquetes El Quetzal');
  });

  it('canonicaliza la URL sin doble slash aun si siteUrl trae "/"', () => {
    const ld = buildLocalBusinessLd(baseVendor, 'https://eventflow.test/');
    expect(ld.url).toBe('https://eventflow.test/vendors/banquetes-el-quetzal');
  });

  it('incluye `image` con la primera thumbnail del primer grupo del portfolio', () => {
    const ld = buildLocalBusinessLd(baseVendor, 'https://eventflow.test');
    expect(ld.image).toBe('https://cdn/1.jpg');
  });

  it('OMITE `image` cuando el portfolio está vacío', () => {
    const ld = buildLocalBusinessLd({ ...baseVendor, portfolio: [] }, 'https://eventflow.test');
    expect(ld.image).toBeUndefined();
  });

  it('incluye `aggregateRating` con ratingValue formateado a 1 decimal', () => {
    const ld = buildLocalBusinessLd(baseVendor, 'https://eventflow.test');
    expect(ld.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: 24,
    });
  });

  it('OMITE `aggregateRating` cuando reviewsCount es 0', () => {
    const ld = buildLocalBusinessLd(
      { ...baseVendor, reviewsCount: 0, ratingAvg: null },
      'https://eventflow.test',
    );
    expect(ld.aggregateRating).toBeUndefined();
  });

  it('OMITE `aggregateRating` cuando ratingAvg es null (defensa aunque haya count)', () => {
    const ld = buildLocalBusinessLd(
      { ...baseVendor, reviewsCount: 5, ratingAvg: null },
      'https://eventflow.test',
    );
    expect(ld.aggregateRating).toBeUndefined();
  });

  it('OMITE `address` cuando location.display está vacío', () => {
    const ld = buildLocalBusinessLd(
      { ...baseVendor, location: { display: '', code: null } },
      'https://eventflow.test',
    );
    expect(ld.address).toBeUndefined();
  });

  it('emite `address.addressLocality` cuando hay display', () => {
    const ld = buildLocalBusinessLd(baseVendor, 'https://eventflow.test');
    expect(ld.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Ciudad de Guatemala, Guatemala',
    });
  });
});
