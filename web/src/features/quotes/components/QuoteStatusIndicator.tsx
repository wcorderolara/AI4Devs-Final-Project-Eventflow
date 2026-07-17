'use client';

// QuoteStatusIndicator (US-057 / FE-002).
// Badge visual + accesible del estado de la Quote en el comparador. `aria-label` explícito
// (i18n vía `organizer.quote.compare.status.<code>`) permite a lectores de pantalla anunciar
// el estado — la etiqueta visible es un abreviado (por diseño responsive de la tabla).
import { useTranslations } from 'next-intl';
import type { ComparableQuoteStatus } from '../api/quotesApi.types';

const STATUS_CLASSES: Record<ComparableQuoteStatus, string> = {
  sent: 'bg-amber-100 text-amber-900 ring-amber-300',
  accepted: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  expired: 'bg-neutral-100 text-neutral-700 ring-neutral-300',
  rejected: 'bg-red-100 text-red-900 ring-red-300',
};

export interface QuoteStatusIndicatorProps {
  status: ComparableQuoteStatus;
  isPreferred?: boolean;
}

export function QuoteStatusIndicator({
  status,
  isPreferred = false,
}: QuoteStatusIndicatorProps): JSX.Element {
  const t = useTranslations('organizer.quote.compare.status');
  const preferredLabel = useTranslations('organizer.quote.compare')('preferredBadge');
  const label = t(status);
  return (
    <span className="inline-flex items-center gap-1.5">
      {isPreferred ? (
        <span
          aria-label={preferredLabel}
          className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900 ring-1 ring-inset ring-indigo-300"
          data-preferred="true"
        >
          {'★'}
        </span>
      ) : null}
      <span
        aria-label={label}
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASSES[status]}`}
        data-status={status}
      >
        {label}
      </span>
    </span>
  );
}
