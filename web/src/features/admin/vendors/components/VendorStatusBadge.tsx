// VendorStatusBadge (US-074 / PB-P1-041 / FE-002). Muestra el estado de moderación de un
// VendorProfile en la tabla admin. Complementa el color con un literal i18n para no depender
// de color como única señal (a11y). El flag `is_hidden` se muestra como badge secundario cuando
// es `true` (paridad con el diseño Decisión PO D2: flag ortogonal al status).
//
// PB-P2-029: adopta `StatusBadge` del design system. El mapeo estado de dominio → tono semántico
// vive aquí (Component Foundations §14: «keep domain-status mapping outside the visual
// primitive»). Normalización visual respecto de la implementación previa: `pending` pasa de la
// familia azul (info) a **warning**, que es lo que la tabla §14 asigna a los estados en espera de
// acción humana. Los `data-testid` y las claves i18n no cambian.
import { useTranslations } from 'next-intl';
import { StatusBadge, type StatusTone } from '@/shared/design-system';

type VendorStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

const TONE_BY_STATUS: Record<VendorStatus, StatusTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  // El enum legacy `hidden` (previo a US-047 D2 is_hidden) comparte tono con el flag
  // `is_hidden=true`. No es un status alcanzable por US-047 moderate; sólo aparece en vendors
  // sembrados pre-US-047.
  hidden: 'neutral',
};

interface Props {
  status: VendorStatus;
  isHidden?: boolean;
}

export function VendorStatusBadge({ status, isHidden = false }: Props): React.JSX.Element {
  const t = useTranslations('admin.vendor.moderate.status');
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <StatusBadge
        status={TONE_BY_STATUS[status]}
        data-status={status}
        data-testid={`admin-vendor-status-${status}`}
      >
        {t(status)}
      </StatusBadge>
      {isHidden ? (
        <StatusBadge status="neutral" data-testid="admin-vendor-hidden-badge">
          {t('hiddenFlag')}
        </StatusBadge>
      ) : null}
    </span>
  );
}
