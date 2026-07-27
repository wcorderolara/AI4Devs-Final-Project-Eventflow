'use client';

// Card del directorio (US-045 / FE-002, A11Y). Cada card usa `aria-labelledby` apuntando al
// nombre comercial; el rating se anuncia con `<abbr>`/aria-label para lectores de pantalla.
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useId } from 'react';
import type { VendorCardDTO } from '../api/vendorDirectoryApi.types';

export interface VendorCardProps {
  vendor: VendorCardDTO;
  /**
   * Convierte el título en un enlace al perfil público (`/vendors/:slug`).
   *
   * Sólo el título, no la card entera: dentro de la card hay más texto (rating, categorías) y
   * envolverlo todo produciría un nombre accesible larguísimo al recorrer los enlaces de la
   * página. Con el título como enlace, el destino se anuncia con el nombre del negocio.
   */
  linkToProfile?: boolean;
  /**
   * Nivel del encabezado del nombre comercial. Debe encajar en la jerarquía de la página que
   * monta la rejilla: si el `h1` es el título del directorio y no hay `h2` intermedio, las cards
   * son `h2` — saltar de `h1` a `h3` rompe el recorrido por encabezados (WCAG 1.3.1).
   * Por defecto `3`, que es lo que ya usaba el directorio autenticado.
   */
  headingLevel?: 2 | 3 | 4;
}

export function VendorCard({
  vendor,
  linkToProfile = false,
  headingLevel = 3,
}: VendorCardProps): JSX.Element {
  const t = useTranslations('vendor.directory.card');
  const titleId = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <header>
        <Heading id={titleId} className="text-base font-semibold text-neutral-900">
          {linkToProfile ? (
            <Link href={`/vendors/${vendor.slug}`} className="focus-ring rounded hover:underline">
              {vendor.businessName}
            </Link>
          ) : (
            vendor.businessName
          )}
        </Heading>
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
              <span
                aria-label={t('ratingAria', { avg: vendor.ratingAvg, count: vendor.reviewsCount })}
              >
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
