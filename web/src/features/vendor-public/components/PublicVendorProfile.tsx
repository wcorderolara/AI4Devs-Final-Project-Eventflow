// PublicVendorProfile — Server Component orquestador (US-046 / FE-003 + US-066 / FE-001).
// Compone el `<main>` con la jerarquía semántica de la página pública:
// `VendorHero` → `PortfolioGallery` → `PackageList` → `VendorReviewsSection`. El `<h1>` vive
// dentro de `VendorHero` (único por página, A11Y). No mantiene estado.
//
// US-066 (PB-P1-039): la sección de reseñas se sirve ahora desde el endpoint paginado
// `GET /vendors/:id/reviews` mediante un client component (`VendorReviewsSection`) que aplica
// cursor pagination + "Cargar más". El summary inicial (`ratingAvg`/`reviewsCount`) proviene
// del SSR del perfil público (US-046) para pintar inmediatamente sin esperar al primer fetch.
import type { PublicVendorDTO } from '../api/vendorPublicApi.types';
import { VendorReviewsSection } from '@/features/reviews';
import { VendorHero } from './VendorHero';
import { PortfolioGallery } from './PortfolioGallery';
import { PackageList } from './PackageList';

interface Props {
  vendor: PublicVendorDTO;
}

export function PublicVendorProfile({ vendor }: Props) {
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-6">
      <VendorHero vendor={vendor} />
      <PortfolioGallery groups={vendor.portfolio} vendorName={vendor.businessName} />
      <PackageList packages={vendor.packages} />
      <VendorReviewsSection
        vendorId={vendor.id}
        initialVendor={{
          ratingAvg: vendor.ratingAvg,
          reviewsCount: vendor.reviewsCount,
        }}
      />
    </article>
  );
}
