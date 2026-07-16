'use client';

// QRLimitBadge (US-050 / FE-002).
// Muestra el conteo de QRs activas de la (event, service_category) con `aria-live="polite"`.
// Cuando `available_slots=0` renderiza un párrafo `role="alert"` con id fijo consumido por el
// `aria-describedby` del CTA del form (bloqueo accesible del envío).
//
// - Loading: skeleton reservando el mismo espacio (evita layout shift al llegar el count).
// - Error: badge oculto (el POST re-valida en backend; el usuario ve el 409 si aplica).
// - Estados: siempre visible cuando hay data (D6 del refinement) incluyendo `active_count=0`.
import { useTranslations } from 'next-intl';
import { useActiveQrCount } from '../hooks/quotesQueries';

/** ID estable que el CTA del form usa vía `aria-describedby` cuando el envío está bloqueado. */
export const QR_LIMIT_REASON_ID = 'qr-limit-reason';

export interface QRLimitBadgeProps {
  eventId: string | undefined;
  serviceCategoryId: string | undefined;
}

export function QRLimitBadge({ eventId, serviceCategoryId }: QRLimitBadgeProps): JSX.Element | null {
  const t = useTranslations('quotes.limit');
  const { data, isLoading, isError } = useActiveQrCount({ eventId, serviceCategoryId });

  if (!eventId || !serviceCategoryId) return null;

  if (isLoading) {
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        className="mt-2 h-6 w-56 animate-pulse rounded bg-neutral-200"
      />
    );
  }

  if (isError || !data) return null;

  const reached = data.availableSlots === 0;
  return (
    <div aria-live="polite" className="mt-2 text-sm text-neutral-700">
      <p className={reached ? 'font-medium text-red-800' : undefined}>
        {t('label', { count: data.activeCount, limit: data.limit })}
      </p>
      {reached && (
        <p id={QR_LIMIT_REASON_ID} role="alert" className="mt-1 text-xs text-red-700">
          {t('reached')}
        </p>
      )}
    </div>
  );
}
