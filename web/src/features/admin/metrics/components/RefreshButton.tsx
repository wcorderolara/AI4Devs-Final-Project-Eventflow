'use client';

// US-079 (PB-P1-045) / FE-004 — Botón "Actualizar" que dispara `refetch()`. El cache backend
// TTL 60s dicta si la respuesta es cache hit o miss; el refetch client-side sólo bypass del
// `staleTime` local (Tech Spec §7 / §8).
import { useTranslations } from 'next-intl';

interface Props {
  onClick: () => void;
  isRefetching: boolean;
}

export function RefreshButton({ onClick, isRefetching }: Props): React.JSX.Element {
  const t = useTranslations('admin.metrics.actions');
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRefetching}
      className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
      aria-busy={isRefetching}
      aria-label={t(isRefetching ? 'refreshing' : 'refresh')}
    >
      <span aria-hidden="true">{'↻'}</span>
      <span>{t(isRefetching ? 'refreshing' : 'refresh')}</span>
    </button>
  );
}
