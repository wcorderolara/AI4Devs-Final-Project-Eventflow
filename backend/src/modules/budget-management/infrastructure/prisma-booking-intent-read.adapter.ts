// US-036 (PB-P1-020 / BE-002, R1) — Adapter Prisma para `BookingIntentReadPort`.
// Vive dentro de `budget-management/infrastructure/` (módulo dueño del port) para respetar
// ADR-ARCH-001: no importar entre módulos. El adapter accede a `booking_intents` vía Prisma
// directamente sin acoplar código del módulo `booking-intent`.
// Índices utilizados: `booking_intents_event_id_idx`, `booking_intents_service_category_id_idx`
// (schema.prisma:616-617). Sin Seq Scan. `take: 1` — solo importa la existencia.
import { prisma } from '../../../shared/infrastructure/prisma/prisma.client.js';
import type { BookingIntentReadPort } from '../ports/booking-intent-read.port.js';

export class PrismaBookingIntentReadAdapter implements BookingIntentReadPort {
  async findPendingByEventAndCategory(input: {
    eventId: string;
    serviceCategoryId: string;
  }): Promise<{ id: string }[]> {
    return prisma.bookingIntent.findMany({
      where: {
        eventId: input.eventId,
        serviceCategoryId: input.serviceCategoryId,
        status: 'pending',
      },
      select: { id: true },
      take: 1,
    });
  }
}
