// PublicVendorProfile — Server Component orquestador (US-046 / FE-003).
// Compone el `<main>` con la jerarquía semántica de la página pública:
// `VendorHero` → `PortfolioGallery` → `PackageList` → `ReviewList`. El `<h1>` vive dentro de
// `VendorHero` (único por página, A11Y). No mantiene estado.
import type { PublicVendorDTO } from '../api/vendorPublicApi.types';
import { VendorHero } from './VendorHero';
import { PortfolioGallery } from './PortfolioGallery';
import { PackageList } from './PackageList';
import { ReviewList } from './ReviewList';

interface Props {
  vendor: PublicVendorDTO;
}

export function PublicVendorProfile({ vendor }: Props) {
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-6">
      <VendorHero vendor={vendor} />
      <PortfolioGallery groups={vendor.portfolio} vendorName={vendor.businessName} />
      <PackageList packages={vendor.packages} />
      <ReviewList reviews={vendor.reviews} reviewsTotalPublished={vendor.reviewsTotalPublished} />
    </article>
  );
}
