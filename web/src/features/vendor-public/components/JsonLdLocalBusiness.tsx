// JsonLdLocalBusiness — Server Component (US-046 / FE-002).
// Emite `<script type="application/ld+json">` con schema.org `LocalBusiness` (D2).
// Reglas de omisión (§8 Tech Spec):
//   - `image` se omite si el vendor no tiene portfolio (evita array vacío inválido).
//   - `aggregateRating` se omite si `reviewsCount === 0` o `ratingAvg` es null
//     (schema.org rechaza `AggregateRating` sin `ratingValue`).
// Seguridad: el payload se serializa con `JSON.stringify` (sin HTML embebido) e inyectamos
// `<` como `<` para evitar el "clásico" `</script>` breakout.
import type { PublicVendorDTO } from '../api/vendorPublicApi.types';

interface Props {
  vendor: PublicVendorDTO;
  siteUrl: string;
}

interface AggregateRating {
  '@type': 'AggregateRating';
  ratingValue: string;
  reviewCount: number;
}

interface LocalBusinessJsonLd {
  '@context': 'https://schema.org';
  '@type': 'LocalBusiness';
  name: string;
  description: string;
  url: string;
  address?: {
    '@type': 'PostalAddress';
    addressLocality: string;
  };
  image?: string;
  aggregateRating?: AggregateRating;
}

export function buildLocalBusinessLd(vendor: PublicVendorDTO, siteUrl: string): LocalBusinessJsonLd {
  const ld: LocalBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: vendor.businessName,
    description: vendor.bio,
    url: `${siteUrl.replace(/\/$/, '')}/vendors/${vendor.slug}`,
  };
  if (vendor.location.display.length > 0) {
    ld.address = {
      '@type': 'PostalAddress',
      addressLocality: vendor.location.display,
    };
  }
  const firstThumbnail = vendor.portfolio[0]?.thumbnails[0];
  if (firstThumbnail) {
    ld.image = firstThumbnail;
  }
  if (vendor.reviewsCount > 0 && vendor.ratingAvg !== null) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: vendor.ratingAvg.toFixed(1),
      reviewCount: vendor.reviewsCount,
    };
  }
  return ld;
}

function safeSerialize(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function JsonLdLocalBusiness({ vendor, siteUrl }: Props) {
  const ld = buildLocalBusinessLd(vendor, siteUrl);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeSerialize(ld) }}
    />
  );
}
