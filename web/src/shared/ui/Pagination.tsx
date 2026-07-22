'use client';

// Paginador reutilizable para listados admin (US-users + tablas afines).
// - Selector de page size: 10 / 25 / 50 / 100. Default recomendado por consumers: 10.
// - Modo cursor keyset (prev/next) con stack interno gestionado por el consumer.
// - Aislado de la lógica de fetch: recibe callbacks controlados y estado derivado.

import { useTranslations } from 'next-intl';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;

export interface PageSizeSelectorProps {
  value: PageSize;
  onChange: (size: PageSize) => void;
}

/** Selector aislado — para tablas con paginación "Cargar más" que solo necesitan el tamaño. */
export function PageSizeSelector({ value, onChange }: PageSizeSelectorProps): React.JSX.Element {
  const t = useTranslations('common.pagination');
  return (
    <label className="flex items-center gap-2 text-xs text-neutral-600">
      {t('pageSize')}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as PageSize)}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800"
        aria-label={t('pageSizeAria')}
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface PaginationProps {
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentCount: number;
}

export function Pagination({
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentCount,
}: PaginationProps): React.JSX.Element {
  const t = useTranslations('common.pagination');

  return (
    <nav
      aria-label={t('label')}
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2"
    >
      <label className="flex items-center gap-2 text-xs text-neutral-600">
        {t('pageSize')}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800"
          aria-label={t('pageSizeAria')}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <span className="text-xs text-neutral-500">
        {t('showing', { count: currentCount })}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {t('prev')}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {t('next')}
        </button>
      </div>
    </nav>
  );
}
