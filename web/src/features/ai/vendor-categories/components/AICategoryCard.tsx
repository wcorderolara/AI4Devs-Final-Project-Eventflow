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
        className="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-purple-400 hover:shadow focus:outline-none focus:ring-2 focus:ring-purple-400"
        data-testid={`ai-vendor-category-${category.service_category_code}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-neutral-900">{category.name}</p>
            <p className="mt-1 text-xs text-neutral-500">{category.service_category_code}</p>
          </div>
          <AIBadge fallbackUsed={fallbackUsed} />
        </div>
        <p className="mt-2 text-sm text-neutral-700">{category.reason}</p>
        <p className="mt-3 text-xs font-medium text-purple-700">
          {t('cardCta')}
        </p>
      </Link>
    </li>
  );
}
