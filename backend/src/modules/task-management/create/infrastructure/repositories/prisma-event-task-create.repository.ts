// US-028 (PB-P1-018 / BE-003) — Adapter Prisma del port de creación de `EventTask`.
// Inserta con valores canónicos server-controlled y el mismo `select` que consume
// `TaskListItemMapper.toDto` (US-027 BE-003), evitando un segundo round-trip.
import type { Prisma } from '@prisma/client';
import type {
  CreateEventTaskInput,
  EventTaskCreateRepository,
} from '../../ports/event-task-create.repository.js';
import type { EventTaskRow } from '../../../list/ports/event-task-list.repository.js';

export class PrismaEventTaskCreateRepository implements EventTaskCreateRepository {
  async create(
    input: CreateEventTaskInput,
    tx: Prisma.TransactionClient,
  ): Promise<EventTaskRow> {
    const row = await tx.eventTask.create({
      data: {
        eventId: input.eventId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate === null ? null : new Date(input.dueDate),
        categoryCode: input.categoryCode,
        // Valores canónicos server-controlled (AC-03, VR-09, BR-AI-008).
        status: 'pending',
        origin: 'manual',
        aiGenerated: false,
        aiRecommendationId: null,
        confirmedByUserId: null,
        confirmedAt: null,
        deletedAt: null,
        languageCode: input.languageCode,
        createdByUserId: input.createdByUserId,
      },
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
    });
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
