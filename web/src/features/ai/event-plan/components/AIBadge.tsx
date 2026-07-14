'use client';

// AIBadge (US-017 / FE-002): badge "Sugerido por IA" con opción de mostrar `fallback_used`.
// Cumple AC-01 (badge visible) y AC-04 (comunicación clara del estado HITL/fallback).
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
        className="inline-flex items-center rounded-full border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-800"
      >
        {t('badgeSuggested')}
      </span>
      {fallbackUsed && (
        <span
          role="status"
          aria-label={t('badgeFallbackAria')}
          className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
        >
          {t('badgeFallback')}
        </span>
      )}
    </div>
  );
}
