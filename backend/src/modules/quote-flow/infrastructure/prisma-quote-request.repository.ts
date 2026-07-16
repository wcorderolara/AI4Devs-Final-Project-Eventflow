// Adapter Prisma — QuoteRequestRepository (US-096 / BE-003). Límite de activos + duplicado en
// transacción; conflicto del índice único parcial US-102 (P2002) → DuplicateQuoteRequestActiveError.
import { Prisma, type PrismaClient, type QuoteRequest as PrismaQR } from '@prisma/client';
import type { QuoteRequestRepository } from '../ports/quote-flow.repositories.js';
import {
  ACTIVE_QUOTE_REQUEST_STATUSES,
  type CreateQuoteRequestData,
  type QuoteRequestBrief,
  type QuoteRequestStatusValue,
  type QuoteRequestView,
} from '../domain/quote-request.js';
import type { PaginationInput } from '../../../shared/validation/pagination.js';
import {
  MaxQuoteRequestsExceededError,
  DuplicateQuoteRequestActiveError,
} from '../../../shared/domain/errors/quote-flow.errors.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

function toView(qr: PrismaQR): QuoteRequestView {
  return {
    id: qr.id,
    eventId: qr.eventId,
    serviceCategoryId: qr.serviceCategoryId,
    vendorProfileId: qr.vendorProfileId ?? null,
    status: qr.status,
    brief: (qr.brief as QuoteRequestBrief | null) ?? null,
    aiRecommendationId: qr.aiRecommendationId ?? null,
    viewedAt: qr.viewedAt ? qr.viewedAt.toISOString() : null,
    viewedBy: qr.viewedBy ?? null,
    cancelledAt: qr.cancelledAt ? qr.cancelledAt.toISOString() : null,
    createdAt: qr.createdAt.toISOString(),
    updatedAt: qr.updatedAt.toISOString(),
  };
}

export class PrismaQuoteRequestRepository implements QuoteRequestRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async createWithChecks(data: CreateQuoteRequestData, maxActive: number): Promise<QuoteRequestView> {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const activeCount = await tx.quoteRequest.count({
          where: {
            eventId: data.eventId,
            serviceCategoryId: data.serviceCategoryId,
            status: { in: [...ACTIVE_QUOTE_REQUEST_STATUSES] },
          },
        });
        if (activeCount >= maxActive) throw new MaxQuoteRequestsExceededError();

        const dup = await tx.quoteRequest.findFirst({
          where: {
            eventId: data.eventId,
            vendorProfileId: data.vendorProfileId,
            status: { in: [...ACTIVE_QUOTE_REQUEST_STATUSES] },
          },
          select: { id: true },
        });
        if (dup) throw new DuplicateQuoteRequestActiveError();

        return tx.quoteRequest.create({
          data: {
            eventId: data.eventId,
            serviceCategoryId: data.serviceCategoryId,
            vendorProfileId: data.vendorProfileId,
            brief: data.brief as unknown as Prisma.InputJsonValue,
            aiRecommendationId: data.aiRecommendationId,
            status: 'sent',
          },
        });
      });
      return toView(created);
    } catch (err) {
      // Carrera contra `uq_quote_requests_event_vendor_active` (US-102).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new DuplicateQuoteRequestActiveError();
      }
      throw err;
    }
  }

  async findById(id: string): Promise<QuoteRequestView | null> {
    const qr = await this.prisma.quoteRequest.findUnique({ where: { id } });
    return qr ? toView(qr) : null;
  }

  async findByIdAndVendorProfile(
    qrId: string,
    vendorProfileId: string,
  ): Promise<QuoteRequestView | null> {
    // Uniformidad SEC (US-051 §12): filtrar por assignment aquí evita revelar existencia por
    // reflejo lateral. El estado del QR se evalúa en el UC, no en el repo.
    const qr = await this.prisma.quoteRequest.findFirst({
      where: { id: qrId, vendorProfileId },
    });
    return qr ? toView(qr) : null;
  }

  private async list(
    where: Prisma.QuoteRequestWhereInput,
    pagination: PaginationInput,
  ): Promise<{ items: QuoteRequestView[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quoteRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.quoteRequest.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  listByEvent(
    eventId: string,
    filters: { status?: QuoteRequestStatusValue },
    pagination: PaginationInput,
  ): Promise<{ items: QuoteRequestView[]; total: number }> {
    return this.list({ eventId, ...(filters.status ? { status: filters.status } : {}) }, pagination);
  }

  listByVendor(
    vendorProfileId: string,
    filters: { status?: QuoteRequestStatusValue },
    pagination: PaginationInput,
  ): Promise<{ items: QuoteRequestView[]; total: number }> {
    return this.list(
      { vendorProfileId, ...(filters.status ? { status: filters.status } : {}) },
      pagination,
    );
  }

  async markViewed(id: string, now: Date): Promise<QuoteRequestView> {
    const qr = await this.prisma.quoteRequest.update({
      where: { id },
      data: { status: 'viewed', viewedAt: now },
    });
    return toView(qr);
  }

  async cancel(id: string, now: Date): Promise<QuoteRequestView> {
    const qr = await this.prisma.quoteRequest.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: now },
    });
    return toView(qr);
  }
}
