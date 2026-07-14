'use client';

// AISuggestionViewer (US-017 / FE-002, FE-004): renderiza el plan IA con `role="region"` y
// `aria-live="polite"` (AC-04, a11y). Muestra `summary + phases[]` en el idioma del evento.
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { EventPlanOutput } from '../api/aiApi';
import { AIBadge } from './AIBadge';

interface AISuggestionViewerProps {
  plan: EventPlanOutput;
  fallbackUsed?: boolean;
  autoFocusOnMount?: boolean;
}

export function AISuggestionViewer({
  plan,
  fallbackUsed = false,
  autoFocusOnMount = true,
}: AISuggestionViewerProps): React.JSX.Element {
  const t = useTranslations('ai.eventPlan');
  const firstTaskRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (autoFocusOnMount && firstTaskRef.current) {
      firstTaskRef.current.focus();
    }
  }, [autoFocusOnMount]);

  return (
    <section
      role="region"
      aria-labelledby="ai-plan-heading"
      aria-live="polite"
      className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      data-testid="ai-suggestion-viewer"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ai-plan-heading" className="text-xl font-semibold text-neutral-900">
            {t('viewerHeading')}
          </h2>
          <p className="mt-1 text-sm text-neutral-700">{plan.summary}</p>
        </div>
        <AIBadge fallbackUsed={fallbackUsed} />
      </header>

      <ol className="space-y-4">
        {plan.phases.map((phase, phaseIndex) => (
          <li key={`${phase.name}-${phaseIndex}`} className="rounded-md border border-neutral-200 p-4">
            <h3 className="text-base font-semibold text-neutral-900">
              {phase.name}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-neutral-800">
              {phase.tasks.map((task, taskIndex) => {
                const isFirst = phaseIndex === 0 && taskIndex === 0;
                return (
                  <li
                    key={`${phase.name}-task-${taskIndex}`}
                    ref={isFirst ? firstTaskRef : undefined}
                    tabIndex={isFirst ? -1 : undefined}
                    className="outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {task}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <footer className="mt-6 border-t border-neutral-100 pt-4">
        <p className="text-xs text-neutral-500">{t('hitlNotice')}</p>
      </footer>
    </section>
  );
}
