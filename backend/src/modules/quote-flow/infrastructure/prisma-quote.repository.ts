// Adapter Prisma — QuoteRepository (US-096 / BE-003). `totalPrice`↔`amount`, `currencyCode`↔
// `currency`, `breakdown` JSONB. Conflicto `uq_quotes_request_active` (US-102) → ConflictError.
import { Prisma, type PrismaClient, type Quote as PrismaQuote } from '@prisma/client';
import type { ComparableQuoteRow, QuoteRepository } from '../ports/quote-flow.repositories.js';
import type { CreateQuoteData, QuoteBreakdownItem, QuoteView, UpdateQuoteData } from '../domain/quote.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';
import { ConflictError } from '../../../shared/domain/errors/conflict.error.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

function toView(q: PrismaQuote): QuoteView {
  return {
    id: q.id,
    quoteRequestId: q.quoteRequestId,
    vendorProfileId: q.vendorProfileId,
    totalPrice: q.amount.toString(),
    currencyCode: q.currency as SupportedCurrency,
    breakdown: (q.breakdown as QuoteBreakdownItem[] | null) ?? null,
    conditions: q.conditions ?? null,
    validUntil: q.validUntil ? q.validUntil.toISOString() : null,
    status: q.status,
    isPreferred: q.isPreferred,
    sentAt: q.sentAt ? q.sentAt.toISOString() : null,
    acceptedAt: q.acceptedAt ? q.acceptedAt.toISOString() : null,
    rejectedAt: q.rejectedAt ? q.rejectedAt.toISOString() : null,
    rejectionReason: q.rejectionReason ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export class PrismaQuoteRepository implements QuoteRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async createDraft(data: CreateQuoteData): Promise<QuoteView> {
    try {
      // US-058 (PB-P1-035 / DB-002): `event_id` + `service_category_id` viven denormalizados en
      // `quotes` para soportar el UNIQUE parcial nativo `(event_id, service_category_id) WHERE
      // is_preferred=true`. Se derivan siempre del QuoteRequest padre para mantener el
      // invariante `quotes.<fk> == quote_requests.<fk>`.
      const qr = await this.prisma.quoteRequest.findUniqueOrThrow({
        where: { id: data.quoteRequestId },
        select: { eventId: true, serviceCategoryId: true },
      });
      const q = await this.prisma.quote.create({
        data: {
          quoteRequestId: data.quoteRequestId,
          vendorProfileId: data.vendorProfileId,
          eventId: qr.eventId,
          serviceCategoryId: qr.serviceCategoryId,
          amount: new Prisma.Decimal(data.totalPrice),
          currency: data.currencyCode,
          breakdown: data.breakdown as unknown as Prisma.InputJsonValue,
          conditions: data.conditions,
          validUntil: data.validUntil ? ymdToDate(data.validUntil) : null,
          status: 'draft',
        },
      });
      return toView(q);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('A current quote already exists for this quote request');
      }
      throw err;
    }
  }

  async findById(id: string): Promise<QuoteView | null> {
    const q = await this.prisma.quote.findUnique({ where: { id } });
    return q ? toView(q) : null;
  }

  async findCurrentByQuoteRequest(quoteRequestId: string): Promise<QuoteView | null> {
    const q = await this.prisma.quote.findFirst({
      where: { quoteRequestId, status: { notIn: ['expired', 'rejected'] } },
      orderBy: { createdAt: 'desc' },
    });
    return q ? toView(q) : null;
  }

  async update(id: string, patch: UpdateQuoteData): Promise<QuoteView> {
    const data: Prisma.QuoteUpdateInput = {};
    if (patch.totalPrice !== undefined) data.amount = new Prisma.Decimal(patch.totalPrice);
    if (patch.currencyCode !== undefined) data.currency = patch.currencyCode;
    if (patch.breakdown !== undefined) data.breakdown = patch.breakdown as unknown as Prisma.InputJsonValue;
    if (patch.conditions !== undefined) data.conditions = patch.conditions;
    if (patch.validUntil !== undefined) data.validUntil = patch.validUntil ? ymdToDate(patch.validUntil) : null;
    const q = await this.prisma.quote.update({ where: { id }, data });
    return toView(q);
  }

  async send(id: string, sentAt: Date, validUntil: Date): Promise<QuoteView> {
    const q = await this.prisma.quote.update({
      where: { id },
      data: { status: 'sent', sentAt, validUntil },
    });
    return toView(q);
  }

  async accept(id: string, now: Date): Promise<QuoteView> {
    const q = await this.prisma.quote.update({ where: { id }, data: { status: 'accepted', acceptedAt: now } });
    return toView(q);
  }

  async reject(id: string, now: Date): Promise<QuoteView> {
    const q = await this.prisma.quote.update({ where: { id }, data: { status: 'rejected', rejectedAt: now } });
    return toView(q);
  }

  async findComparableByEventAndCategory(input: {
    eventId: string;
    serviceCategoryId: string;
  }): Promise<ComparableQuoteRow[]> {
    // Ordenación explícita en SQL para preservar estabilidad determinista:
    //   1. `is_preferred DESC` (preferido primero).
    //   2. `status` bucketizado — activos `{sent, accepted}` antes que `{rejected, expired}`.
    //   3. `total_price ASC` (precio ascendente).
    // El bucketizado por status usa `CASE` para forzar el ordenamiento del enum PostgreSQL
    // (que ordena alfabéticamente por defecto: accepted < expired < rejected < sent).
    const rows = await this.prisma.quote.findMany({
      where: {
        quoteRequest: {
          eventId: input.eventId,
          serviceCategoryId: input.serviceCategoryId,
        },
        status: { in: ['sent', 'accepted', 'rejected', 'expired'] },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        breakdown: true,
        conditions: true,
        validUntil: true,
        isPreferred: true,
        createdAt: true,
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            ratingAvg: true,
            reviewsCount: true,
          },
        },
      },
    });

    const statusBucket = (s: string): number => (s === 'sent' || s === 'accepted' ? 0 : 1);

    return rows
      .slice()
      .sort((a, b) => {
        if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
        const bucketDiff = statusBucket(a.status) - statusBucket(b.status);
        if (bucketDiff !== 0) return bucketDiff;
        // `Prisma.Decimal.cmp` preserva precisión sin pasar por Number.
        return a.amount.cmp(b.amount);
      })
      .map<ComparableQuoteRow>((q) => ({
        quoteId: q.id,
        vendor: {
          profileId: q.vendorProfile.id,
          businessName: q.vendorProfile.businessName,
          slug: q.vendorProfile.slug,
          ratingAvg: q.vendorProfile.ratingAvg ? Number(q.vendorProfile.ratingAvg) : null,
          reviewsCount: q.vendorProfile.reviewsCount,
        },
        status: q.status as 'sent' | 'accepted' | 'rejected' | 'expired',
        totalPrice: q.amount.toString(),
        breakdown: (q.breakdown as QuoteBreakdownItem[] | null) ?? null,
        validUntil: q.validUntil ? q.validUntil.toISOString() : null,
        conditions: q.conditions ?? null,
        isPreferred: q.isPreferred,
        createdAt: q.createdAt.toISOString(),
      }));
  }
}
