import { Images } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PublicVendorPortfolioGroupDTO } from '../api/vendorPublicApi.types';

interface Props {
  groups: PublicVendorPortfolioGroupDTO[];
  vendorName: string;
}

/**
 * Sólo se pinta una imagen si su URL es servible por el navegador (absoluta o desde la raíz).
 * En el MVP el portafolio guarda claves relativas al almacenamiento (`seed/<id>/foto.jpg`) y la
 * descarga pública es una US futura: renderizarlas daría imágenes rotas.
 */
function isServableUrl(url: string): boolean {
  return /^https?:\/\//.test(url) || url.startsWith('/');
}

/** `xv-anos-2024` → `XV años 2024`: etiquetas de trabajo legibles para el visitante. */
function humanizeWorkLabel(label: string): string {
  const words = label
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => (w.toLowerCase() === 'xv' ? 'XV' : w.toLowerCase() === 'anos' ? 'años' : w));
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function PortfolioGallery({ groups, vendorName }: Props) {
  const t = useTranslations('publicVendor.portfolio');
  const hasServableImages = groups.some((g) => g.thumbnails.some(isServableUrl));

  return (
    <section aria-labelledby="portfolio-heading" className="flex flex-col gap-6 border-t border-subtle pt-10">
      <h2 id="portfolio-heading" className="font-display text-[2rem] font-medium leading-tight text-primary">
        {t('title')}
      </h2>

      {groups.length === 0 ? <p className="font-body text-body-md text-muted">{t('empty')}</p> : null}

      {groups.length > 0 && hasServableImages
        ? groups.map((group) => {
            const images = group.thumbnails.filter(isServableUrl);
            if (images.length === 0) return null;
            return (
              <div key={group.workLabel} className="flex flex-col gap-3">
                <h3 className="font-heading text-body-lg font-semibold text-primary">
                  {humanizeWorkLabel(group.workLabel)}
                </h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((url, idx) => (
                    <li key={`${group.workLabel}-${idx}`} className="aspect-[4/5] overflow-hidden bg-surface-subtle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={t('imageAlt', { vendor: vendorName, work: humanizeWorkLabel(group.workLabel), index: idx + 1 })}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        : null}

      {groups.length > 0 && !hasServableImages ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {groups.map((group) => (
              <li key={group.workLabel} className="flex items-center gap-4 border border-subtle bg-surface p-5">
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center bg-surface-subtle text-muted"
                >
                  <Images className="h-icon-md w-icon-md" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-body-md font-semibold text-primary">
                    {humanizeWorkLabel(group.workLabel)}
                  </p>
                  <p className="font-ui text-body-sm text-secondary">
                    {t('photos', { count: group.thumbnails.length })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="font-ui text-body-sm text-muted">{t('imagesUnavailable')}</p>
        </>
      ) : null}
    </section>
  );
}
