// US-024 (PB-P2-002) / BE-005 — Adapter Prisma de `EligibleTasksReader`.
//
// Aplica el predicado canónico de "tarea elegible" (US-033 §D2 alineado al schema real):
//   deleted_at IS NULL
//   AND status IN ('pending','active','in_progress')
//   AND (ai_generated = false OR confirmed_by_user_id IS NOT NULL)
//
// Orden estable `due_date ASC NULLS LAST, updated_at DESC` para hacer determinista el snapshot
// que alimenta la signature (BE-001) y facilitar el debugging del cache.
import { prisma } from '../../../shared/infrastructure/prisma/prisma.client.js';
import type {
  EligibleTasksReader,
  EligibleTaskRow,
} from '../ports/eligible-tasks.reader.js';

const ELIGIBLE_STATUSES: EligibleTaskRow['status'][] = [
  'pending',
  'active',
  'in_progress',
];

export class PrismaEligibleTasksReader implements EligibleTasksReader {
  async findEligibleByEventId(eventId: string): Promise<EligibleTaskRow[]> {
    const rows = await prisma.eventTask.findMany({
      where: {
        eventId,
        deletedAt: null,
        status: { in: ELIGIBLE_STATUSES },
        OR: [{ aiGenerated: false }, { confirmedByUserId: { not: null } }],
      },
      orderBy: [
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        updatedAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      dueDate: r.dueDate,
      status: r.status as EligibleTaskRow['status'],
      updatedAt: r.updatedAt,
    }));
  }
}
