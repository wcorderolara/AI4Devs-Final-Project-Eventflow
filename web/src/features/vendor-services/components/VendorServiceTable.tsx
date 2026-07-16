'use client';

// Tabla semántica de VendorService (US-044 / FE-001).
// A11Y: `<th scope="col">`, contador "N/50" con `aria-live="polite"`, botones con `aria-label`.
// Mobile-first: la tabla mantiene layout tabular en desktop y colapsa a cards apiladas en
// mobile mediante utilidades Tailwind. El toggle de reactivación consume `useUpdateVendorService`.
import { useTranslations } from 'next-intl';
import type { VendorServiceView } from '../api/vendorServicesApi.types';
import { useUpdateVendorService } from '../hooks/vendorServicesQueries';

const ACTIVE_LIMIT = 50;

export interface VendorServiceTableProps {
  items: VendorServiceView[];
  onRequestDeactivate: (service: VendorServiceView) => void;
  onRequestCreate: () => void;
  isLoading: boolean;
  error?: Error | null;
}

export function VendorServiceTable({
  items,
  onRequestDeactivate,
  onRequestCreate,
  isLoading,
  error,
}: VendorServiceTableProps): JSX.Element {
  const t = useTranslations('vendor.services');
  const activeCount = items.filter((it) => it.isActive).length;
  const reactivate = useUpdateVendorService();

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="p-6 text-neutral-500">
        {t('table.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
        {t('table.error')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className="text-sm text-neutral-700"
          data-testid="vendor-services-counter"
        >
          {t('counter.value', { active: activeCount, max: ACTIVE_LIMIT })}
        </p>
        <button
          type="button"
          onClick={onRequestCreate}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500"
        >
          {t('actions.create')}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded border border-dashed border-neutral-300 p-8 text-center text-neutral-600">
          {t('empty')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <caption className="sr-only">{t('table.caption')}</caption>
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {t('table.headers.packageName')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('table.headers.basePrice')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('table.headers.currency')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('table.headers.status')}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {t('table.headers.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((service) => (
                <tr key={service.id} className="border-t border-neutral-200">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    <div>{service.packageName}</div>
                    <div className="mt-1 text-xs text-neutral-500 line-clamp-2">
                      {service.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{service.basePrice}</td>
                  <td className="px-4 py-3">{service.currencyCode}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        service.isActive
                          ? 'inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'
                          : 'inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700'
                      }
                    >
                      {service.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {service.isActive ? (
                      <button
                        type="button"
                        onClick={() => onRequestDeactivate(service)}
                        aria-label={t('actions.deactivateAria', { name: service.packageName })}
                        className="text-sm font-semibold text-red-700 hover:text-red-900 focus:outline-none focus:underline"
                      >
                        {t('actions.deactivate')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          reactivate.mutate({ id: service.id, input: { is_active: true } });
                        }}
                        disabled={reactivate.isPending}
                        aria-label={t('actions.reactivateAria', { name: service.packageName })}
                        className="text-sm font-semibold text-neutral-800 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:underline"
                      >
                        {reactivate.isPending ? t('actions.reactivating') : t('actions.reactivate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
