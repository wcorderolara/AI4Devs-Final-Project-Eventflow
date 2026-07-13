// US-016 / BE-001 — Adapter Prisma para lecturas admin sobre `events`. A diferencia del
// PrismaEventRepository (owner-scoped), este adapter permite consultar registros con
// `deleted_at IS NOT NULL` y trae `user.fullName` como `displayName` para render admin.
import { Prisma, type PrismaClient } from '@prisma/client';
import type { AdminEventRepository, AdminEventRow } from '../ports/admin-event.repository.js';
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
}
