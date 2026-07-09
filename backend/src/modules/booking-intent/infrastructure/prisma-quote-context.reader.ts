// Adapter Prisma — QuoteContextReader (US-096 / BE-006). Lee quote + quote_request directamente
// (acceso a tablas; no importa quote-flow) para validar y crear BookingIntent desde un Quote.
import type { PrismaClient } from '@prisma/client';
import type { AcceptedQuoteContext, QuoteContextReader } from '../ports/booking-intent.repository.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

export class PrismaQuoteContextReader implements QuoteContextReader {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findQuoteContext(quoteId: string): Promise<AcceptedQuoteContext | null> {
    const q = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        quoteRequestId: true,
        vendorProfileId: true,
        status: true,
        validUntil: true,
        quoteRequest: { select: { eventId: true, serviceCategoryId: true } },
      },
    });
    if (!q) return null;
    return {
      quoteId: q.id,
      quoteRequestId: q.quoteRequestId,
      eventId: q.quoteRequest.eventId,
      serviceCategoryId: q.quoteRequest.serviceCategoryId,
      vendorProfileId: q.vendorProfileId,
      status: q.status,
      validUntil: q.validUntil,
    };
  }
}
