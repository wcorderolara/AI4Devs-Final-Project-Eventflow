'use client';

// US-080 / FE-001 — Panel admin del audit log AdminAction. Compone filtros + tabla con
// estado local de filtros (paridad `AdminEventsPanel` de US-078). Sólo lectura arquitectónico:
// no expone mutaciones (AC-03).
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AdminActionsListFilters } from '../api/adminActionsApi.types';
import { AdminActionsFiltersPanel } from './AdminActionsFiltersPanel';
import { AdminActionsTable } from './AdminActionsTable';

const DEFAULT_FILTERS: AdminActionsListFilters = {};

export function AdminActionsPanel(): React.JSX.Element {
  const t = useTranslations('admin.admin-actions.list');
  const [filters, setFilters] = useState<AdminActionsListFilters>(DEFAULT_FILTERS);

  return (
    <section aria-labelledby="admin-actions-title" className="space-y-4">
      <header>
        <h1 id="admin-actions-title" className="text-2xl font-bold">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      <AdminActionsFiltersPanel value={filters} onChange={setFilters} />

      <AdminActionsTable filters={filters} />
    </section>
  );
}
