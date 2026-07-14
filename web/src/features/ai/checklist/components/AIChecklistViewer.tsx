'use client';

// AIChecklistViewer (US-018 / FE-002, FE-004): lista de tareas agrupada por fase T-x.
// A11y: cada grupo con role="region" + aria-labelledby; anuncios via aria-live en el contenedor.
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { AIBadge } from '@/features/ai/event-plan';
import {
  PHASE_ORDER,
  groupTasksByPhase,
  type ChecklistOutput,
  type ChecklistPhase,
  type ChecklistPriority,
} from '../api/aiApi';

interface AIChecklistViewerProps {
  checklist: ChecklistOutput;
  fallbackUsed?: boolean;
  autoFocusOnMount?: boolean;
}

const PRIORITY_CLASSES: Record<ChecklistPriority, string> = {
  low: 'bg-neutral-100 text-neutral-700 border-neutral-300',
  medium: 'bg-amber-100 text-amber-800 border-amber-300',
  high: 'bg-red-100 text-red-800 border-red-300',
};

export function AIChecklistViewer({
  checklist,
  fallbackUsed = false,
  autoFocusOnMount = true,
}: AIChecklistViewerProps): React.JSX.Element {
  const t = useTranslations('ai.checklist');
  const firstTaskRef = useRef<HTMLLIElement>(null);
  const groups = groupTasksByPhase(checklist.tasks);

  useEffect(() => {
    if (autoFocusOnMount && firstTaskRef.current) {
      firstTaskRef.current.focus();
    }
  }, [autoFocusOnMount]);

  const activePhases = PHASE_ORDER.filter((p) => groups[p].length > 0);
  let renderedFirst = false;

  return (
    <section
      aria-labelledby="ai-checklist-heading"
      aria-live="polite"
      className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      data-testid="ai-checklist-viewer"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="ai-checklist-heading" className="text-xl font-semibold text-neutral-900">
            {t('viewerHeading')}
          </h2>
          <p className="mt-1 text-sm text-neutral-700">
            {t('viewerHint', { total: checklist.tasks.length })}
          </p>
        </div>
        <AIBadge fallbackUsed={fallbackUsed} />
      </header>

      {activePhases.length === 0 && (
        <p className="text-sm text-neutral-700" data-testid="ai-checklist-empty-phases">
          {t('noTasks')}
        </p>
      )}

      <div className="space-y-6">
        {activePhases.map((phase) => {
          const headingId = `checklist-phase-${phase}`;
          return (
            <section
              key={phase}
              role="region"
              aria-labelledby={headingId}
              className="rounded-md border border-neutral-200 p-4"
              data-testid={`ai-checklist-phase-${phase}`}
            >
              <h3 id={headingId} className="text-base font-semibold text-neutral-900">
                {t(`phases.${phase}` as const)}
              </h3>
              <ul className="mt-3 space-y-3">
                {groups[phase].map((task, taskIndex) => {
                  const shouldFocus = !renderedFirst;
                  if (shouldFocus) renderedFirst = true;
                  return (
                    <li
                      key={`${phase}-${taskIndex}`}
                      ref={shouldFocus ? firstTaskRef : undefined}
                      tabIndex={shouldFocus ? -1 : undefined}
                      className="rounded border border-neutral-100 p-3 outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-900">{task.title}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700">
                            {t('dueRelative', { days: task.due_relative_days })}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[task.priority]}`}
                          >
                            {t(`priority.${task.priority}` as const)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-neutral-700">{task.description}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {t('category', { category: task.category })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <footer className="mt-6 border-t border-neutral-100 pt-4">
        <p className="text-xs text-neutral-500">{t('hitlNotice')}</p>
      </footer>
    </section>
  );
}

export function _phasesForTest(phase: ChecklistPhase): string {
  return phase;
}
