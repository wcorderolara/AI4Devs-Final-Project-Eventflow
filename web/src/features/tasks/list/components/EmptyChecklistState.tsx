'use client';

// US-027 (PB-P1-018 / FE-004) — Estado vacío con dual CTAs (AC-06).
// US-028: el CTA "Crear tarea" ahora dispara el modal `CreateTaskDialog` (props opcional).
// Si no se pasa `onCreateTask`, se conserva la ruta original `/tasks/new` como fallback (SSR).
//
// US-032 (PB-P1-019 / FE-004, AC-07, EC-06) — Copy alternativo cuando el filtro temporal está
// activo y el subconjunto es vacío. El CTA "Ver todas" resetea `range` a default (i.e. quita
// el query param) para volver al listado completo antes de proponer la creación.
import Link from 'next/link';
import { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TASK_LIST_RANGES, type TaskListRange } from '../api/tasksListApi.types';

interface Props {
  eventId: string;
  /** US-028: handler para abrir el modal de creación desde el empty state. */
  onCreateTask?: () => void;
  /** US-032: `range` actualmente activo (undefined ⇒ `all`, default). */
  activeRange?: TaskListRange;
}

export function EmptyChecklistState({ eventId, onCreateTask, activeRange }: Props): JSX.Element {
  const router = useRouter();
  const search = useSearchParams();
  const t = useTranslations('checklist.empty');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isFiltered =
    activeRange !== undefined && activeRange !== 'all' && (TASK_LIST_RANGES as readonly string[]).includes(activeRange);

  function clearRange(): void {
    const params = new URLSearchParams(search.toString());
    params.delete('range');
    params.delete('page');
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="empty-checklist" role="region" aria-label={t('title')}>
      {isFiltered ? (
        <>
          <h2>{t('rangeFiltered.title')}</h2>
          <p>{t('rangeFiltered.body')}</p>
          <div className="empty-checklist__ctas">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={clearRange}
              data-testid="empty-clear-range"
            >
              {t('rangeFiltered.ctaClearRange')}
            </button>
            {onCreateTask ? (
              <button
                ref={triggerRef}
                type="button"
                className="btn btn--primary"
                onClick={onCreateTask}
              >
                {t('ctaCreate')}
              </button>
            ) : (
              <Link href={`/organizer/events/${eventId}/tasks/new`} className="btn btn--primary">
                {t('ctaCreate')}
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <h2>{t('title')}</h2>
          <p>{t('body')}</p>
          <div className="empty-checklist__ctas">
            {onCreateTask ? (
              <button
                ref={triggerRef}
                type="button"
                className="btn btn--primary"
                onClick={onCreateTask}
              >
                {t('ctaCreate')}
              </button>
            ) : (
              <Link href={`/organizer/events/${eventId}/tasks/new`} className="btn btn--primary">
                {t('ctaCreate')}
              </Link>
            )}
            <Link href={`/organizer/events/${eventId}/ai`} className="btn btn--secondary">
              {t('ctaGenerateAi')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
