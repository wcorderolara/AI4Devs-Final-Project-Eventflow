// Adapter Prisma — BookingIntentRepository (US-096 / BE-006). Flujo simulado (isSimulated=true).
import { type PrismaClient, type BookingIntent as PrismaBI } from '@prisma/client';
import type { BookingIntentRepository, CreateBookingIntentData } from '../ports/booking-intent.repository.js';
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

  async create(data: CreateBookingIntentData): Promise<BookingIntentView> {
    const b = await this.prisma.bookingIntent.create({
      data: {
        quoteId: data.quoteId,
        eventId: data.eventId,
        serviceCategoryId: data.serviceCategoryId,
        vendorProfileId: data.vendorProfileId,
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

  async confirm(id: string, now: Date): Promise<BookingIntentView> {
    const b = await this.prisma.bookingIntent.update({
      where: { id },
      data: { status: 'confirmed_intent', confirmedAt: now },
    });
    return toView(b);
  }

  async cancel(input: { id: string; now: Date; cancelledBy: string; reason: string }): Promise<BookingIntentView> {
    const b = await this.prisma.bookingIntent.update({
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
}
