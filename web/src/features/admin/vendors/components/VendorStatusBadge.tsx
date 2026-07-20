// VendorStatusBadge (US-074 / PB-P1-041 / FE-002). Muestra el estado de moderación de un
// VendorProfile en la tabla admin. Complementa el color con un literal i18n para no depender
// de color como única señal (a11y). El flag `is_hidden` se muestra como badge secundario cuando
// es `true` (paridad con el diseño Decisión PO D2: flag ortogonal al status).
import { useTranslations } from 'next-intl';

type VendorStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

const CLASS_BY_STATUS: Record<VendorStatus, string> = {
  pending: 'bg-blue-50 text-blue-800 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
  // El enum legacy `hidden` (previo a US-047 D2 is_hidden) queda con el mismo look ámbar
  // que el flag `is_hidden=true`. No es un status alcanzable por US-047 moderate; sólo aparece
  // en vendors sembrados pre-US-047.
  hidden: 'bg-amber-50 text-amber-800 border-amber-200',
};

interface Props {
  status: VendorStatus;
  isHidden?: boolean;
}

export function VendorStatusBadge({ status, isHidden = false }: Props): React.JSX.Element {
  const t = useTranslations('admin.vendor.moderate.status');
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        data-testid={`admin-vendor-status-${status}`}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${CLASS_BY_STATUS[status]}`}
      >
        {t(status)}
      </span>
      {isHidden ? (
        <span
          data-testid="admin-vendor-hidden-badge"
          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
        >
          {t('hiddenFlag')}
        </span>
      ) : null}
    </span>
  );
}
