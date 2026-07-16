// Adapter Prisma — QuoteRepository (US-096 / BE-003). `totalPrice`↔`amount`, `currencyCode`↔
// `currency`, `breakdown` JSONB. Conflicto `uq_quotes_request_active` (US-102) → ConflictError.
import { Prisma, type PrismaClient, type Quote as PrismaQuote } from '@prisma/client';
import type { QuoteRepository } from '../ports/quote-flow.repositories.js';
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
      const q = await this.prisma.quote.create({
        data: {
          quoteRequestId: data.quoteRequestId,
          vendorProfileId: data.vendorProfileId,
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

  async setPreferred(id: string): Promise<QuoteView> {
    const q = await this.prisma.quote.update({ where: { id }, data: { isPreferred: true } });
    return toView(q);
  }
}
