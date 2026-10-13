'use client';

// StatusBadge (US-051 / FE-002).
// Status actual del QuoteRequest sobre `StatusBadge` del design system, como región viva para que
// los cambios (`sent → viewed`) se anuncien sin interrumpir. El mapeo estado → tono vive aquí
// (Component Foundations §14) y conserva las familias de color previas: ámbar → warning,
// azul → info, esmeralda → success, gris → neutral, rojo → error.
import { useTranslations } from 'next-intl';
import { StatusBadge as DSStatusBadge, type StatusTone } from '@/shared/design-system';
import type { VendorQuoteRequestStatus } from '../api/vendorQrApi';

const TONE_BY_STATUS: Record<VendorQuoteRequestStatus, StatusTone> = {
  sent: 'warning',
  viewed: 'info',
  responded: 'success',
  expired: 'neutral',
  cancelled: 'error',
};

export interface StatusBadgeProps {
  status: VendorQuoteRequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const t = useTranslations('vendor.qr.detail.status');
  const label = t(status);
  return (
    <DSStatusBadge status={TONE_BY_STATUS[status]} data-status={status} ariaLabel={label} live>
      {label}
    </DSStatusBadge>
  );
}
