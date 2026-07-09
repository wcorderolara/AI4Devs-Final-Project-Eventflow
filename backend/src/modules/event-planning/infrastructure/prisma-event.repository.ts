// Adapter Prisma — EventRepository (US-095 / BE-003). Traduce entre el modelo Prisma `Event`
// (userId/eventTypeId/title/currency/language) y la vista de dominio `EventView` (contrato API).
// Todas las lecturas/mutaciones son owner-scoped: `findByIdForOwner` y `listByOwner` filtran por
// `userId` en la query (no en post-processing), evitando leakage cross-organizer (SEC-002).
import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  EventRepository,
  EventListFilters,
  EventListOptions,
} from '../ports/event.repository.js';
import type { CreateEventData, EventView, UpdateEventData } from '../domain/event.js';
import type { EventStatusValue } from '../domain/event-lifecycle.js';
import type { EventTypeCode } from '../domain/event-type-codes.js';
import {
  API_TO_PRISMA_LANGUAGE,
  PRISMA_TO_API_LANGUAGE,
  type PrismaLanguage,
} from '../../../shared/constants/languages.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type EventWithType = Prisma.EventGetPayload<{ include: { eventType: { select: { code: true } } } }>;

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toEventView(e: EventWithType): EventView {
  return {
    id: e.id,
    ownerId: e.userId,
    eventTypeCode: e.eventType.code as EventTypeCode,
    name: e.title,
    eventDate: e.eventDate ? toYmd(e.eventDate) : '',
    guestsCount: e.guestsCount ?? 0,
    locationId: e.locationId ?? '',
    estimatedBudget: e.estimatedBudget?.toString() ?? '0',
    currencyCode: e.currency as SupportedCurrency,
    languageCode: PRISMA_TO_API_LANGUAGE[e.language as PrismaLanguage],
    status: e.status,
    notes: e.notes ?? null,
    autoCompleted: e.autoCompleted,
    completedAt: e.completedAt ? e.completedAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

const INCLUDE_TYPE = { eventType: { select: { code: true } } } as const;

function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async create(data: CreateEventData): Promise<EventView> {
    const event = await this.prisma.event.create({
      data: {
        userId: data.ownerId,
        eventTypeId: data.eventTypeId,
        locationId: data.locationId,
        title: data.name,
        status: 'draft',
        currency: data.currency,
        language: API_TO_PRISMA_LANGUAGE[data.language],
        eventDate: ymdToDate(data.eventDate),
        guestsCount: data.guestsCount,
        estimatedBudget: new Prisma.Decimal(data.estimatedBudget),
        notes: data.notes,
        autoCompleted: false,
      },
      include: INCLUDE_TYPE,
    });
    return toEventView(event);
  }

  async findByIdForOwner(eventId: string, ownerId: string): Promise<EventView | null> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, userId: ownerId },
      include: INCLUDE_TYPE,
    });
    return event ? toEventView(event) : null;
  }

  async listByOwner(
    ownerId: string,
    filters: EventListFilters,
    options: EventListOptions,
  ): Promise<{ items: EventView[]; total: number }> {
    const where: Prisma.EventWhereInput = { userId: ownerId };
    if (filters.status) where.status = filters.status;
    if (filters.eventTypeCode) where.eventType = { code: filters.eventTypeCode };
    if (filters.eventDateFrom || filters.eventDateTo) {
      where.eventDate = {};
      if (filters.eventDateFrom) where.eventDate.gte = ymdToDate(filters.eventDateFrom);
      if (filters.eventDateTo) where.eventDate.lte = ymdToDate(filters.eventDateTo);
    }

    const [field, direction] = options.sort.split(':') as ['eventDate' | 'createdAt', 'asc' | 'desc'];
    const orderBy: Prisma.EventOrderByWithRelationInput = { [field]: direction };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        include: INCLUDE_TYPE,
        orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items: items.map(toEventView), total };
  }

  async update(eventId: string, patch: UpdateEventData): Promise<EventView> {
    const data: Prisma.EventUpdateInput = {};
    if (patch.name !== undefined) data.title = patch.name;
    if (patch.eventTypeId !== undefined) data.eventType = { connect: { id: patch.eventTypeId } };
    if (patch.locationId !== undefined) data.location = { connect: { id: patch.locationId } };
    if (patch.eventDate !== undefined) data.eventDate = ymdToDate(patch.eventDate);
    if (patch.guestsCount !== undefined) data.guestsCount = patch.guestsCount;
    if (patch.estimatedBudget !== undefined) data.estimatedBudget = new Prisma.Decimal(patch.estimatedBudget);
    if (patch.language !== undefined) data.language = API_TO_PRISMA_LANGUAGE[patch.language];
    if (patch.notes !== undefined) data.notes = patch.notes;

    const event = await this.prisma.event.update({ where: { id: eventId }, data, include: INCLUDE_TYPE });
    return toEventView(event);
  }

  async transitionStatus(eventId: string, nextStatus: EventStatusValue): Promise<EventView> {
    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: { status: nextStatus },
      include: INCLUDE_TYPE,
    });
    return toEventView(event);
  }
}
