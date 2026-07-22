// US-069 (PB-P2-006 / BE-001). Adapter Prisma del `NotificationQuoteReceivedRepository`.
//
// Paralelo a `PrismaNotificationQrReceivedRepository` (US-068): `channel` y
// `languageCode` viajan dentro de `payload` (D-01 US-034). El chequeo de idempotencia
// usa `$queryRaw` con parámetros ligados sobre `payload->>'quoteId'`.
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateQuoteReceivedNotificationInput,
  NotificationQuoteReceivedRepository,
  QuoteReceivedRepositoryOptions,
} from '../ports/notification-quote-received.repository.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;
const NOTIFICATION_TYPE_QUOTE_RECEIVED = 'quote_received';

export class PrismaNotificationQuoteReceivedRepository
  implements NotificationQuoteReceivedRepository
{
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  private resolveClient(opts?: QuoteReceivedRepositoryOptions): AnyClient {
    return opts?.tx ?? this.prisma;
  }

  async existsQuoteReceivedForQuote(
    organizerUserId: string,
    quoteId: string,
    opts?: QuoteReceivedRepositoryOptions,
  ): Promise<boolean> {
    const client = this.resolveClient(opts);
    const rows = await client.$queryRaw<Array<{ exists: boolean }>>`
      SELECT 1 AS exists
      FROM notifications
      WHERE user_id = ${organizerUserId}::uuid
        AND type = ${NOTIFICATION_TYPE_QUOTE_RECEIVED}
        AND payload->>'quoteId' = ${quoteId}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async create(
    input: CreateQuoteReceivedNotificationInput,
    opts?: QuoteReceivedRepositoryOptions,
  ): Promise<void> {
    const client = this.resolveClient(opts);
    const payload: Prisma.InputJsonValue = {
      channel: input.channel,
      languageCode: input.languageCode,
      quoteId: input.quoteId,
      quoteRequestId: input.quoteRequestId,
      eventId: input.eventId,
      vendorProfileId: input.vendorProfileId,
      title: input.title,
      body: input.body,
    };

    await (client as PrismaClient).notification.create({
      data: {
        userId: input.organizerUserId,
        type: NOTIFICATION_TYPE_QUOTE_RECEIVED,
        payload,
      },
    });
  }
}
