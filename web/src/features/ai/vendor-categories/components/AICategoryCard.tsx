'use client';

// AICategoryCard (US-020 / FE-002, FE-004): tarjeta accesible con click-through al directorio.
// A11y: envolvente `<a>` con `aria-label` descriptivo; emite telemetría `ai.vendor-categories.clicked`.
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AIBadge } from '@/features/ai/event-plan';
import type { VendorCategory } from '../api/aiApi';

interface AICategoryCardProps {
  category: VendorCategory;
  eventId: string;
  city?: string;
  correlationId?: string;
  fallbackUsed?: boolean;
}

function encodeCity(city?: string): string {
  if (!city) return '';
  return encodeURIComponent(city);
}

/** US-020 FE-004 / AC-04: emite `ai.vendor-categories.clicked` con `service_category_code`,
 *  `event_id` y `correlation_id` sin PII. En ausencia de cliente de telemetría dedicado se usa
 *  `navigator.sendBeacon` con fallback a `fetch` — nunca bloquea el click-through. */
function emitClickTelemetry(payload: {
  service_category_code: string;
  event_id: string;
  correlation_id?: string;
}): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ event: 'ai.vendor-categories.clicked', ...payload });
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/v1/telemetry/ai-events', blob);
      return;
    }
    void fetch('/api/v1/telemetry/ai-events', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => undefined);
  } catch {
    // Telemetría best-effort: nunca romper el click-through por un fallo del pipeline de logs.
  }
}

export function AICategoryCard({
  category,
  eventId,
  city,
  correlationId,
  fallbackUsed = false,
}: AICategoryCardProps): React.JSX.Element {
  const t = useTranslations('ai.vendorCategories');
  const cityQuery = encodeCity(city);
  const href = cityQuery
    ? `/organizer/vendors?category=${encodeURIComponent(category.service_category_code)}&city=${cityQuery}`
    : `/organizer/vendors?category=${encodeURIComponent(category.service_category_code)}`;

  const ariaLabel = t('cardAriaLabel', {
    name: category.name,
    reason: category.reason,
  });

  const handleClick = (): void => {
    emitClickTelemetry({
      service_category_code: category.service_category_code,
      event_id: eventId,
      correlation_id: correlationId,
    });
  };

  return (
    <li className="list-none">
      <Link
        href={href}
        aria-label={ariaLabel}
        onClick={handleClick}
        // PB-P2-032: `purple-*` genérico está prohibido como color de marca (UI-DEC-002).
        // El acento de hover/CTA usa los alias semánticos aprobados.
        className="focus-ring block rounded-card border border-subtle bg-surface p-4 shadow-surface-subtle transition-[box-shadow,border-color] duration-fast ease-standard hover:border-interactive hover:shadow-surface-raised motion-reduce:transition-none"
        data-testid={`ai-vendor-category-${category.service_category_code}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-ui text-body-sm font-medium text-primary">{category.name}</p>
            <p className="mt-1 font-body text-caption text-muted">
              {category.service_category_code}
            </p>
          </div>
          <AIBadge fallbackUsed={fallbackUsed} />
        </div>
        <p className="mt-2 font-body text-body-sm text-secondary">{category.reason}</p>
        <p className="mt-3 font-ui text-caption font-medium text-link">{t('cardCta')}</p>
      </Link>
    </li>
  );
}
