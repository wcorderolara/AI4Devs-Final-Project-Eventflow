// US-027 (PB-P1-018 / BE-002) — Implementación Prisma del port de listado.
// - Ownership: SELECT en `events` con `id=$eventId AND user_id=$ownerId AND deleted_at IS NULL`.
// - Listado: `findMany` + `count` con `WHERE event_id = $eventId AND deleted_at IS NULL` y
//   filtros opcionales (`status`, `ai_generated`, `category_code` incluyendo el literal `null`).
// - Orden canónico: `due_date ASC NULLS LAST, created_at DESC`. Prisma no soporta NULLS LAST
//   nativamente en `findMany`, así que se usan `orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]`.
//
// US-032 (PB-P1-019 / BE-004) — Extensión con filtro temporal `range`:
//   * Se obtiene `today = CURRENT_DATE` server-side vía `$queryRaw` una sola vez por request
//     (VR-08). Ese `today` alimenta tanto la cláusula `WHERE` de rango como el mapper (BE-003)
//     para garantizar consistencia entre el filtrado y los flags derivados en la misma request.
//   * Semántica canónica de cada valor de `range`:
//       - `overdue` → `dueDate < today AND status NOT IN ('done','skipped') AND dueDate IS NOT NULL`
//       - `7d`      → `dueDate BETWEEN today AND today + INTERVAL '7 days' AND dueDate IS NOT NULL`
//       - `30d`     → `dueDate BETWEEN today AND today + INTERVAL '30 days' AND dueDate IS NOT NULL`
//       - `all`     → sin filtro temporal adicional (EC-02)
//   * `range` compone por AND con `status`, `aiGenerated`, `categoryCode` (AC-05, AC-06).
//   * El ordenamiento canónico y la paginación se preservan íntegros (EC-08, TS-09).
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/infrastructure/prisma/prisma.client.js';
import type {
  EventTaskListRepository,
  EventTaskRow,
  PaginatedTaskRows,
} from '../../ports/event-task-list.repository.js';
import {
  CATEGORY_CODE_NULL_LITERAL,
  type ListEventTasksFilters,
  type ListEventTasksPagination,
  type ListEventTasksRange,
} from '../../interface/http/list-event-tasks.schema.js';
import type { EventTaskProgressDto } from '../../application/dtos/event-task-progress.dto.js';

const MS_PER_DAY = 86_400_000;

export class PrismaEventTaskListRepository implements EventTaskListRepository {
  async isOwnedEvent(eventId: string, ownerId: string): Promise<boolean> {
    const found = await prisma.event.findFirst({
      where: { id: eventId, userId: ownerId, deletedAt: null },
      select: { id: true },
    });
    return found !== null;
  }

