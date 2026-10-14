'use client';

import { MapPin, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useId } from 'react';
import { Money } from '@/shared/i18n';
import type { VendorCardDTO } from '../api/vendorDirectoryApi.types';
import { CategoryStamp } from './categoryVisuals';

export interface VendorCardProps {
  vendor: VendorCardDTO;
  /**
   * Enlaza la card al perfil público (`/vendors/{slug}`). Sólo cuando el proveedor tiene slug:
   * los perfiles legacy previos a US-040 no tienen página pública.
   */
  linkToProfile?: boolean;
  headingLevel?: 2 | 3 | 4;
}

/** "Ciudad, Región, País" → "Ciudad, País": la región casi siempre repite información. */
function shortPlace(display: string | null | undefined): string | null {
  if (!display) return null;
  const parts = display.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');
  return `${parts[0]}, ${parts[parts.length - 1]}`;
}

/**
 * Tarjeta de presentación del proveedor: sello de su categoría, nombre en display, ciudad
 * legible y las tres cosas que un organizador mira para decidir si abrir el perfil —qué ofrece,
 * qué dicen de él y desde cuánto cobra—. Nunca muestra códigos internos (`GT-GUA`, `catering`).
 */
export function VendorCard({
  vendor,
  linkToProfile = false,
  headingLevel = 3,
}: VendorCardProps): React.JSX.Element {
  const t = useTranslations('vendor.directory.card');
  const titleId = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const profileHref =
    linkToProfile && vendor.slug ? `/vendors/${encodeURIComponent(vendor.slug)}` : null;

  const categories =
    vendor.categoryLabels && vendor.categoryLabels.length > 0
      ? vendor.categoryLabels
      : vendor.categories.map((code) => ({ code, name: code }));
  const place = shortPlace(vendor.locationDisplay) ?? vendor.locationCode;
  const minPrice = vendor.priceRange ? Number(vendor.priceRange.min) : Number.NaN;

  return (
    <article
      aria-labelledby={titleId}
      className={`group relative flex h-full flex-col overflow-hidden border border-subtle bg-surface p-6${
        profileHref
          ? ' transition-[border-color,box-shadow] duration-fast ease-standard hover:border-strong hover:shadow-surface-raised motion-reduce:transition-none'
          : ''
      }`}
    >
      {vendor.thumbnailUrl ? (
        // Portada: la primera foto del portafolio, a sangre, con el sello montado encima.
        <div className="relative -mx-6 -mt-6 mb-2">
          <div className="aspect-[4/3] overflow-hidden bg-surface-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vendor.thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-slow ease-standard group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          </div>
          <CategoryStamp code={categories[0]?.code} className="absolute -bottom-5 left-6 bg-surface" />
        </div>
      ) : (
        <CategoryStamp code={categories[0]?.code} />
      )}

      <Heading
        id={titleId}
        className="mt-5 font-display text-[1.5rem] font-medium leading-tight text-primary"
      >
        {profileHref ? (
          <Link
            href={profileHref}
            className="focus-ring after:absolute after:inset-0 after:content-[''] hover:text-link"
          >
            {vendor.businessName}
          </Link>
        ) : (
          vendor.businessName
        )}
      </Heading>

      {place ? (
        <p className="mt-2 flex items-center gap-1.5 font-ui text-body-sm text-secondary">
          <MapPin aria-hidden="true" className="h-icon-sm w-icon-sm shrink-0 text-muted" />
          {place}
        </p>
      ) : null}

      <p className="mb-5 mt-4 font-ui text-body-sm text-primary">
        {categories.length > 0 ? categories.map((c) => c.name).join(', ') : t('noCategories')}
      </p>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-subtle pt-4">
        {vendor.ratingAvg === null ? (
          <p className="font-ui text-body-sm text-muted">{t('noRating')}</p>
        ) : (
          <p className="flex items-center gap-1.5 font-ui text-body-sm text-primary">
            <span className="sr-only">
              {t('ratingAria', { avg: vendor.ratingAvg.toFixed(1), count: vendor.reviewsCount })}
            </span>
            <Star aria-hidden="true" className="h-icon-sm w-icon-sm fill-current text-cempasuchil-500" />
            <span aria-hidden="true" className="font-semibold tabular-nums">
              {vendor.ratingAvg.toFixed(1)}
            </span>
            <span aria-hidden="true" className="text-secondary">
              {t('reviews', { count: vendor.reviewsCount })}
            </span>
          </p>
        )}
        {vendor.priceRange && Number.isFinite(minPrice) ? (
          <p className="font-ui text-body-sm text-secondary">
            {t.rich('priceFrom', {
              price: () => (
                <span className="font-semibold text-primary">
                  <Money amount={minPrice} currency={vendor.priceRange!.currency as never} />
                </span>
              ),
            })}
          </p>
        ) : null}
      </div>
    </article>
  );
}
