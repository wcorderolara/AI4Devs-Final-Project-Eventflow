'use client';

// US-079 (PB-P1-045) / FE-002 — Card genérica de métrica operativa.
// A11Y: `role="region"` con `aria-labelledby` que apunta al `<h3>` del título; breakdown opcional
// como `<dl>` con pares `<dt>` (label) / `<dd>` (número).
import type { ReactNode } from 'react';

export interface MetricCardBreakdownItem {
  key: string;
  label: string;
  value: number;
}

interface Props {
  id: string;
  title: string;
  total: number;
  totalAriaLabel?: string;
  breakdown?: MetricCardBreakdownItem[];
  breakdownTitle?: string;
  footer?: ReactNode;
}

export function MetricCard({
  id,
  title,
  total,
  totalAriaLabel,
  breakdown,
  breakdownTitle,
  footer,
}: Props): React.JSX.Element {
  const headingId = `${id}-title`;
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <header className="flex items-baseline justify-between gap-4">
        <h3 id={headingId} className="text-sm font-semibold text-neutral-700">
          {title}
        </h3>
        <span
          className="text-2xl font-bold text-neutral-900"
          aria-label={totalAriaLabel ?? `${title}: ${total}`}
        >
          {total}
        </span>
      </header>
      {breakdown && breakdown.length > 0 ? (
        <div className="mt-3">
          {breakdownTitle ? (
            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
              {breakdownTitle}
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {breakdown.map((item) => (
              <div key={item.key} className="flex items-baseline justify-between">
                <dt className="text-neutral-600">{item.label}</dt>
                <dd className="font-medium text-neutral-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {footer ? <footer className="mt-3 text-xs text-neutral-500">{footer}</footer> : null}
    </section>
  );
}
