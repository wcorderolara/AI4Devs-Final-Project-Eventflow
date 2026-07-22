'use client';

// US-078 / FE-001 — Panel admin de eventos. Compone filtros + tabla con estado local de filtros
// (paridad `VendorModerationTable`). El panel es sólo lectura arquitectónico: no expone
// mutaciones (AC-03).
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DEFAULT_PAGE_SIZE, PageSizeSelector, type PageSize } from '@/shared/ui';
import type { AdminEventsListFilters } from '../api/adminEventsApi.types';
import { AdminEventFiltersPanel } from './AdminEventFiltersPanel';
import { AdminEventTable } from './AdminEventTable';

const DEFAULT_FILTERS: AdminEventsListFilters = { pageSize: DEFAULT_PAGE_SIZE };

export function AdminEventsPanel(): React.JSX.Element {
  const t = useTranslations('admin.events.list');
  const [filters, setFilters] = useState<AdminEventsListFilters>(DEFAULT_FILTERS);

  return (
    <section aria-labelledby="admin-events-title" className="space-y-4">
      <header>
        <h1 id="admin-events-title" className="text-2xl font-bold">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      <AdminEventFiltersPanel value={filters} onChange={setFilters} />

      <div className="flex justify-end">
        <PageSizeSelector
          value={(filters.pageSize ?? DEFAULT_PAGE_SIZE) as PageSize}
          onChange={(size) => setFilters((f) => ({ ...f, pageSize: size }))}
        />
      </div>

      <AdminEventTable filters={filters} />
    </section>
  );
}
