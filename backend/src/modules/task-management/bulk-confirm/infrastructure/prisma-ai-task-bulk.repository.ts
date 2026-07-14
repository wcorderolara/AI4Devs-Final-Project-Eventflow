// US-031 (PB-P1-017 / BE-002) — Implementación Prisma del repositorio de bulk confirm.
// `confirmConditional` ejecuta un `UPDATE` condicional atómico (`WHERE status='pending' AND
// ai_generated=TRUE AND event_id=…`) y, si `affected=0`, corre una segunda query de diagnóstico
// para clasificar el `error.code` (`TASK_NOT_FOUND`, `TASK_NOT_IN_EVENT`, `TASK_NOT_AI`,
// `TASK_NOT_PENDING`). El row-level lock del `UPDATE` cubre EC-10 (carrera de bulks solapados).
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../../infrastructure/prisma/client.js';
import type {
  AITaskBulkRepository,
  ConfirmConditionalInput,
  ConfirmConditionalOutcome,
} from '../ports/ai-task-bulk.repository.js';

export class PrismaAITaskBulkRepository implements AITaskBulkRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async confirmConditional(input: ConfirmConditionalInput): Promise<ConfirmConditionalOutcome> {
    const { taskId, eventId, actorId, confirmedAt } = input;

    // 1) UPDATE condicional atómico. `updateMany` retorna `{ count }` sin lanzar cuando no matchea.
    const updated = await this.prisma.eventTask.updateMany({
      where: {
        id: taskId,
        eventId,
        aiGenerated: true,
        status: 'pending',
      },
      data: {
        status: 'active',
        confirmedByUserId: actorId,
        confirmedAt,
      },
    });

    if (updated.count === 1) return { accepted: true };

    // 2) Diagnóstico — solo cuando `affected=0`. Query mínima por `id` para clasificar el error.
    const row = await this.prisma.eventTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        eventId: true,
        aiGenerated: true,
        status: true,
      },
    });

    if (!row) return { accepted: false, code: 'TASK_NOT_FOUND' };
    if (row.eventId !== eventId) return { accepted: false, code: 'TASK_NOT_IN_EVENT' };
    if (!row.aiGenerated) return { accepted: false, code: 'TASK_NOT_AI' };
    // status !== 'pending' (ya `active`, `in_progress`, `done`, `skipped` — AC-05 idempotencia).
    return { accepted: false, code: 'TASK_NOT_PENDING' };
  }
}
