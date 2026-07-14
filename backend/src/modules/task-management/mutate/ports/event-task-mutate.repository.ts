// US-029 (PB-P1-018 / BE-003) — Port de mutación de `EventTask` (Tech Spec §7).
// Cubre las tres operaciones: content, status (condicional), soft delete (condicional).
// El adapter Prisma vive en `infrastructure/repositories/prisma-event-task-mutate.repository.ts`.
// Todas las mutaciones requieren `tx` (el use case abre `$transaction` con `pg_advisory_xact_lock`).
import type { Prisma } from '@prisma/client';
import type { EventTaskRow } from '../../list/ports/event-task-list.repository.js';
import type { CanonicalEventTaskStatus } from '../domain/EventTaskStateMachineService.js';

export interface EventForMutation {
  id: string;
  ownerUserId: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  languageCode: 'es_LATAM' | 'es_ES' | 'pt' | 'en';
  deletedAt: Date | null;
}

export interface EventTaskForMutation {
  id: string;
  eventId: string;
  status: CanonicalEventTaskStatus | 'active';
  aiGenerated: boolean;
  aiRecommendationId: string | null;
  confirmedAt: Date | null;
  deletedAt: Date | null;
}

export interface UpdateContentFields {
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  categoryCode?: string | null;
}

export interface EventTaskMutateRepository {
  /** Lock cooperativo por event_id (pg_advisory_xact_lock). Se libera al commit/rollback. */
  acquireEventLock(tx: Prisma.TransactionClient, eventId: string): Promise<void>;

  /** Ownership + status + language + soft-delete. Null si no existe. */
  findEventForMutation(tx: Prisma.TransactionClient, eventId: string): Promise<EventForMutation | null>;

  /** Devuelve la tarea si pertenece al evento y `deleted_at IS NULL`; null si no. */
  findTaskOwnedByEvent(
    tx: Prisma.TransactionClient,
    eventId: string,
    taskId: string,
  ): Promise<EventTaskForMutation | null>;

  /**
   * UPDATE de columnas editables + auditoría. Proyecta SOLO las columnas presentes en `fields`
   * (los `undefined` se omiten del UPDATE Prisma). `updatedAt` lo setea `@updatedAt`.
   * Devuelve la fila post-UPDATE en el shape que consume `TaskListItemMapper.toDto`.
   */
  updateContent(
    tx: Prisma.TransactionClient,
    eventId: string,
    taskId: string,
    fields: UpdateContentFields,
    actorId: string,
    correlationId: string,
  ): Promise<EventTaskRow>;

  /**
   * UPDATE condicional de status: `WHERE id AND event_id AND status=$current AND deleted_at IS NULL`.
   * Devuelve la fila post-UPDATE o `null` si `affected=0` (raza o soft-delete).
   */
  updateStatusConditional(
    tx: Prisma.TransactionClient,
    eventId: string,
    taskId: string,
    currentStatus: CanonicalEventTaskStatus,
    newStatus: CanonicalEventTaskStatus,
    actorId: string,
    correlationId: string,
  ): Promise<EventTaskRow | null>;

  /**
   * UPDATE condicional de soft delete: `WHERE id AND event_id AND deleted_at IS NULL`.
   * `true` si eliminado; `false` si `affected=0` (ya soft-deleted o inexistente).
   */
  softDeleteConditional(
    tx: Prisma.TransactionClient,
    eventId: string,
    taskId: string,
    actorId: string,
    correlationId: string,
  ): Promise<boolean>;
}
