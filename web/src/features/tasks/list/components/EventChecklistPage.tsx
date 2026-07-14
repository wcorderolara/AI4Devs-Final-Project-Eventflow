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

export function EventChecklistPage({ eventId, eventStatus }: Props): JSX.Element {
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
    <section className="event-checklist" aria-labelledby="event-checklist-title">
      <h1 id="event-checklist-title">{t('title')}</h1>
      {isCompleted && (
        <div className="banner banner--info" role="status">
          {t('banner.readOnly')}
        </div>
      )}
      {isCancelled && (
        <div className="banner banner--warn" role="alert">
          {t('banner.cancelled')}
        </div>
      )}

      {/* US-028: barra de acciones con botón "Crear tarea" persistente. */}
      <div className="event-checklist__actions">
        <button
          ref={createBtnRef}
          type="button"
          className="btn btn--primary"
          onClick={(): void => setDialogOpen(true)}
          disabled={isReadOnly}
          title={isReadOnly ? t('actions.createDisabledTooltip') : undefined}
        >
          {t('actions.create')}
        </button>
      </div>

      {/* US-032 (FE-001, AC-07) — Segmented control temporal por encima de los filtros existentes. */}
      <TaskRangeFilter />
      <TaskFilters />

      {query.isError && (
        <div className="banner banner--error" role="alert">
          {t('errorLoad')}
        </div>
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
