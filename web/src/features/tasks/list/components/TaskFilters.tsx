'use client';

// US-027 (PB-P1-018 / FE-003) — Barra de filtros URL-driven.
// Cada cambio actualiza la URL con `useSearchParams`/`useRouter` (shareability + back button).
// Filtros: status (enum), aiGenerated (bool), categoryCode (string). `<fieldset>` + `<legend>`
// para agrupación semántica accesible; `<details>` en mobile para colapso.
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { SearchInput, Select } from '@/shared/design-system/forms';
import { STATUS_OPTIONS } from '../schema/filter-options';

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value === undefined || value === '') params.delete(key);
  else params.set(key, value);
  // Al cambiar filtros volvemos a la página 1 para no dejar el usuario en una página vacía.
  params.delete('page');
}

export function TaskFilters(): JSX.Element {
  const router = useRouter();
  const search = useSearchParams();
  const t = useTranslations('checklist');

  const status = search.get('status') ?? '';
  const aiGenerated = search.get('aiGenerated') ?? '';
  const categoryCode = search.get('categoryCode') ?? '';

  function updateParam(key: string, value: string): void {
    const params = new URLSearchParams(search.toString());
    setOrDelete(params, key, value || undefined);
    router.push(`?${params.toString()}`);
  }

  // Las clases BEM (`task-filters`, `task-filters__field`) no tenían hoja de estilo: los tres
  // controles salían pegados al texto de su label en una sola línea. Se componen ahora con
  // `Select` / `Input` del design system sobre una rejilla responsive.
  return (
    <fieldset className="min-w-0 rounded-card border border-subtle bg-surface-subtle p-4 sm:p-6">
      <legend className="sr-only">{t('filters.legend')}</legend>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="font-ui text-caption uppercase tracking-ef-wide text-secondary">{t('filters.status.label')}</span>
          <Select
            value={status}
            selectSize="md"
            onChange={(e: ChangeEvent<HTMLSelectElement>) => updateParam('status', e.target.value)}
          >
            <option value="">{t('filters.status.any')}</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`status.${opt}`)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-ui text-caption uppercase tracking-ef-wide text-secondary">
            {t('filters.aiGenerated.label')}
          </span>
          <Select
            value={aiGenerated}
            selectSize="md"
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              updateParam('aiGenerated', e.target.value)
            }
          >
            <option value="">{t('filters.aiGenerated.any')}</option>
            <option value="true">{t('filters.aiGenerated.true')}</option>
            <option value="false">{t('filters.aiGenerated.false')}</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-ui text-caption uppercase tracking-ef-wide text-secondary">
            {t('filters.categoryCode.label')}
          </span>
          <SearchInput
            inputSize="md"
            value={categoryCode}
            placeholder={t('filters.categoryCode.placeholder')}
            clearLabel={t('filters.categoryCode.clear')}
            onClear={() => updateParam('categoryCode', '')}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              updateParam('categoryCode', e.target.value.trim())
            }
          />
        </label>
      </div>
    </fieldset>
  );
}
