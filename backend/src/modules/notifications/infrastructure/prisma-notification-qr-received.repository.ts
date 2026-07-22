// US-068 (PB-P2-005 / BE-001). Adapter Prisma del `NotificationQrReceivedRepository`.
//
// Sigue el patrón de `PrismaNotificationT7Repository` (US-034): `channel` y
// `languageCode` viajan dentro de `payload` (D-01 US-034). El chequeo de idempotencia
// usa `$queryRaw` con parámetros ligados sobre `payload->>'quoteRequestId'`.
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateQrReceivedNotificationInput,
  NotificationQrReceivedRepository,
  QrReceivedRepositoryOptions,
} from '../ports/notification-qr-received.repository.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;
const NOTIFICATION_TYPE_QR_RECEIVED = 'quote_request_received';

export class PrismaNotificationQrReceivedRepository implements NotificationQrReceivedRepository {
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  private resolveClient(opts?: QrReceivedRepositoryOptions): AnyClient {
    return opts?.tx ?? this.prisma;
  }

  async existsQuoteRequestReceivedForQR(
    vendorUserId: string,
    quoteRequestId: string,
    opts?: QrReceivedRepositoryOptions,
  ): Promise<boolean> {
    const client = this.resolveClient(opts);
    const rows = await client.$queryRaw<Array<{ exists: boolean }>>`
      SELECT 1 AS exists
      FROM notifications
      WHERE user_id = ${vendorUserId}::uuid
        AND type = ${NOTIFICATION_TYPE_QR_RECEIVED}
        AND payload->>'quoteRequestId' = ${quoteRequestId}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async create(
    input: CreateQrReceivedNotificationInput,
    opts?: QrReceivedRepositoryOptions,
  ): Promise<void> {
    const client = this.resolveClient(opts);
    const payload: Prisma.InputJsonValue = {
      channel: input.channel,
      languageCode: input.languageCode,
      quoteRequestId: input.quoteRequestId,
      eventId: input.eventId,
      organizerId: input.organizerId,
      categoryCode: input.categoryCode,
      title: input.title,
      body: input.body,
    };

    await (client as PrismaClient).notification.create({
      data: {
        userId: input.vendorUserId,
        type: NOTIFICATION_TYPE_QR_RECEIVED,
        payload,
      },
    });
  }
}
