// VendorHero — Server Component (US-046 / FE-003).
// Título público del vendor: nombre + categorías + location display + rating agregado.
// `<h1>` único de la página (A11Y: encabezado semántico) declarado aquí.
import { useTranslations } from 'next-intl';
import type { PublicVendorDTO } from '../api/vendorPublicApi.types';

interface Props {
  vendor: PublicVendorDTO;
}

export function VendorHero({ vendor }: Props) {
  const t = useTranslations('publicVendor');
  const hasRating = vendor.reviewsCount > 0 && vendor.ratingAvg !== null;

  return (
    <header className="flex flex-col gap-3 border-b border-neutral-200 pb-6">
      <h1 className="text-3xl font-bold text-neutral-900">{vendor.businessName}</h1>
      {vendor.location.display.length > 0 && (
        <p className="text-sm text-neutral-600">{vendor.location.display}</p>
      )}
      {vendor.categories.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('categories.label')}>
          {vendor.categories.map((c) => (
            <li
              key={c.code}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700"
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
      {hasRating ? (
        <p className="text-sm text-neutral-700" aria-label={t('rating.label')}>
          <span className="font-semibold" aria-hidden="true">
            {`★ ${vendor.ratingAvg!.toFixed(1)}`}
          </span>{' '}
          <span>{t('rating.summary', { count: vendor.reviewsCount })}</span>
        </p>
      ) : (
        <p className="text-sm text-neutral-500">{t('rating.empty')}</p>
      )}
      {vendor.bio.length > 0 && (
        <p className="max-w-3xl text-base text-neutral-800">{vendor.bio}</p>
      )}
    </header>
  );
}
