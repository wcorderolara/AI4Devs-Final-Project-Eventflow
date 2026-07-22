// US-071 (PB-P2-004 / BE-002). Adapter Prisma del `ListNotificationsRepository`.
//
// Estrategia SQL:
//   * `WHERE user_id = $1`
//   * `AND (payload->>'channel' = $channel OR $channel = 'all')`
//   * `AND (status = $status OR $status = 'all')`
//   * `ORDER BY (status = 'unread') DESC, created_at DESC, id ASC` (D1)
//   * `LIMIT $pageSize OFFSET $offset`
//
// `channel` y `status` se pasan como parámetros ligados a `$queryRaw` para evitar
// injection. El `count` corre en una segunda query con el mismo `WHERE`.
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CountUnreadByUserInput,
  FindByUserInput,
  FindByUserResult,
  ListNotificationsRepository,
  NotificationRow,
} from '../ports/list-notifications.repository.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;

interface RawRow {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'unread' | 'read';
  read_at: Date | null;
  created_at: Date;
}

export class PrismaListNotificationsRepository implements ListNotificationsRepository {
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  async findByUser(input: FindByUserInput): Promise<FindByUserResult> {
    const offset = (input.page - 1) * input.pageSize;
    const channel = input.channel;
    const status = input.status;

    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT id::text AS id,
             user_id::text AS user_id,
             type,
             payload,
             status::text AS status,
             read_at,
             created_at
      FROM notifications
      WHERE user_id = ${input.userId}::uuid
        AND ( ${channel} = 'all' OR payload->>'channel' = ${channel} )
        AND ( ${status} = 'all' OR status::text = ${status} )
      ORDER BY (status = 'unread') DESC, created_at DESC, id ASC
      LIMIT ${input.pageSize}
      OFFSET ${offset}
    `;

    const totalRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM notifications
      WHERE user_id = ${input.userId}::uuid
        AND ( ${channel} = 'all' OR payload->>'channel' = ${channel} )
        AND ( ${status} = 'all' OR status::text = ${status} )
    `;

    const total = Number(totalRows[0]?.count ?? 0n);

    return {
      total,
      items: rows.map(
        (r): NotificationRow => ({
          id: r.id,
          userId: r.user_id,
          type: r.type,
          payload: r.payload,
          status: r.status,
          readAt: r.read_at,
          createdAt: r.created_at,
        }),
      ),
    };
  }

  async countUnreadByUser(input: CountUnreadByUserInput): Promise<number> {
    const channel = input.channel;
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM notifications
      WHERE user_id = ${input.userId}::uuid
        AND status = 'unread'
        AND ( ${channel} = 'all' OR payload->>'channel' = ${channel} )
    `;
    return Number(rows[0]?.count ?? 0n);
  }
}
