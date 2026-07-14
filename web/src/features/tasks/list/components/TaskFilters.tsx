'use client';

// US-027 (PB-P1-018 / FE-003) — Barra de filtros URL-driven.
// Cada cambio actualiza la URL con `useSearchParams`/`useRouter` (shareability + back button).
// Filtros: status (enum), aiGenerated (bool), categoryCode (string). `<fieldset>` + `<legend>`
// para agrupación semántica accesible; `<details>` en mobile para colapso.
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
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

  return (
    <fieldset className="task-filters">
      <legend>{t('filters.legend')}</legend>
      <label className="task-filters__field">
        <span>{t('filters.status.label')}</span>
        <select
          value={status}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => updateParam('status', e.target.value)}
        >
          <option value="">{t('filters.status.any')}</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`status.${opt}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="task-filters__field">
        <span>{t('filters.aiGenerated.label')}</span>
        <select
          value={aiGenerated}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => updateParam('aiGenerated', e.target.value)}
        >
          <option value="">{t('filters.aiGenerated.any')}</option>
          <option value="true">{t('filters.aiGenerated.true')}</option>
          <option value="false">{t('filters.aiGenerated.false')}</option>
        </select>
      </label>
      <label className="task-filters__field">
        <span>{t('filters.categoryCode.label')}</span>
        <input
          type="text"
          value={categoryCode}
          placeholder={t('filters.categoryCode.placeholder')}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateParam('categoryCode', e.target.value.trim())
          }
        />
      </label>
    </fieldset>
  );
}
