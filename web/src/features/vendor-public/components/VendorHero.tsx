import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CategoryStamp } from '@/features/vendor-directory';
import type { PublicVendorDTO } from '../api/vendorPublicApi.types';

interface Props {
  vendor: PublicVendorDTO;
}

/**
 * Encabezado del perfil público: el sello de su categoría principal y el nombre en display, como
 * la cabecera de una tarjeta de presentación; debajo, dónde trabaja, qué ofrece y qué dicen de él.
 */
export function VendorHero({ vendor }: Props) {
  const t = useTranslations('publicVendor');
  const hasRating = vendor.reviewsCount > 0 && vendor.ratingAvg !== null;

  return (
    <header className="flex flex-col gap-6">
      <Link
        href="/vendors"
        className="focus-ring inline-flex items-center gap-2 self-start font-ui text-body-sm text-secondary hover:text-link"
      >
        <ArrowLeft aria-hidden="true" className="h-icon-sm w-icon-sm" />
        {t('backToDirectory')}
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <CategoryStamp code={vendor.categories[0]?.code} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-[2.75rem] font-medium leading-[1.04] text-primary sm:text-[3.75rem]">
            {vendor.businessName}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-ui text-body-md text-secondary">
            {vendor.location.display.length > 0 ? (
              <p className="flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="h-icon-sm w-icon-sm text-muted" />
                {vendor.location.display}
              </p>
            ) : null}
            {hasRating ? (
              <p className="flex items-center gap-1.5 text-primary">
                <span className="sr-only">{t('rating.label')}:</span>
                <Star aria-hidden="true" className="h-icon-sm w-icon-sm fill-current text-cempasuchil-500" />
                <span className="font-semibold tabular-nums">{vendor.ratingAvg!.toFixed(1)}</span>
                <span className="text-secondary">{t('rating.summary', { count: vendor.reviewsCount })}</span>
              </p>
            ) : (
              <p className="text-muted">{t('rating.empty')}</p>
            )}
          </div>

          {vendor.categories.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label={t('categories.label')}>
              {vendor.categories.map((c) => (
                <li
                  key={c.code}
                  className="rounded-badge border border-default px-3 py-1 font-ui text-body-sm text-primary"
                >
                  {c.name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {vendor.bio.length > 0 ? (
        <p className="max-w-[62ch] border-l-2 border-interactive pl-5 font-body text-body-lg text-primary">
          {vendor.bio}
        </p>
      ) : null}
    </header>
  );
}
