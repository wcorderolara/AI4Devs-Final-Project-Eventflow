// PackageList — Server Component (US-046 / FE-003).
// Renderiza los paquetes (`VendorService` activos) con nombre, precio, moneda y descripción.
// Precio se formatea via `Money` cuando existe el helper; usamos formato numérico simple
// aquí para no acoplar el Server Component al hook del cliente.
import { useTranslations } from 'next-intl';
import type { PublicVendorPackageDTO } from '../api/vendorPublicApi.types';

interface Props {
  packages: PublicVendorPackageDTO[];
}

function formatPrice(basePrice: string, currency: string): string {
  const asNumber = Number(basePrice);
  if (!Number.isFinite(asNumber)) return `${basePrice} ${currency}`;
  const formatted = new Intl.NumberFormat('es-419', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(asNumber);
  return formatted;
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
              {formatPrice(pkg.basePrice, pkg.currencyCode)}
            </p>
            <p className="text-sm text-neutral-700">{pkg.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
