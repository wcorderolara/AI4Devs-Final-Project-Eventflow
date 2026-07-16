'use client';

// QuoteRequestDetail (US-051 / FE-002).
// Orquestador cliente del detalle vendor: consume `useVendorQrDetail(id)` y, si `status='sent'`,
// dispara `useMarkVendorQrViewed(id)` en `useEffect` con dependency [id, status]. Anuncia la
// transición vía `aria-live="polite"` en el StatusBadge.
//
// Estados renderizados:
//   - Loading: skeleton con el mismo espacio del layout final (evita layout shift).
//   - Error 404: propaga al `not-found` de Next mediante `notFound()`.
//   - Error auth: mensaje traducido.
//   - Success: EventBriefSnapshot + StatusBadge.
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { useVendorQrDetail, useMarkVendorQrViewed } from '../hooks/vendorQrQueries';
import { StatusBadge } from './StatusBadge';
import { EventBriefSnapshot } from './EventBriefSnapshot';

export interface QuoteRequestDetailProps {
  id: string;
}

export function QuoteRequestDetail({ id }: QuoteRequestDetailProps): JSX.Element {
  const t = useTranslations('vendor.qr.detail');
  const detail = useVendorQrDetail(id);
  const markViewed = useMarkVendorQrViewed(id);
  // Guard para evitar disparar el POST dos veces en el mismo mount (React StrictMode / re-renders).
  const dispatched = useRef(false);

  useEffect(() => {
    if (!detail.data) return;
    if (detail.data.status !== 'sent') return;
    if (dispatched.current) return;
    if (markViewed.isPending || markViewed.isSuccess) return;
    dispatched.current = true;
    markViewed.mutate();
  }, [detail.data, markViewed]);

  if (detail.isLoading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <div className="h-6 w-24 animate-pulse rounded bg-neutral-200" />
        <div className="h-24 w-full animate-pulse rounded bg-neutral-200" />
      </div>
    );
  }

  if (detail.isError) {
    if (detail.error.status === 404) {
      notFound();
    }
    return (
      <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {t('error.generic')}
      </div>
    );
  }

  const data = detail.data;
  if (!data) return <div />;

  return (
    <article className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {t('createdAt', { date: data.createdAt })}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </header>
      <EventBriefSnapshot brief={data.brief} />
    </article>
  );
}
