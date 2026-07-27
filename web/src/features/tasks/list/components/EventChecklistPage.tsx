'use client';

// US-027 (PB-P1-018 / FE-004) — Contenedor Client Component del checklist.
// Lee filtros/paginación desde la URL, invoca el hook TanStack y compone la lista, filtros,
// paginación, empty state y banner read-only/bloqueado según `eventStatus`.
//
// US-028 (PB-P1-018 / FE-004): agrega la barra de acciones con botón "Crear tarea" persistente
// (deshabilitado cuando el evento es `completed`/`cancelled` — la UI evita el 409) y cablea el
// modal `CreateTaskDialog` tanto desde la barra como desde el empty state.
import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Alert, Button } from '@/shared/design-system';
import { useEventTasks } from '../hooks/useEventTasks';
import type { TaskListItemStatus, TaskListRange } from '../api/tasksListApi.types';
import { TASK_LIST_RANGES } from '../api/tasksListApi.types';
import { STATUS_OPTIONS } from '../schema/filter-options';
import { TaskFilters } from './TaskFilters';
import { TaskRangeFilter } from './TaskRangeFilter';
import { TaskList } from './TaskList';
import { Pagination } from './Pagination';
import { EmptyChecklistState } from './EmptyChecklistState';
import { CreateTaskDialog } from '../../create/components/CreateTaskDialog';

interface Props {
  eventId: string;
  eventStatus?: 'draft' | 'active' | 'completed' | 'cancelled';
  /**
   * `true` cuando la vista se monta dentro del tab «Tasks» del dashboard del evento: suprime el
   * `<h1>` propio (el dashboard ya titula la página y dos `h1` romperían la jerarquía). La ruta
   * standalone `/organizer/events/:id/tasks` la monta sin la prop y conserva su título.
   */
  embedded?: boolean;
}

function parseStatus(raw: string | null): TaskListItemStatus | undefined {
  if (raw && (STATUS_OPTIONS as readonly string[]).includes(raw)) return raw as TaskListItemStatus;
  return undefined;
}

function parseAiGenerated(raw: string | null): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

function parsePage(raw: string | null): number {
  if (!raw) return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

// US-032 (FE-002): normaliza `range` desde URL — inválido queda `undefined` para no forzar
// override del default server-side (`all`); el backend aplica su propia tolerancia.
function parseRange(raw: string | null): TaskListRange | undefined {
  if (raw && (TASK_LIST_RANGES as readonly string[]).includes(raw)) return raw as TaskListRange;
  return undefined;
}

export function EventChecklistPage({ eventId, eventStatus, embedded = false }: Props): JSX.Element {
  const search = useSearchParams();
  const t = useTranslations('checklist');
  const filters = {
    status: parseStatus(search.get('status')),
    aiGenerated: parseAiGenerated(search.get('aiGenerated')),
    categoryCode: search.get('categoryCode') || undefined,
    // US-032 (FE-002): rango temporal opcional del URL state.
    range: parseRange(search.get('range')),
  };
  const page = parsePage(search.get('page'));
  const pageSize = 20;

  const query = useEventTasks({ eventId, ...filters, page, pageSize });

  const isCompleted = eventStatus === 'completed';
  const isCancelled = eventStatus === 'cancelled';
  const isReadOnly = isCompleted || isCancelled;

  // US-028: control del modal + return-focus.
  const [isDialogOpen, setDialogOpen] = useState(false);
  const createBtnRef = useRef<HTMLButtonElement | null>(null);

  return (
    // `event-checklist`, `banner`, `btn` eran clases BEM sin hoja de estilo: la vista salía como
    // texto plano apilado. Se compone con utilidades del design system y `Alert` para los avisos.
    <section
      className="flex w-full min-w-0 flex-col gap-6"
      aria-labelledby={embedded ? undefined : 'event-checklist-title'}
      aria-label={embedded ? t('title') : undefined}
    >
      {!embedded ? (
        <h1 id="event-checklist-title" className="font-heading text-h2 text-primary">
          {t('title')}
        </h1>
      ) : null}
      {isCompleted && (
        <Alert variant="info" live>
          {t('banner.readOnly')}
        </Alert>
      )}
      {isCancelled && (
        <Alert variant="warning" live>
          {t('banner.cancelled')}
        </Alert>
      )}

      {/* US-028: barra de acciones con botón "Crear tarea" persistente, junto al segmented
          control temporal (US-032 / FE-001, AC-07) para que la fila de controles sea una sola. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TaskRangeFilter />
        <Button
          ref={createBtnRef}
          size="lg"
          leadingIcon={<Plus aria-hidden="true" className="h-icon-sm w-icon-sm" />}
          onClick={(): void => setDialogOpen(true)}
          disabled={isReadOnly}
          title={isReadOnly ? t('actions.createDisabledTooltip') : undefined}
        >
          {t('actions.create')}
        </Button>
      </div>

      <TaskFilters />

      {query.isError && (
        <Alert variant="error" live>
          {t('errorLoad')}
        </Alert>
      )}

      {query.data && query.data.pagination.total === 0 ? (
        <EmptyChecklistState
          eventId={eventId}
          onCreateTask={isReadOnly ? undefined : (): void => setDialogOpen(true)}
          activeRange={filters.range}
        />
      ) : (
        <>
          <TaskList
            items={query.data?.items ?? []}
            isPending={query.isPending}
            total={query.data?.pagination.total ?? 0}
            eventId={eventId}
            eventStatus={eventStatus}
          />
          {query.data && (
            <Pagination page={query.data.pagination.page} totalPages={query.data.pagination.totalPages} />
          )}
        </>
      )}

      <CreateTaskDialog
        eventId={eventId}
        isOpen={isDialogOpen}
        onClose={(): void => setDialogOpen(false)}
        returnFocusRef={createBtnRef}
      />
    </section>
  );
}
