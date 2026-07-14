'use client';

// US-033 (PB-P1-019 / FE-001) — Barra de progreso accesible.
// - Renderiza el `percentage` recibido del backend SIN transformación aritmética (VR-04).
// - Formatea el valor con `Intl.NumberFormat({style:'percent'})` según locale (AC-04).
// - Atributos WAI-ARIA canónicos: `role="progressbar"` + `aria-valuenow/min/max` +
//   `aria-busy` durante loading + `aria-label` localizado (A11Y-01..03).
// - Componente puramente presentacional; sin fetches internos ni cálculos ocultos.
import { useTranslations, useLocale } from 'next-intl';
import { formatNumber } from '@/shared/i18n';
import type { Locale } from '@/shared/i18n/config';

export interface ProgressBarProps {
  percentage: number;
  done: number;
  totalCountable: number;
  skipped: number;
  loading?: boolean;
  eventStatus?: 'draft' | 'active' | 'cancelled' | 'completed';
}

export function ProgressBar({
  percentage,
  done,
  totalCountable,
  skipped,
  loading = false,
}: ProgressBarProps): React.JSX.Element {
  const t = useTranslations('checklist.progress');
  const locale = useLocale() as Locale;

  // AC-04: `style: 'percent'` sobre `percentage/100` → CLDR canónico ("75 %" es-*, "75%" en).
  const label = t('label');
  const formatted = loading
    ? '—'
    : formatNumber(percentage / 100, locale, {
        style: 'percent',
        maximumFractionDigits: 0,
      });
  const tooltip = loading
    ? label
    : t('tooltip', {
        done,
        total: totalCountable,
        skipped,
      });

  return (
    <div className="w-full" data-testid="progress-bar">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-600">
          {label}
        </span>
        <span
          className="text-sm font-semibold tabular-nums text-neutral-900"
          aria-hidden={loading}
        >
          {formatted}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={loading ? undefined : percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-busy={loading}
        aria-label={label}
        title={tooltip}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200"
      >
        <div
          className={`h-full rounded-full transition-[width] ${
            loading ? 'animate-pulse bg-neutral-300' : 'bg-emerald-600'
          }`}
          style={{ width: `${loading ? 100 : Math.max(0, Math.min(100, percentage))}%` }}
        />
      </div>
      {!loading && skipped > 0 ? (
        <p className="mt-1 text-xs text-neutral-500">
          {t('skipped_note', { count: skipped })}
        </p>
      ) : null}
    </div>
  );
}
