// PortfolioGallery — Server Component (US-046 / FE-003).
// Renderiza los grupos de portfolio (por `workLabel`) con `alt` descriptivo para A11Y.
// Se omite cuando el vendor no tiene portfolio activo (empty state manejado por el padre).
import { useTranslations } from 'next-intl';
import type { PublicVendorPortfolioGroupDTO } from '../api/vendorPublicApi.types';

interface Props {
  groups: PublicVendorPortfolioGroupDTO[];
  vendorName: string;
}

export function PortfolioGallery({ groups, vendorName }: Props) {
  const t = useTranslations('publicVendor.portfolio');

  if (groups.length === 0) {
    return (
      <section aria-labelledby="portfolio-heading" className="flex flex-col gap-2">
        <h2 id="portfolio-heading" className="text-xl font-semibold text-neutral-900">
          {t('title')}
        </h2>
        <p className="text-sm text-neutral-500">{t('empty')}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="portfolio-heading" className="flex flex-col gap-6">
      <h2 id="portfolio-heading" className="text-xl font-semibold text-neutral-900">
        {t('title')}
      </h2>
      {groups.map((group) => (
        <div key={group.workLabel} className="flex flex-col gap-3">
          <h3 className="text-base font-medium text-neutral-800">{group.workLabel}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {group.thumbnails.map((url, idx) => (
              <li key={`${group.workLabel}-${idx}`} className="overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={t('imageAlt', { vendor: vendorName, work: group.workLabel, index: idx + 1 })}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
