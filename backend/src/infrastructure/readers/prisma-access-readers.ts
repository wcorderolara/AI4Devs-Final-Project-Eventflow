// Adapters Prisma de los reader ports cross-cutting (US-096 / BE-003). Consultan events,
// vendor_profiles y service_categories directamente (acceso a tablas, no import de módulo).
import type { PrismaClient } from '@prisma/client';
import type {
  EventAccessReader,
  OwnedEvent,
  VendorProfileReader,
  ActiveVendorProfile,
  ServiceCategoryReader,
  ActiveServiceCategory,
  QuoteRequestEventReader,
} from '../../shared/access/readers.js';
import type { SupportedCurrency } from '../../shared/constants/currencies.js';
import { prisma as defaultPrisma } from '../prisma/client.js';

export class PrismaEventAccessReader implements EventAccessReader {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async getOwnerId(eventId: string): Promise<string | null> {
    const e = await this.prisma.event.findUnique({ where: { id: eventId }, select: { userId: true } });
    return e?.userId ?? null;
  }

  async getCurrency(eventId: string): Promise<SupportedCurrency | null> {
    const e = await this.prisma.event.findUnique({ where: { id: eventId }, select: { currency: true } });
    return e ? (e.currency as SupportedCurrency) : null;
  }

  async findOwnedEvent(eventId: string, ownerId: string): Promise<OwnedEvent | null> {
    const e = await this.prisma.event.findFirst({
      where: { id: eventId, userId: ownerId },
      select: { id: true, currency: true, status: true },
    });
    return e ? { id: e.id, currency: e.currency as SupportedCurrency, status: e.status } : null;
  }
}

export class PrismaVendorProfileReader implements VendorProfileReader {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async getVendorProfileIdForUser(userId: string): Promise<string | null> {
    const vp = await this.prisma.vendorProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    return vp?.id ?? null;
  }

  async existsActive(vendorProfileId: string): Promise<boolean> {
    const vp = await this.prisma.vendorProfile.findFirst({
      where: { id: vendorProfileId, deletedAt: null },
      select: { id: true },
    });
    return vp !== null;
  }

  async findActiveByUserId(userId: string): Promise<ActiveVendorProfile | null> {
    const vp = await this.prisma.vendorProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, status: true, userId: true },
    });
    return vp ? { id: vp.id, status: vp.status, userId: vp.userId } : null;
  }
}

export class PrismaServiceCategoryReader implements ServiceCategoryReader {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async existsActive(id: string): Promise<boolean> {
    const sc = await this.prisma.serviceCategory.findFirst({
      where: { id, isActive: true, deletedAt: null },
      select: { id: true },
    });
    return sc !== null;
  }

  async findActiveByCode(code: string): Promise<ActiveServiceCategory | null> {
    const sc = await this.prisma.serviceCategory.findFirst({
      where: { code, isActive: true, deletedAt: null },
      select: { id: true, code: true, label: true },
    });
    return sc ? { id: sc.id, code: sc.code, label: sc.label } : null;
  }
}

export class PrismaQuoteRequestEventReader implements QuoteRequestEventReader {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async getEventId(quoteRequestId: string): Promise<string | null> {
    const qr = await this.prisma.quoteRequest.findUnique({
      where: { id: quoteRequestId },
      select: { eventId: true },
    });
    return qr?.eventId ?? null;
  }
}
