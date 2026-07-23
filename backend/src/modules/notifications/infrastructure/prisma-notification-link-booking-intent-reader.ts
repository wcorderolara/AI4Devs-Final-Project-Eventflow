// US-070 (PB-P2-007 / BE-002). Adapter Prisma del
// `NotificationLinkBookingIntentReader`. Query in-batch acotada por
// `pageSize=10` (default US-071) o `50` (máx). Sin filtro por status: el
// deep-link a BookingIntent es válido aunque esté `cancelled`/`expired` — la
// surface pintará el estado real al cargar el detalle.
import type { Prisma, PrismaClient } from '@prisma/client';
import type { NotificationLinkBookingIntentReader } from '../ports/notification-link-booking-intent-reader.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;

export class PrismaNotificationLinkBookingIntentReader
  implements NotificationLinkBookingIntentReader
{
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  async filterExistingBookingIntentIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set<string>();
    const rows = await (this.prisma as PrismaClient).bookingIntent.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }
}
