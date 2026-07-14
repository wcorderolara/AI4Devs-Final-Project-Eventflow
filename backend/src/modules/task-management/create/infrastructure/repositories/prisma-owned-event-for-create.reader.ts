// US-028 (PB-P1-018 / BE-005) — Adapter Prisma del `OwnedEventForCreateReader`.
// Adquiere un lock advisory por `event_id` (transaction-scoped) usando
// `pg_advisory_xact_lock(hashtextextended(eventId, 0))` para aislar la carrera del EC-08 sin
// bloquear otros eventos ni la tabla completa. La query de ownership+status corre en la misma
// transacción para que la validación de mutabilidad sea consistente con el insert posterior.
import type { Prisma } from '@prisma/client';
import type {
  OwnedEventForCreate,
  OwnedEventForCreateReader,
  OwnedEventLanguage,
} from '../../ports/owned-event-for-create.reader.js';

interface EventRow {
  id: string;
  status: OwnedEventForCreate['status'];
  language: OwnedEventLanguage;
  deleted_at: Date | null;
}

export class PrismaOwnedEventForCreateReader implements OwnedEventForCreateReader {
  async findOwnedForUpdate(
    tx: Prisma.TransactionClient,
    eventId: string,
    ownerUserId: string,
  ): Promise<OwnedEventForCreate | null> {
    // Lock advisory transaction-scoped por event_id. `hashtextextended` proyecta el UUID a bigint
    // (input aceptado por `pg_advisory_xact_lock`). Se libera automáticamente al commit/rollback.
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      eventId,
    );

    // Ownership + status + language + soft-delete en una sola query. Prisma no soporta
    // enums en el select raw type-safe, pero el mapeo es directo.
    const rows = await tx.$queryRawUnsafe<EventRow[]>(
      `SELECT id, status::text AS status, language::text AS language, deleted_at
         FROM events
        WHERE id = $1::uuid AND user_id = $2::uuid`,
      eventId,
      ownerUserId,
    );
    const r = rows[0];
    if (!r) return null;
    // El casting de language desde postgres devuelve el label mapeado ("es-LATAM", etc.),
    // que hay que normalizar al valor del enum de Prisma (`es_LATAM`).
    const language = normalizeLanguage(String(r.language));
    return {
      id: r.id,
      status: r.status,
      language,
      deletedAt: r.deleted_at,
    };
  }
}

function normalizeLanguage(raw: string): OwnedEventLanguage {
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
      // Defensivo: si el enum agrega valores en el futuro, no reventar la creación de tareas.
      return 'es_LATAM';
  }
}
