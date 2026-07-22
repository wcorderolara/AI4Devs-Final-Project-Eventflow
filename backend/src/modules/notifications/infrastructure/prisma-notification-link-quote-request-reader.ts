// US-068 (PB-P2-005 / BE-002). Adapter Prisma del
// `NotificationLinkQuoteRequestReader`. Query in-batch acotada por `pageSize=10`
// (default US-071) o `50` (máx). Sin filtro por status: el deep-link a QR es válido
// aunque la QR esté `expired`/`cancelled` — la surface vendor mostrará el estado
// real cuando cargue el detalle.
import type { Prisma, PrismaClient } from '@prisma/client';
import type { NotificationLinkQuoteRequestReader } from '../ports/notification-link-quote-request-reader.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;

export class PrismaNotificationLinkQuoteRequestReader
  implements NotificationLinkQuoteRequestReader
{
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  async filterExistingQuoteRequestIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set<string>();
    const rows = await (this.prisma as PrismaClient).quoteRequest.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }
}
