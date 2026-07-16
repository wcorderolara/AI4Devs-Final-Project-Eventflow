'use client';

// StatusBadge (US-051 / FE-002).
// Renderiza el status actual del QuoteRequest con `aria-live="polite"` para que los cambios
// (`sent → viewed`) sean anunciados por lectores de pantalla sin interrumpir. Los estilos son
// intencionales por estado; el mensaje se traduce por `vendor.qr.detail.status.<status>`.
import { useTranslations } from 'next-intl';
import type { VendorQuoteRequestStatus } from '../api/vendorQrApi';

const STATUS_CLASSES: Record<VendorQuoteRequestStatus, string> = {
  sent: 'bg-amber-100 text-amber-900 ring-amber-300',
  viewed: 'bg-blue-100 text-blue-900 ring-blue-300',
  responded: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  expired: 'bg-neutral-100 text-neutral-700 ring-neutral-300',
  cancelled: 'bg-red-100 text-red-900 ring-red-300',
};

export interface StatusBadgeProps {
  status: VendorQuoteRequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const t = useTranslations('vendor.qr.detail.status');
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${STATUS_CLASSES[status]}`}
      data-status={status}
    >
      {t(status)}
    </span>
  );
}
