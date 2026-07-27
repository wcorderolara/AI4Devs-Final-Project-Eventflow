// AdminActionBadge (US-067 / PB-P1-040 / FE-001). Muestra el estado de moderación de una
// review en la tabla admin. `published` = neutral; `hidden` = ámbar (oculta al público);
// `removed` = rojo (soft delete final, FR-REVIEW-005). No usa color como única señal — el
// literal de status i18n es siempre visible.
//
// PB-P2-033: el tono deja de ser una tabla de clases de paleta cruda y pasa a `StatusBadge`
// del design system, que ya define los tokens por tono y el glifo consistente.
import { useTranslations } from 'next-intl';
import { StatusBadge, type StatusTone } from '@/shared/design-system';

type ReviewStatus = 'published' | 'hidden' | 'removed';

/** Vocabulario de dominio → tono semántico (Component Foundations §14). */
const TONE_BY_STATUS: Record<ReviewStatus, StatusTone> = {
  published: 'neutral',
  hidden: 'warning',
  removed: 'error',
};

interface Props {
  status: ReviewStatus;
}

export function AdminActionBadge({ status }: Props): React.JSX.Element {
  const t = useTranslations('admin.review.moderate.status');
  return (
    <StatusBadge status={TONE_BY_STATUS[status]} data-testid={`admin-review-status-${status}`}>
      {t(status)}
    </StatusBadge>
  );
}
