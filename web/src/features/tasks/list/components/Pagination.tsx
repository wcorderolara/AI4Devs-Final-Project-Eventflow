'use client';

// US-027 (PB-P1-018 / FE-003) — Paginación accesible (`<nav aria-label>`).
// Actualiza `?page=` preservando el resto de filtros. Prev deshabilitado en page 1; Next
// deshabilitado cuando `page >= totalPages`.
//
// PB-P2-031: deja de pintar sus propios botones y compone `Pagination` del design system. La
// paginación por URL sigue viviendo aquí —la primitiva es controlada y no conoce rutas—, así
// que el contrato con `EventChecklistPage` no cambia.
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Pagination as SharedPagination } from '@/shared/design-system';

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
    <SharedPagination
      ariaLabel={t('label')}
      page={page}
      totalPages={totalPages}
      onPageChange={go}
      previousLabel={t('prev')}
      nextLabel={t('next')}
      summary={t('pageOf', { page, totalPages })}
      live
    />
  );
}
