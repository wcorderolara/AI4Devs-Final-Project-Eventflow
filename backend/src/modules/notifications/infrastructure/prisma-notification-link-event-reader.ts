// US-071 (PB-P2-004 / BE-003). Adapter Prisma del `NotificationLinkEventReader`.
// Query in-batch acotada por `pageSize=10` (default) o `pageSize=50` (máx). El
// filtro `deletedAt IS NULL` excluye eventos soft-deleted (deep-link roto → `null`).
import type { Prisma, PrismaClient } from '@prisma/client';
import type { NotificationLinkEventReader } from '../ports/notification-link-event-reader.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;

export class PrismaNotificationLinkEventReader implements NotificationLinkEventReader {
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  async filterExistingEventIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set<string>();
    const rows = await (this.prisma as PrismaClient).event.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }
}
