'use client';

// AIBadge (US-017 / FE-002): badge "Sugerido por IA" con opción de mostrar `fallback_used`.
// Cumple AC-01 (badge visible) y AC-04 (comunicación clara del estado HITL/fallback).
//
// PB-P2-032: deja de mantener su propio markup y compone `AILabel` del design system. Es el
// consumidor AI representativo —lo reutilizan event-plan, checklist, budget-suggestion y
// vendor-categories—, así que la migración propaga la primitiva canónica a las cuatro familias
// sin tocar sus layouts ni su API.
//
// Lo que aporta este componente y NO la primitiva: la traducción del copy (`next-intl`) y el
// mapeo `fallback_used` → segundo badge. UI-DEC-010 (icono + label textual, nunca sólo color)
// y los tokens `ai.*` viven ahora en `AILabel`.
import { useTranslations } from 'next-intl';
import { AILabel } from '@/shared/design-system';

interface AIBadgeProps {
  fallbackUsed?: boolean;
}

export function AIBadge({ fallbackUsed = false }: AIBadgeProps): React.JSX.Element {
  const t = useTranslations('ai.eventPlan');
  return (
    <AILabel
      data-testid="ai-badges"
      label={t('badgeSuggested')}
      ariaLabel={t('badgeAria')}
      fallbackLabel={fallbackUsed ? t('badgeFallback') : undefined}
      fallbackAriaLabel={fallbackUsed ? t('badgeFallbackAria') : undefined}
    />
  );
}
