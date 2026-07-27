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

// Los CTA eran `btn btn--primary` / `btn btn--secondary`, clases sin hoja de estilo: se veían
// como texto suelto. Se replican aquí los tokens del `Button` del design system porque uno de los
// dos caminos es un `<Link>` de Next y `Button` sólo renderiza `<button>`.
const CTA_BASE =
  'focus-ring inline-flex min-h-touch items-center justify-center rounded-button px-4 py-2 ' +
  'font-ui text-body-sm font-medium transition-colors duration-fast ease-standard ' +
  'motion-reduce:transition-none';
const PRIMARY_CTA = `${CTA_BASE} bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover`;
const SECONDARY_CTA = `${CTA_BASE} border border-action-secondary bg-action-secondary text-primary hover:bg-action-secondary-hover`;

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
    <div
      className="rounded-card border border-dashed border-subtle bg-surface-subtle p-6 text-center"
      role="region"
      aria-label={t('title')}
    >
      {isFiltered ? (
        <>
          <h2 className="font-heading text-h3 text-primary">{t('rangeFiltered.title')}</h2>
          <p className="mt-1 text-body-sm text-secondary">{t('rangeFiltered.body')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className={SECONDARY_CTA}
              onClick={clearRange}
              data-testid="empty-clear-range"
            >
              {t('rangeFiltered.ctaClearRange')}
            </button>
            {onCreateTask ? (
              <button
                ref={triggerRef}
                type="button"
                className={PRIMARY_CTA}
                onClick={onCreateTask}
              >
                {t('ctaCreate')}
              </button>
            ) : (
              <Link href={`/organizer/events/${eventId}/tasks/new`} className={PRIMARY_CTA}>
                {t('ctaCreate')}
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="font-heading text-h3 text-primary">{t('title')}</h2>
          <p className="mt-1 text-body-sm text-secondary">{t('body')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {onCreateTask ? (
              <button
                ref={triggerRef}
                type="button"
                className={PRIMARY_CTA}
                onClick={onCreateTask}
              >
                {t('ctaCreate')}
              </button>
            ) : (
              <Link href={`/organizer/events/${eventId}/tasks/new`} className={PRIMARY_CTA}>
                {t('ctaCreate')}
              </Link>
            )}
            <Link href={`/organizer/events/${eventId}/ai`} className={SECONDARY_CTA}>
              {t('ctaGenerateAi')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
