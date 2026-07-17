// Adapter Prisma — BookingIntentRepository (US-096 / BE-006; extendido US-039 / BE-004).
// Flujo simulado (isSimulated=true).
import { type Prisma, type PrismaClient, type BookingIntent as PrismaBI } from '@prisma/client';
import type {
  BookingIntentRepository,
  BookingIntentSyncSnapshot,
  CreateBookingIntentData,
} from '../ports/booking-intent.repository.js';
import type { BookingIntentView } from '../domain/booking-intent.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

function toView(b: PrismaBI): BookingIntentView {
  return {
    id: b.id,
    quoteId: b.quoteId,
    eventId: b.eventId,
    serviceCategoryId: b.serviceCategoryId,
    vendorProfileId: b.vendorProfileId ?? null,
    status: b.status,
    isSimulated: b.isSimulated,
    confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
    cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
    cancelledBy: b.cancelledBy ?? null,
    cancellationReason: b.cancellationReason ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export class PrismaBookingIntentRepository implements BookingIntentRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async create(data: CreateBookingIntentData, tx?: Prisma.TransactionClient): Promise<BookingIntentView> {
    const client = tx ?? this.prisma;
    const b = await client.bookingIntent.create({
      data: {
        quoteId: data.quoteId,
        eventId: data.eventId,
        serviceCategoryId: data.serviceCategoryId,
        vendorProfileId: data.vendorProfileId,
        createdBy: data.createdBy,
        status: 'pending',
        isSimulated: true,
      },
    });
    return toView(b);
  }

  async findById(id: string): Promise<BookingIntentView | null> {
    const b = await this.prisma.bookingIntent.findUnique({ where: { id } });
    return b ? toView(b) : null;
  }

  async confirm(id: string, now: Date, tx?: Prisma.TransactionClient): Promise<BookingIntentView> {
    const client = tx ?? this.prisma;
    const b = await client.bookingIntent.update({
      where: { id },
      data: { status: 'confirmed_intent', confirmedAt: now },
    });
    return toView(b);
  }

  async cancel(
    input: { id: string; now: Date; cancelledBy: string; reason: string },
    tx?: Prisma.TransactionClient,
  ): Promise<BookingIntentView> {
    const client = tx ?? this.prisma;
    const b = await client.bookingIntent.update({
      where: { id: input.id },
      data: {
        status: 'cancelled',
        cancelledAt: input.now,
        cancelledBy: input.cancelledBy,
        cancellationReason: input.reason,
      },
    });
    return toView(b);
  }

  async findByIdForSync(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<BookingIntentSyncSnapshot | null> {
    // Adquiere lock pesimista sobre la fila del `booking_intents`. La transacción del invocador
    // libera el lock al COMMIT/ROLLBACK. Sin este lock, dos `applyOnConfirm` concurrentes sobre
    // el mismo intent podrían ambos observar `committed_synced_at IS NULL` y ambos incrementar.
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM booking_intents WHERE id = ${id}::uuid FOR UPDATE
    `;
    if (locked.length === 0) return null;

    const intent = await tx.bookingIntent.findUnique({
      where: { id },
      select: {
        id: true,
        eventId: true,
        serviceCategoryId: true,
        status: true,
        committedSyncedAt: true,
        committedSyncedAmount: true,
        quote: { select: { amount: true, currency: true } },
        event: {
          select: {
            currency: true,
            budget: { select: { id: true } },
          },
        },
        serviceCategory: { select: { code: true } },
      },
    });
    if (!intent) return null;
    return {
      id: intent.id,
      eventId: intent.eventId,
      serviceCategoryId: intent.serviceCategoryId,
      status: intent.status,
      quote: {
        amount: intent.quote.amount.toNumber(),
        currency: intent.quote.currency,
      },
      event: {
        currency: intent.event.currency,
        budgetId: intent.event.budget?.id ?? null,
      },
      serviceCategoryCode: intent.serviceCategory.code,
      committedSyncedAt: intent.committedSyncedAt,
      committedSyncedAmount: intent.committedSyncedAmount ? intent.committedSyncedAmount.toNumber() : null,
    };
  }

  async markCommittedSynced(
    tx: Prisma.TransactionClient,
    args: { id: string; at: Date; amount: number },
  ): Promise<void> {
    await tx.bookingIntent.update({
      where: { id: args.id },
      data: {
        committedSyncedAt: args.at,
        committedSyncedAmount: args.amount,
      },
    });
  }

  async clearCommittedSync(
    tx: Prisma.TransactionClient,
    args: { id: string },
  ): Promise<void> {
    await tx.bookingIntent.update({
      where: { id: args.id },
      data: {
        committedSyncedAt: null,
        committedSyncedAmount: null,
      },
    });
  }
}
