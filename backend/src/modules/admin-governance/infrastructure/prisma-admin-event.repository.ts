// US-016 / BE-001 — Adapter Prisma para lecturas admin sobre `events`. A diferencia del
// PrismaEventRepository (owner-scoped), este adapter permite consultar registros con
// `deleted_at IS NOT NULL` y trae `user.fullName` como `displayName` para render admin.
//
// US-078 / BE-003 — extensión: `findDetailByIdIncludingDeleted` reutiliza el mismo criterio
// de lectura y suma `_count` (agregados naturales) + counts adicionales con WHERE específicos
// (`tasksCompleted`, `quoteRequestsActive`, `quotesAccepted`, `bookingIntentsConfirmed`) +
// `budgetSummary`. Todas las queries se envían en paralelo con `Promise.all` para minimizar
// latencia p95 dentro del `$transaction` del use case.
import { Prisma, EventTaskStatus, QuoteRequestStatus, QuoteStatus, BookingIntentStatus, type PrismaClient } from '@prisma/client';
import type {
  AdminEventRepository,
  AdminEventRow,
  AdminEventCountsRow,
  AdminEventBudgetRow,
} from '../ports/admin-event.repository.js';
import type { AdminEventTypeCode } from '../domain/admin-event.types.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';
import {
  PRISMA_TO_API_LANGUAGE,
  type PrismaLanguage,
} from '../../../shared/constants/languages.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

type EventWithTypeAndUser = Prisma.EventGetPayload<{
  include: {
    eventType: { select: { code: true } };
    user: { select: { id: true; fullName: true; email: true } };
  };
}>;

type EventDetailPayload = Prisma.EventGetPayload<{
  include: {
    eventType: { select: { code: true } };
    user: { select: { id: true; fullName: true; email: true } };
    budget: { select: { totalPlanned: true; totalCommitted: true } };
    _count: {
      select: {
        tasks: true;
        quoteRequests: true;
        quotesDenormalized: true;
        bookingIntents: true;
        aiRecommendations: true;
      };
    };
  };
}>;

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toAdminEventRow(e: EventWithTypeAndUser): AdminEventRow {
  return {
    id: e.id,
    ownerId: e.userId,
    eventTypeCode: e.eventType.code as AdminEventTypeCode,
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
    deletedAt: e.deletedAt ? e.deletedAt.toISOString() : null,
    owner: {
      id: e.user.id,
      // fullName es opcional en el schema; fallback a email para preservar identificación.
      displayName: e.user.fullName ?? e.user.email,
    },
  };
}

const INCLUDE = {
  eventType: { select: { code: true } },
  user: { select: { id: true, fullName: true, email: true } },
} as const;

const DETAIL_INCLUDE = {
  eventType: { select: { code: true } },
  user: { select: { id: true, fullName: true, email: true } },
  budget: { select: { totalPlanned: true, totalCommitted: true } },
  _count: {
    select: {
      tasks: true,
      quoteRequests: true,
      quotesDenormalized: true,
      bookingIntents: true,
      aiRecommendations: true,
    },
  },
} as const;

function toDetailBase(e: EventDetailPayload): EventWithTypeAndUser {
  // El row base comparte los mismos campos; sólo se descartan los agregados/budget añadidos
  // por `DETAIL_INCLUDE` para reusar `toAdminEventRow`.
  const { budget: _budget, _count: _c, ...base } = e;
  return base as EventWithTypeAndUser;
}

function toBudgetRow(
  b: EventDetailPayload['budget'],
): AdminEventBudgetRow | null {
  if (!b) return null;
  return {
    totalPlanned: b.totalPlanned.toString(),
    totalCommitted: b.totalCommitted.toString(),
  };
}

export class PrismaAdminEventRepository implements AdminEventRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findByIdIncludingDeleted(eventId: string): Promise<AdminEventRow | null> {
    // Nota: NO se filtra `deletedAt: null`. Es la única diferencia con `findByIdForOwner`.
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
      include: INCLUDE,
    });
    return event ? toAdminEventRow(event) : null;
  }

  async findDetailByIdIncludingDeleted(eventId: string): Promise<AdminEventRow | null> {
    // US-078 §7: read + agregados en paralelo. Los `_count` naturales van en la misma query
    // vía `include._count`; los counts con WHERE específico se ejecutan en paralelo con
    // `count()` para no serializar 5 round-trips (impacta p95 detail < 700ms).
    const [event, tasksCompleted, quoteRequestsActive, quotesAccepted, bookingIntentsConfirmed] =
      await Promise.all([
        this.prisma.event.findFirst({
          where: { id: eventId },
          include: DETAIL_INCLUDE,
        }),
        this.prisma.eventTask.count({
          where: { eventId, status: EventTaskStatus.done, deletedAt: null },
        }),
        this.prisma.quoteRequest.count({
          where: {
            eventId,
            status: { in: [QuoteRequestStatus.sent, QuoteRequestStatus.viewed, QuoteRequestStatus.responded] },
          },
        }),
        this.prisma.quote.count({
          where: {
            eventId,
            status: QuoteStatus.accepted,
          },
        }),
        this.prisma.bookingIntent.count({
          where: { eventId, status: BookingIntentStatus.confirmed_intent },
        }),
      ]);

    if (!event) return null;

    const row = toAdminEventRow(toDetailBase(event));

    const counts: AdminEventCountsRow = {
      tasks: event._count.tasks,
      tasksCompleted,
      quoteRequests: event._count.quoteRequests,
      quoteRequestsActive,
      quotes: event._count.quotesDenormalized,
      quotesAccepted,
      bookingIntents: event._count.bookingIntents,
      bookingIntentsConfirmed,
      aiRecommendations: event._count.aiRecommendations,
    };

    return {
      ...row,
      counts,
      budgetSummary: toBudgetRow(event.budget),
    };
  }
}
