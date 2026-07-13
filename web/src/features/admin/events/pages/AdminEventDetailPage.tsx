'use client';

// US-016 / FE-002 — Página de detalle admin de un evento.
// - Loading: skeleton.
// - 404: pantalla "Evento no encontrado" con enlace de retorno.
// - 401/403: mensaje "Sin permisos" (el backend es source of truth de autorización).
// - Success: `AdminEventViewer` con badge + banner condicional.
import Link from 'next/link';
import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AdminEventViewer } from '../components/AdminEventViewer';
import { useAdminEvent } from '../hooks/useAdminEvent';

export function AdminEventDetailPage({ eventId }: { eventId: string }): React.JSX.Element {
  const t = useTranslations('admin.events.detail');
  const { data: event, isLoading, isError, error } = useAdminEvent(eventId);
  const backRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // FE-004: en escenarios error/404 mover foco al botón "Volver al listado" para navegación por teclado.
    if (isError && backRef.current) {
      backRef.current.focus();
    }
  }, [isError]);

  const status =
    isError && typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: number }).status
      : undefined;
  const notFound = status === 404;
  const forbidden = status === 401 || status === 403;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        ref={backRef}
        href="/admin"
        className="text-sm text-neutral-600 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
      >
        {t('backToList')}
      </Link>

      {isLoading ? (
        <div className="space-y-4" aria-hidden data-testid="admin-event-loading">
          <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-200" />
          <div className="h-40 animate-pulse rounded bg-neutral-100" />
        </div>
      ) : null}

      {notFound ? (
        <div
          role="alert"
          data-testid="admin-event-not-found"
          className="rounded border border-neutral-300 bg-neutral-50 p-6 text-center"
        >
          <p className="text-neutral-700">{t('errors.notFound')}</p>
        </div>
      ) : null}

      {forbidden ? (
        <div
          role="alert"
          data-testid="admin-event-forbidden"
          className="rounded border border-red-300 bg-red-50 p-6 text-center text-red-800"
        >
          <p>{t('errors.forbidden')}</p>
        </div>
      ) : null}

      {isError && !notFound && !forbidden ? (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{t('errors.generic')}</p>
        </div>
      ) : null}

      {event ? <AdminEventViewer event={event} /> : null}
    </div>
  );
}
