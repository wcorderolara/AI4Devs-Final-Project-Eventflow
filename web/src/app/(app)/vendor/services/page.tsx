'use client';

// Página `/vendor/services` (US-044 / PB-P1-027 / FE-001).
// Renderiza la tabla del catálogo del vendor + create dialog + deactivate dialog. La lista y las
// mutations viven en `useVendorServicesList` / `useCreateVendorService` / etc.
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { vendorProfileApi } from '@/features/vendor-profile';
import {
  CreateServiceDialog,
  DeactivateServiceDialog,
  VendorServiceTable,
  useVendorServicesList,
  type ServiceCategoryOption,
  type VendorServiceView,
} from '@/features/vendor-services';

const CATEGORIES_QUERY_KEY = ['service-categories'] as const;

export default function VendorServicesPage(): JSX.Element {
  const t = useTranslations('vendor.services');
  const list = useVendorServicesList();
  const categories = useQuery<ServiceCategoryOption[], Error>({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => vendorProfileApi.listServiceCategories(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<VendorServiceView | null>(null);

  const categoriesData = useMemo(() => categories.data ?? [], [categories.data]);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-2 text-neutral-600">{t('subtitle')}</p>
      </header>

      <VendorServiceTable
        items={list.data ?? []}
        isLoading={list.isLoading}
        error={list.error ?? null}
        onRequestCreate={() => setCreateOpen(true)}
        onRequestDeactivate={(svc) => setDeactivateTarget(svc)}
      />

      <CreateServiceDialog
        isOpen={createOpen}
        categories={categoriesData}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />

      {deactivateTarget ? (
        <DeactivateServiceDialog
          isOpen={deactivateTarget !== null}
          serviceId={deactivateTarget.id}
          packageName={deactivateTarget.packageName}
          onClose={() => setDeactivateTarget(null)}
          onDeactivated={() => setDeactivateTarget(null)}
        />
      ) : null}
    </section>
  );
}
