// AdminActionBadge (US-067 / PB-P1-040 / FE-001). Muestra el estado de moderación de una
// review en la tabla admin. `published` = neutral; `hidden` = ámbar (oculta al público);
// `removed` = rojo (soft delete final, FR-REVIEW-005). No usa color como única señal — el
// literal de status i18n es siempre visible.
import { useTranslations } from 'next-intl';

type ReviewStatus = 'published' | 'hidden' | 'removed';

const CLASS_BY_STATUS: Record<ReviewStatus, string> = {
  published: 'bg-neutral-100 text-neutral-800 border-neutral-200',
  hidden: 'bg-amber-50 text-amber-800 border-amber-200',
  removed: 'bg-red-50 text-red-800 border-red-200',
};

interface Props {
  status: ReviewStatus;
}

export function AdminActionBadge({ status }: Props): React.JSX.Element {
  const t = useTranslations('admin.review.moderate.status');
  return (
    <span
      data-testid={`admin-review-status-${status}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${CLASS_BY_STATUS[status]}`}
    >
      {t(status)}
    </span>
  );
}
