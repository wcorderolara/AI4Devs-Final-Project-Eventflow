'use client';

// US-027 (PB-P1-018 / FE-002) — Checklist del evento como **tablero** por estado.
//
// Antes era una única `<ul>` plana apoyada en clases BEM (`task-list`, `task-list-item`) que
// nunca llegaron a tener CSS: la vista se renderizaba como texto apilado sin estilo. Se
// reconstruye con las utilidades del design system y se agrupa por estado, que es como se lee un
// checklist de evento (qué falta / qué está en curso / qué está cerrado).
//
// Estructura accesible: el tablero es una lista de columnas y cada columna a su vez una lista de
// tareas. Cada columna se titula con un `<h3>` que incluye su contador, de modo que un lector de
// pantalla puede saltar entre columnas y saber cuántas tiene cada una sin recorrerlas. El conteo
// total se sigue anunciando con `aria-live="polite"` al filtrar o paginar.
//
// Las columnas son el enum completo de estados (`STATUS_OPTIONS`), no sólo los presentes: un
// tablero cuyas columnas aparecen y desaparecen según los datos desorienta. Las vacías se pintan
// con su propio mensaje.
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Ban, CheckCircle2, CirclePlay, Clock, Inbox, type LucideIcon } from 'lucide-react';
import { cx } from '@/shared/design-system/internal/cx';
import type { TaskListItemDTO, TaskListItemStatus } from '../api/tasksListApi.types';
import { STATUS_OPTIONS } from '../schema/filter-options';
import { TaskListItem } from './TaskListItem';

interface Props {
  items: TaskListItemDTO[];
  isPending?: boolean;
  total: number;
  // US-030 (FE-006): props opcionales para que `TaskListItem` cablee el `TaskStatusQuickToggle`.
  // Cuando no vienen, la fila se renderiza igual que antes (sin toggle).
  eventId?: string;
  eventStatus?: 'draft' | 'active' | 'completed' | 'cancelled';
}

/**
 * Acento de cada columna: tiñe la regla bajo el encabezado y la píldora del contador. El estado
 * ya lo comunica el título, así que el color es refuerzo y nunca la única señal (UI-DEC-014).
 */
const COLUMN_ACCENT: Record<TaskListItemStatus, string> = {
  pending: 'border-b-interactive',
  active: 'border-b-feedback-info',
  in_progress: 'border-b-feedback-warning',
  done: 'border-b-feedback-success',
  skipped: 'border-b-default',
};

/**
 * Mismo acento para el borde superior de la tarjeta. Es un mapa aparte —y no un `replace()` sobre
 * `COLUMN_ACCENT`— porque el JIT de Tailwind sólo genera las clases que aparecen **literales** en
 * el código: una clase compuesta en runtime no llega nunca al CSS y el borde sale gris.
 */
const CARD_ACCENT: Record<TaskListItemStatus, string> = {
  pending: 'border-t-interactive',
  active: 'border-t-feedback-info',
  in_progress: 'border-t-feedback-warning',
  done: 'border-t-feedback-success',
  skipped: 'border-t-default',
};

const COUNT_TONE: Record<TaskListItemStatus, string> = {
  pending: 'bg-surface-selected text-link',
  active: 'bg-feedback-info text-feedback-info',
  in_progress: 'bg-feedback-warning text-feedback-warning',
  done: 'bg-feedback-success text-feedback-success',
  skipped: 'bg-surface-subtle text-secondary',
};

/** Glifo del estado vacío de cada columna: refuerza de qué cubo está hablando. */
const EMPTY_ICON: Record<TaskListItemStatus, LucideIcon> = {
  pending: Inbox,
  active: CirclePlay,
  in_progress: Clock,
  done: CheckCircle2,
  skipped: Ban,
};

export function TaskList({ items, isPending, total, eventId, eventStatus }: Props): JSX.Element {
  const t = useTranslations('checklist');

  const byStatus = useMemo(() => {
    const grouped = new Map<TaskListItemStatus, TaskListItemDTO[]>();
    for (const status of STATUS_OPTIONS) grouped.set(status, []);
    for (const item of items) {
      // Un estado fuera del enum (backend por delante del front) no se descarta: cae en la
      // primera columna para seguir siendo visible y accionable.
      const bucket = grouped.get(item.status) ?? grouped.get('pending');
      bucket?.push(item);
    }
    return grouped;
  }, [items]);

  if (isPending) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        aria-busy="true"
        data-testid="task-board-skeleton"
      >
        {STATUS_OPTIONS.map((status) => (
          <div
            key={status}
            aria-hidden="true"
            className="h-40 animate-pulse rounded-card border border-subtle bg-surface-subtle motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div role="status" aria-live="polite" className="text-body-sm text-secondary">
        {t('foundCount', { count: total })}
      </div>

      <ul
        // `min-h` evita que un tablero con todas las columnas vacías colapse a una tira de
        // encabezados; los cubos deben leerse como carriles con sitio donde caer.
        className="mt-4 grid min-h-[28rem] grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-5"
        data-testid="task-board"
      >
        {STATUS_OPTIONS.map((status) => {
          const columnItems = byStatus.get(status) ?? [];
          const EmptyIcon = EMPTY_ICON[status];
          return (
            <li key={status} className="flex min-w-0 flex-col gap-3" data-testid={`task-column-${status}`} data-count={columnItems.length}>
              {/* El encabezado va fuera del cuerpo de la columna: la regla de acento hace de
                  separador y el cubo se lee aunque esté vacío. */}
              <h3
                className={cx(
                  'flex items-center gap-2 border-b-2 px-1 pb-2 font-ui text-label text-primary',
                  COLUMN_ACCENT[status],
                )}
              >
                <span className="truncate">{t(`status.${status}`)}</span>
                <span
                  className={cx(
                    'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-badge px-1.5 text-caption font-bold',
                    COUNT_TONE[status],
                  )}
                >
                  {columnItems.length}
                </span>
              </h3>

              {columnItems.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-card border-2 border-dashed border-subtle p-6 text-center">
                  <span className="flex flex-col items-center gap-2 text-muted">
                    <EmptyIcon aria-hidden="true" className="h-icon-lg w-icon-lg" />
                    <span className="text-body-sm">{t('board.emptyColumn')}</span>
                  </span>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {columnItems.map((it) => (
                    <TaskListItem
                      key={it.id}
                      item={it}
                      eventId={eventId}
                      eventStatus={eventStatus}
                      accentClassName={CARD_ACCENT[status]}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
