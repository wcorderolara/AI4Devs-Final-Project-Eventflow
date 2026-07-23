// US-072 (PB-P2-008 / BE-002). Adapter Prisma del `MarkNotificationsRepository`.
//
// SQL patterns:
//   * `findOwnedById` — `SELECT id, user_id, (read_at IS NOT NULL)` con LIMIT 1;
//     el use case decide 404 vs 204 basándose en el snapshot (política de
//     no-revelación de `docs/19`).
//   * `markAsRead` — `UPDATE ... SET read_at=now(), status='read' WHERE id=$1 AND
//     user_id=$2 AND read_at IS NULL` — idempotente por `WHERE read_at IS NULL`.
//   * `markAllAsReadForUser` — `UPDATE ... WHERE user_id=$1 AND status='unread'
//     AND ($ch='all' OR payload->>'channel'=$ch)` — reutiliza el mismo predicado
//     `payload->>'channel'` que el listado (US-071 D5, D-01).
//
// Todas las mutations usan `$queryRaw` con parámetros ligados; el uso de
// `now()` server-side asegura consistencia de reloj (no depende del clock del app).
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  MarkNotificationsRepository,
  OwnedNotificationSnapshot,
} from '../ports/mark-notifications.repository.js';
import type { ListNotificationsChannel } from '../interface/http/list-notifications.query.schema.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;

interface OwnershipRow {
  id: string;
  user_id: string;
  already_read: boolean;
}

interface AffectedRow {
  affected: bigint;
}

export class PrismaMarkNotificationsRepository implements MarkNotificationsRepository {
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  async findOwnedById(notificationId: string): Promise<OwnedNotificationSnapshot | null> {
    const rows = await this.prisma.$queryRaw<OwnershipRow[]>`
      SELECT id::text AS id,
             user_id::text AS user_id,
             (read_at IS NOT NULL) AS already_read
      FROM notifications
      WHERE id = ${notificationId}::uuid
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, userId: row.user_id, alreadyRead: row.already_read };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<{ affected: number }> {
    const rows = await this.prisma.$queryRaw<AffectedRow[]>`
      WITH updated AS (
        UPDATE notifications
           SET read_at = now(),
               status = 'read'::"NotificationStatus"
         WHERE id = ${notificationId}::uuid
           AND user_id = ${userId}::uuid
           AND read_at IS NULL
        RETURNING 1
      )
      SELECT COUNT(*)::bigint AS affected FROM updated
    `;
    return { affected: Number(rows[0]?.affected ?? 0n) };
  }

  async markAllAsReadForUser(
    userId: string,
    channel: ListNotificationsChannel,
  ): Promise<{ affected: number }> {
    const rows = await this.prisma.$queryRaw<AffectedRow[]>`
      WITH updated AS (
        UPDATE notifications
           SET read_at = now(),
               status = 'read'::"NotificationStatus"
         WHERE user_id = ${userId}::uuid
           AND status = 'unread'::"NotificationStatus"
           AND ( ${channel} = 'all' OR payload->>'channel' = ${channel} )
        RETURNING 1
      )
      SELECT COUNT(*)::bigint AS affected FROM updated
    `;
    return { affected: Number(rows[0]?.affected ?? 0n) };
  }
}
