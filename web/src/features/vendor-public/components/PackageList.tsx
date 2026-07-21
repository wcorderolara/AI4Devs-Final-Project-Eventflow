// PackageList — Server Component (US-046 / FE-003).
// Renderiza los paquetes (`VendorService` activos) con nombre, precio, moneda y descripción.
// US-083 (PB-P1-048 / FE-003): el precio pasa por el componente cliente `<Money>` (tooltip ISO
// + aria-label). El Server Component pasa datos serializables; `<Money>` resuelve el locale
// del contexto next-intl del cliente.
import { useTranslations } from 'next-intl';
import { Money } from '@/shared/i18n';
import type { PublicVendorPackageDTO } from '../api/vendorPublicApi.types';

interface Props {
  packages: PublicVendorPackageDTO[];
}

export function PackageList({ packages }: Props) {
  const t = useTranslations('publicVendor.packages');

  if (packages.length === 0) {
    return (
      <section aria-labelledby="packages-heading" className="flex flex-col gap-2">
        <h2 id="packages-heading" className="text-xl font-semibold text-neutral-900">
          {t('title')}
        </h2>
        <p className="text-sm text-neutral-500">{t('empty')}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="packages-heading" className="flex flex-col gap-4">
      <h2 id="packages-heading" className="text-xl font-semibold text-neutral-900">
        {t('title')}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {packages.map((pkg, idx) => (
          <li
            key={`${pkg.serviceCategoryCode}-${idx}`}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4"
          >
            <h3 className="text-base font-semibold text-neutral-900">{pkg.packageName}</h3>
            <p className="text-sm font-medium text-neutral-800">
              {(() => {
                const n = Number(pkg.basePrice);
                return Number.isFinite(n) ? (
                  <Money amount={n} currency={pkg.currencyCode} />
                ) : (
                  `${pkg.basePrice} ${pkg.currencyCode}`
                );
              })()}
            </p>
            <p className="text-sm text-neutral-700">{pkg.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
