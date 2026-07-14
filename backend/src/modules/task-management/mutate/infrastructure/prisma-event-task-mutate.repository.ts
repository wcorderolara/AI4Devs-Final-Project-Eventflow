// US-029 (PB-P1-018 / BE-003) — Adapter Prisma del `EventTaskMutateRepository` (Tech Spec §7).
// Reglas:
//   * `acquireEventLock` usa `pg_advisory_xact_lock(hashtextextended(eventId, 0))` para lock
//     cooperativo scope-transacción por event_id, compatible con adapters existentes
//     (`PrismaOwnedEventForCreateReader`).
//   * `updateContent` proyecta SOLO las columnas presentes en `fields`; Prisma omite `undefined`.
//     NUNCA se tocan `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `language_code`,
//     `created_by_user_id`, `event_id`, `id`, `origin` (SEC-04, BR-AI-008/010).
//   * `updateStatusConditional` y `softDeleteConditional` usan `updateMany` con `where` que
//     filtra `deleted_at: null` + `status: currentStatus` (o solo `deleted_at: null` para
//     soft-delete). `count === 0` indica "raza o soft-delete" → caller diagnostica.
//   * El shape devuelto en success coincide con `EventTaskRow` (US-027 mapper).
import type { Prisma } from '@prisma/client';
import type {
  EventForMutation,
  EventTaskForMutation,
  EventTaskMutateRepository,
  UpdateContentFields,
} from '../ports/event-task-mutate.repository.js';
import type { EventTaskRow } from '../../list/ports/event-task-list.repository.js';
import type { CanonicalEventTaskStatus } from '../domain/EventTaskStateMachineService.js';

const ROW_SELECT = {
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
} as const;

interface EventRow {
  id: string;
  user_id: string;
  status: EventForMutation['status'];
  language: string;
  deleted_at: Date | null;
}

interface TaskLookupRow {
  id: string;
  event_id: string;
  status: EventTaskForMutation['status'];
  ai_generated: boolean;
  ai_recommendation_id: string | null;
  confirmed_at: Date | null;
  deleted_at: Date | null;
}

function normalizeLanguage(raw: string): EventForMutation['languageCode'] {
  switch (raw) {
    case 'es-LATAM':
    case 'es_LATAM':
      return 'es_LATAM';
    case 'es-ES':
    case 'es_ES':
      return 'es_ES';
    case 'pt':
      return 'pt';
    case 'en':
      return 'en';
    default:
      return 'es_LATAM';
  }
}

export class PrismaEventTaskMutateRepository implements EventTaskMutateRepository {
  async acquireEventLock(tx: Prisma.TransactionClient, eventId: string): Promise<void> {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, eventId);
  }

  async findEventForMutation(
    tx: Prisma.TransactionClient,
    eventId: string,
  ): Promise<EventForMutation | null> {
    const rows = await tx.$queryRawUnsafe<EventRow[]>(
      `SELECT id, user_id, status::text AS status, language::text AS language, deleted_at
         FROM events
        WHERE id = $1::uuid`,
      eventId,
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      ownerUserId: r.user_id,
      status: r.status,
      languageCode: normalizeLanguage(String(r.language)),
      deletedAt: r.deleted_at,
    };
  }

  async findTaskOwnedByEvent(
    tx: Prisma.TransactionClient,
    eventId: string,
    taskId: string,
  ): Promise<EventTaskForMutation | null> {
    const rows = await tx.$queryRawUnsafe<TaskLookupRow[]>(
      `SELECT id, event_id, status::text AS status, ai_generated, ai_recommendation_id, confirmed_at, deleted_at
         FROM event_tasks
        WHERE id = $1::uuid AND event_id = $2::uuid AND deleted_at IS NULL`,
      taskId,
      eventId,
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      eventId: r.event_id,
      status: r.status,
      aiGenerated: r.ai_generated,
      aiRecommendationId: r.ai_recommendation_id,
      confirmedAt: r.confirmed_at,
      deletedAt: r.deleted_at,
    };
  }

  async updateContent(
    tx: Prisma.TransactionClient,
    eventId: string,
    taskId: string,
    fields: UpdateContentFields,
    actorId: string,
    _correlationId: string,
  ): Promise<EventTaskRow> {
    // Prisma omite `undefined` del UPDATE. `null` explícito sí se persiste (VR-07, EC-11).
    const row = await tx.eventTask.update({
      where: { id: taskId },
      data: {
        title: fields.title,
        description: fields.description,
        dueDate: fields.dueDate,
        categoryCode: fields.categoryCode,
        updatedByUserId: actorId,
      },
      select: ROW_SELECT,
    });
    void eventId;
    return this.rowToDomain(row);
  }

  async updateStatusConditional(
    tx: Prisma.TransactionClient,
    eventId: string,
    taskId: string,
    currentStatus: CanonicalEventTaskStatus,
    newStatus: CanonicalEventTaskStatus,
    actorId: string,
    _correlationId: string,
  ): Promise<EventTaskRow | null> {
    const updated = await tx.eventTask.updateMany({
      where: {
        id: taskId,
        eventId,
        deletedAt: null,
        status: currentStatus,
      },
      data: {
        status: newStatus,
        updatedByUserId: actorId,
      },
    });
    if (updated.count === 0) return null;
    // Post-UPDATE lookup (mismo tx) para devolver la fila fresca.
    const row = await tx.eventTask.findUnique({ where: { id: taskId }, select: ROW_SELECT });
    return row ? this.rowToDomain(row) : null;
  }

  async softDeleteConditional(
    tx: Prisma.TransactionClient,
    eventId: string,
    taskId: string,
    actorId: string,
    _correlationId: string,
  ): Promise<boolean> {
    const now = new Date();
    const updated = await tx.eventTask.updateMany({
      where: {
        id: taskId,
        eventId,
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        deletedByUserId: actorId,
        updatedByUserId: actorId,
      },
    });
    return updated.count > 0;
  }

  private rowToDomain(row: {
    id: string;
    title: string;
    dueDate: Date | null;
    status: string;
    categoryCode: string | null;
    aiGenerated: boolean;
    aiRecommendationId: string | null;
    confirmedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): EventTaskRow {
    return {
      id: row.id,
      title: row.title,
      dueDate: row.dueDate,
      status: row.status as EventTaskRow['status'],
      categoryCode: row.categoryCode,
      aiGenerated: row.aiGenerated,
      aiRecommendationId: row.aiRecommendationId,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
