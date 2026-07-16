'use client';

// Card del directorio (US-045 / FE-002, A11Y). Cada card usa `aria-labelledby` apuntando al
// nombre comercial; el rating se anuncia con `<abbr>`/aria-label para lectores de pantalla.
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { VendorCardDTO } from '../api/vendorDirectoryApi.types';

export interface VendorCardProps {
  vendor: VendorCardDTO;
}

export function VendorCard({ vendor }: VendorCardProps): JSX.Element {
  const t = useTranslations('vendor.directory.card');
  const titleId = useId();
  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <header>
        <h3 id={titleId} className="text-base font-semibold text-neutral-900">
          {vendor.businessName}
        </h3>
        {vendor.locationCode !== null ? (
          <p className="text-sm text-neutral-500">{vendor.locationCode}</p>
        ) : null}
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-neutral-500">{t('rating')}</dt>
          <dd>
            {vendor.ratingAvg === null ? (
              <span className="text-neutral-500">{t('noRating')}</span>
            ) : (
              <span aria-label={t('ratingAria', { avg: vendor.ratingAvg, count: vendor.reviewsCount })}>
                {`${vendor.ratingAvg.toFixed(2)} ★ (${vendor.reviewsCount})`}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">{t('categories')}</dt>
          <dd>{vendor.categories.join(', ') || t('noCategories')}</dd>
        </div>
        {vendor.priceRange !== null ? (
          <div className="col-span-2">
            <dt className="text-neutral-500">{t('priceRange')}</dt>
            <dd>
              {`${vendor.priceRange.min} – ${vendor.priceRange.max} ${vendor.priceRange.currency}`}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