  async findByEventPaginated(
    eventId: string,
    filters: ListEventTasksFilters,
    pagination: ListEventTasksPagination,
  ): Promise<PaginatedTaskRows> {
    // US-032 (BE-004): CURRENT_DATE server-side, evaluado una vez por request.
    const today = await this.fetchServerToday();

    const where = this.buildWhere(eventId, filters, today);
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [rows, total] = await prisma.$transaction([
      prisma.eventTask.findMany({
        where,
        orderBy: [
          { dueDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        skip,
        take: pagination.pageSize,
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
          categoryCode: true,
          aiGenerated: true,
          aiRecommendationId: true,
          confirmedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.eventTask.count({ where }),
    ]);

    const items: EventTaskRow[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      dueDate: r.dueDate,
      status: r.status as EventTaskRow['status'],
      categoryCode: r.categoryCode,
      aiGenerated: r.aiGenerated,
      aiRecommendationId: r.aiRecommendationId,
      confirmedAt: r.confirmedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return { items, total, today };
  }

  /** SELECT CURRENT_DATE — un round-trip liviano; garantiza VR-08. */
  private async fetchServerToday(): Promise<Date> {
    const rows = await prisma.$queryRaw<Array<{ today: Date }>>`SELECT CURRENT_DATE::timestamp AS today`;
    return rows[0]?.today ?? new Date();
  }

  /**
   * US-033 (PB-P1-019 / BE-001) — Cálculo del agregado `progress` en UNA sola query SQL con
   * `COUNT(*) FILTER (...)` (AC-06 / NFR-PERF-001). Reusa el índice canónico
   * `idx_event_tasks_event_status_due` (schema.prisma línea 472).
   *
   * Predicado de "tarea contable" (D2, adaptado al schema real — deviation D1):
   *   `deleted_at IS NULL AND (ai_generated = false OR (ai_generated = true AND confirmed_at IS NOT NULL))`
   *
   * Conjuntos:
   *   - `done`             → status = 'done'
   *   - `total_countable`  → status IN ('pending','active','in_progress','done')
   *   - `skipped`          → status = 'skipped'  (auditoría, fuera del denominador)
   *
   * Redondeo half-up server-side: `ROUND` de PostgreSQL usa half-up (documentado).
   * `total_countable = 0 ⇒ percentage = 0` (EC-01/02/03).
   */
  async calculateProgress(eventId: string): Promise<EventTaskProgressDto> {
    const rows = await prisma.$queryRaw<
      Array<{
        done: bigint | number;
        total_countable: bigint | number;
        skipped: bigint | number;
        percentage: bigint | number;
      }>
    >`
      SELECT
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND (ai_generated = false OR (ai_generated = true AND confirmed_at IS NOT NULL))
            AND status = 'done'
        )::int AS done,
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND (ai_generated = false OR (ai_generated = true AND confirmed_at IS NOT NULL))
            AND status IN ('pending','active','in_progress','done')
        )::int AS total_countable,
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND (ai_generated = false OR (ai_generated = true AND confirmed_at IS NOT NULL))
            AND status = 'skipped'
        )::int AS skipped,
        CASE
          WHEN COUNT(*) FILTER (
            WHERE deleted_at IS NULL
              AND (ai_generated = false OR (ai_generated = true AND confirmed_at IS NOT NULL))
              AND status IN ('pending','active','in_progress','done')
          ) = 0 THEN 0
          ELSE ROUND(
            (COUNT(*) FILTER (
              WHERE deleted_at IS NULL
                AND (ai_generated = false OR (ai_generated = true AND confirmed_at IS NOT NULL))
                AND status = 'done'
            )::numeric * 100)
            /
            COUNT(*) FILTER (
              WHERE deleted_at IS NULL
                AND (ai_generated = false OR (ai_generated = true AND confirmed_at IS NOT NULL))
                AND status IN ('pending','active','in_progress','done')
            )
          )::int
        END AS percentage
      FROM event_tasks
      WHERE event_id = ${eventId}::uuid;
    `;
    const row = rows[0];
    if (!row) {
      // Defensivo: `COUNT(*)` sobre 0 filas devuelve 0; el SELECT retorna 1 fila siempre.
      return { percentage: 0, done: 0, total_countable: 0, skipped: 0 };
    }
    const done = Number(row.done);
    const total_countable = Number(row.total_countable);
    const skipped = Number(row.skipped);
    const percentage = Number(row.percentage);
    return { percentage, done, total_countable, skipped };
  }

  private buildWhere(
    eventId: string,
    filters: ListEventTasksFilters,
    today: Date,
  ): Prisma.EventTaskWhereInput {
    const where: Prisma.EventTaskWhereInput = { eventId, deletedAt: null };
    if (filters.status !== undefined) {
      where.status = filters.status;
    }
    if (filters.aiGenerated !== undefined) {
      where.aiGenerated = filters.aiGenerated;
    }
    if (filters.categoryCode !== undefined) {
      where.categoryCode =
        filters.categoryCode === CATEGORY_CODE_NULL_LITERAL ? null : filters.categoryCode;
    }
    this.applyRangeFilter(where, filters.range, today);
    return where;
  }

  /** Aplica el filtro temporal server-side. Preserva `range='all'` como no-op (EC-02). */
  private applyRangeFilter(
    where: Prisma.EventTaskWhereInput,
    range: ListEventTasksRange,
    today: Date,
  ): void {
    if (range === 'all') return;
    if (range === 'overdue') {
      where.dueDate = { lt: today, not: null };
      where.status = this.mergeOverdueStatus(where.status);
      return;
    }
    const windowDays = range === '7d' ? 7 : 30;
    const upper = new Date(today.getTime() + windowDays * MS_PER_DAY);
    where.dueDate = { gte: today, lte: upper, not: null };
  }

  /**
   * `range=overdue` restringe status a los operativos. Si el cliente ya envió `status`, se
   * respeta (AC-05): la intersección `status='pending'` ∩ `NOT IN ('done','skipped')` es
   * simplemente `status='pending'`; si envió `status='done'`/`'skipped'`, la intersección es
   * vacía (VR-05) y se preserva emitiéndola como Prisma-imposible (`in: []`).
   */
  private mergeOverdueStatus(
    existing: Prisma.EventTaskWhereInput['status'],
  ): Prisma.EventTaskWhereInput['status'] {
    const active: EventTaskRow['status'][] = ['pending', 'active', 'in_progress'];
    if (existing === undefined) {
      return { in: active };
    }
    if (typeof existing === 'string') {
      return active.includes(existing as EventTaskRow['status'])
        ? existing
        : { in: [] };
    }
    // Objeto avanzado del cliente: no lo mezclamos (no ocurre en el path actual del parser).
    return existing;
  }
}
