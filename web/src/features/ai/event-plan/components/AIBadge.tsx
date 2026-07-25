'use client';

// AIBadge (US-017 / FE-002): badge "Sugerido por IA" con opción de mostrar `fallback_used`.
// Cumple AC-01 (badge visible) y AC-04 (comunicación clara del estado HITL/fallback).
//
// Design tokens (PB-P2-027): consume la familia `ai.*` aprobada (Design Tokens §11 / UI-DEC-010)
// en lugar de la escala `purple` de Tailwind. Es el consumidor AI representativo del sistema:
// lo reutilizan event-plan, checklist, budget-suggestion y vendor-categories, de modo que
// migrarlo propaga los tokens aprobados a las 4 familias sin tocar sus layouts.
//
// UI-DEC-010 exige que la distinción NO dependa sólo del color: el badge combina icono
// (`Sparkles`, aria-hidden) + label textual traducible + `role="status"` con `aria-label`.
// El estado `fallback` reutiliza la familia semántica warning — los estados AI no crean
// paletas paralelas (Design Tokens §11).
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AIBadgeProps {
  fallbackUsed?: boolean;
}

export function AIBadge({ fallbackUsed = false }: AIBadgeProps): React.JSX.Element {
  const t = useTranslations('ai.eventPlan');
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="ai-badges">
      <span
        role="status"
        aria-label={t('badgeAria')}
        className="inline-flex items-center gap-1 rounded-badge border border-ai bg-ai-surface px-2.5 py-0.5 text-caption font-medium text-ai-label"
      >
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-ai-icon" />
        {t('badgeSuggested')}
      </span>
      {fallbackUsed && (
        <span
          role="status"
          aria-label={t('badgeFallbackAria')}
          className="inline-flex items-center rounded-badge border border-feedback-warning bg-feedback-warning px-2.5 py-0.5 text-caption font-medium text-feedback-warning"
        >
          {t('badgeFallback')}
        </span>
      )}
    </div>
  );
}
