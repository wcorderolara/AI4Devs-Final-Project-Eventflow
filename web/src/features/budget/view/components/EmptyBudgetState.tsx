// US-035 (PB-P1-020 / FE-005) — Empty state con deeplinks a US-019 (sugerir IA)
// y a US-036 (agregar manual). Ambos apuntan a rutas ya existentes.
//
// PB-P2-029: adopta `EmptyState` + `TextLink` del design system. Los dos deeplinks, sus rutas y
// el `data-testid` se conservan; se añade el título que Component Foundations §29 exige
// (`budget.empty.title`, nueva clave en los 4 locales) y el icono Lucide decorativo.
import { PiggyBank } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState, TextLink } from '@/shared/design-system';

interface EmptyBudgetStateProps {
  eventId: string;
  aiSuggestionEnabled?: boolean;
}

export function EmptyBudgetState({
  eventId,
  aiSuggestionEnabled = true,
}: EmptyBudgetStateProps): React.JSX.Element {
  const t = useTranslations('budget.empty');
  return (
    <EmptyState
      data-testid="budget-empty"
      icon={<PiggyBank className="h-icon-lg w-icon-lg" />}
      title={t('title')}
      description={t('body')}
      // `live`: el estado vacío aparece tras resolverse la consulta de partidas, no en el render
      // inicial estático — conserva el `role="status"` que ya tenía este bloque.
      live
      primaryAction={
        aiSuggestionEnabled ? (
          <TextLink href={`/organizer/events/${eventId}/ai/budget`}>{t('cta.ai')}</TextLink>
        ) : undefined
      }
      secondaryAction={
        <TextLink href={`/organizer/events/${eventId}/budget?add=1`}>{t('cta.manual')}</TextLink>
      }
    />
  );
}
