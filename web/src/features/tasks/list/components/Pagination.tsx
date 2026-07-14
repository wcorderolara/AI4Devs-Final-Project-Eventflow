'use client';

// US-027 (PB-P1-018 / FE-003) — Paginación accesible (`<nav aria-label>`).
// Actualiza `?page=` preservando el resto de filtros. Prev deshabilitado en page 1; Next
// deshabilitado cuando `page >= totalPages`.
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface Props {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: Props): JSX.Element | null {
  const router = useRouter();
  const search = useSearchParams();
  const t = useTranslations('checklist.pagination');
  if (totalPages <= 1) return null;

  function go(target: number): void {
    const params = new URLSearchParams(search.toString());
    if (target <= 1) params.delete('page');
    else params.set('page', String(target));
    router.push(`?${params.toString()}`);
  }

  return (
    <nav aria-label={t('label')} className="pagination">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label={t('prev')}
      >
        {t('prev')}
      </button>
      <span aria-live="polite" className="pagination__current">
        {t('pageOf', { page, totalPages })}
      </span>
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label={t('next')}
      >
        {t('next')}
      </button>
    </nav>
  );
}
