// US-070 (PB-P2-007 / BE-001). Adapter Prisma del
// `NotificationBookingConfirmedRepository`. Paralelo a
// `PrismaNotificationQuoteReceivedRepository` (US-069): `channel`,
// `languageCode` y `recipientRole` viajan dentro de `payload`. El chequeo
// de idempotencia usa `$queryRaw` con parámetros ligados sobre
// `payload->>'bookingIntentId'`.
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  BookingConfirmedRepositoryOptions,
  CreateBookingConfirmedNotificationInput,
  NotificationBookingConfirmedRepository,
} from '../ports/notification-booking-confirmed.repository.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type AnyClient = PrismaClient | Prisma.TransactionClient;
const NOTIFICATION_TYPE_BOOKING_CONFIRMED = 'booking_confirmed';

export class PrismaNotificationBookingConfirmedRepository
  implements NotificationBookingConfirmedRepository
{
  constructor(private readonly prisma: AnyClient = defaultPrisma) {}

  private resolveClient(opts?: BookingConfirmedRepositoryOptions): AnyClient {
    return opts?.tx ?? this.prisma;
  }

  async existsBookingConfirmedForRecipient(
    recipientUserId: string,
    bookingIntentId: string,
    opts?: BookingConfirmedRepositoryOptions,
  ): Promise<boolean> {
    const client = this.resolveClient(opts);
    const rows = await client.$queryRaw<Array<{ exists: boolean }>>`
      SELECT 1 AS exists
      FROM notifications
      WHERE user_id = ${recipientUserId}::uuid
        AND type = ${NOTIFICATION_TYPE_BOOKING_CONFIRMED}
        AND payload->>'bookingIntentId' = ${bookingIntentId}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async create(
    input: CreateBookingConfirmedNotificationInput,
    opts?: BookingConfirmedRepositoryOptions,
  ): Promise<void> {
    const client = this.resolveClient(opts);
    const payload: Prisma.InputJsonValue = {
      channel: input.channel,
      languageCode: input.languageCode,
      recipientRole: input.recipientRole,
      bookingIntentId: input.bookingIntentId,
      quoteId: input.quoteId,
      quoteRequestId: input.quoteRequestId,
      eventId: input.eventId,
      vendorProfileId: input.vendorProfileId,
      title: input.title,
      body: input.body,
    };

    await (client as PrismaClient).notification.create({
      data: {
        userId: input.recipientUserId,
        type: NOTIFICATION_TYPE_BOOKING_CONFIRMED,
        payload,
      },
    });
  }
}
