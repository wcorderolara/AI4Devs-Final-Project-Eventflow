import { useTranslations } from 'next-intl';
import { Money } from '@/shared/i18n';
import type { PublicVendorPackageDTO } from '../api/vendorPublicApi.types';

interface Props {
  packages: PublicVendorPackageDTO[];
}

/**
 * Paquetes como una **carta de precios**: nombre a la izquierda, línea punteada y precio a la
 * derecha, descripción debajo. Es el formato en que los proveedores de eventos de la región
 * entregan sus precios impresos, y se lee de un vistazo sin cajas.
 */
export function PackageList({ packages }: Props) {
  const t = useTranslations('publicVendor.packages');

  return (
    <section aria-labelledby="packages-heading" className="flex flex-col gap-6 border-t border-subtle pt-10">
      <h2 id="packages-heading" className="font-display text-[2rem] font-medium leading-tight text-primary">
        {t('title')}
      </h2>

      {packages.length === 0 ? (
        <p className="font-body text-body-md text-muted">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-7">
          {packages.map((pkg, idx) => {
            const amount = Number(pkg.basePrice);
            return (
              <li key={`${pkg.serviceCategoryCode}-${idx}`}>
                <div className="flex items-baseline gap-3">
                  <h3 className="font-heading text-body-lg font-semibold text-primary">{pkg.packageName}</h3>
                  <span aria-hidden="true" className="min-w-8 flex-1 translate-y-[-0.25rem] border-b border-dotted border-strong" />
                  <p className="shrink-0 font-display text-[1.375rem] font-medium tabular-nums text-link">
                    {Number.isFinite(amount) ? (
                      <Money amount={amount} currency={pkg.currencyCode} />
                    ) : (
                      `${pkg.basePrice} ${pkg.currencyCode}`
                    )}
                  </p>
                </div>
                {pkg.description ? (
                  <p className="mt-2 max-w-[62ch] font-body text-body-md text-secondary">{pkg.description}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
