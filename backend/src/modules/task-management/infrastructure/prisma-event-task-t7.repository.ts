// US-034 (PB-P2-004 / BE-003). Adapter Prisma del puerto `EventTaskT7Repository`.
//
// Query implementada con `$queryRaw` (misma forma que otros adapters del módulo) para
// controlar la comparación calendario `due_date::date = $targetDate::date`. La
// aritmética timezone (T-7 en `America/Guatemala`) se realiza en el use case; aquí
// sólo se compara la parte de fecha.
//
// Filtros aplicados (todos AND):
//   * `events.status = 'active'` (D3)
//   * `event_tasks.status IN ('pending','in_progress')` (D3)
//   * `event_tasks.due_date IS NOT NULL`
//   * `event_tasks.due_date::date = $targetDate::date`
//   * `event_tasks.deleted_at IS NULL` (defensa en profundidad — MVP no borra tareas
//     realmente pero preserva la semántica de listados US-027)
// Ordenado por `(e.id, t.id)` para determinismo (tech spec §7).
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  FindT7CandidatesInput,
  T7CandidateRow,
  T7CandidateSourcePort,
} from '../../../shared/application/t7-candidate-source.port.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;

interface RawRow {
  task_id: string;
  event_id: string;
  owner_user_id: string;
  event_language: string;
  due_date: Date;
}

export class PrismaEventTaskT7Repository implements T7CandidateSourcePort {
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  async findT7Candidates(input: FindT7CandidatesInput): Promise<T7CandidateRow[]> {
    // Postgres compara `timestamptz::date` en la timezone actual de la sesión (default
    // UTC en el pool del backend). El `targetDate` se pasa como `Date` a medianoche UTC
    // del día objetivo — el cast `::date` extrae la parte de fecha en UTC, alineado con
    // la aritmética del use case (Doc 14 §23.2).
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT
        t.id::text          AS task_id,
        e.id::text          AS event_id,
        e.user_id::text     AS owner_user_id,
        e.language::text    AS event_language,
        t.due_date          AS due_date
      FROM event_tasks t
      INNER JOIN events e ON e.id = t.event_id
      WHERE e.status = 'active'
        AND t.status IN ('pending', 'in_progress')
        AND t.due_date IS NOT NULL
        AND t.due_date::date = ${input.targetDate}::date
        AND t.deleted_at IS NULL
      ORDER BY e.id, t.id
      LIMIT ${input.batchSize}
      OFFSET ${input.offset}
    `;

    return rows.map((r) => ({
      taskId: r.task_id,
      eventId: r.event_id,
      ownerUserId: r.owner_user_id,
      eventLanguage: r.event_language,
      dueDate: toIsoDate(r.due_date),
    }));
  }
}

/** Convierte un `Date` a `YYYY-MM-DD` en UTC. Compatible con el `payload.dueDate` esperado. */
function toIsoDate(d: Date): string {
  const iso = d.toISOString();
  return iso.slice(0, 10);
}
