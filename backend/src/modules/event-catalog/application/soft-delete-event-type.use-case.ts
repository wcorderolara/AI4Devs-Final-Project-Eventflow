// SoftDeleteEventTypeUseCase (US-076 / BE-006). Tech Spec §7. AC-03 + EC-01.
//
// DELETE /api/v1/admin/event-types/:id → 200 con `EventTypeView` + AdminAction
// `action='soft_delete'`. NO hay hard delete físico (BR-EVENTTYPE-007 / SEC-04). Solo
// muta `is_active=false` (Decisión PO D4) — la fila permanece indexada para preservar
// integridad de referencias históricas de `events.event_type_id`.
//
// Guard único (fail-fast, sin AdminAction ni UPDATE si dispara):
//   1. EventType existe y no está soft-deleted → si no, `EVENT_TYPE_NOT_FOUND` uniforme.
//   2. No hay `events` referenciando este EventType → si los hay, `EVENT_TYPE_IN_USE`
//      con `details.usage_count`.
//
// `reason` obligatorio [10..500] chars — validado en el controller (produce
// `REASON_REQUIRED` o `INVALID_REASON_LENGTH`), NO en el UseCase. Aquí solo se persiste.
import { Prisma, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  EventTypeInUseError,
  EventTypeNotFoundError,
} from '../domain/us076.errors.js';
import { toEventTypeView, type EventTypeView } from './event-type.view.js';

export interface SoftDeleteEventTypeCtx {
  correlationId?: string;
}

export class SoftDeleteEventTypeUseCase {
  constructor(
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    id: string,
    reason: string,
    ctx: SoftDeleteEventTypeCtx = {},
  ): Promise<EventTypeView> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.eventType.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) throw new EventTypeNotFoundError();

      // Guard: `events` asociados (VR-06 / EC-01).
      const usageCount = await tx.event.count({ where: { eventTypeId: id } });
      if (usageCount > 0) throw new EventTypeInUseError(usageCount);

      const updated = await tx.eventType.update({
        where: { id },
        data: { isActive: false },
      });

      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: currentUserId,
          action: 'soft_delete',
          targetEntity: 'event_type',
          targetId: id,
          metadata: {
            correlationId: ctx.correlationId ?? null,
            reason,
            snapshot: {
              code: existing.code,
              sort_order: existing.sortOrder,
              was_active: existing.isActive,
            },
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      this.logger.emit('event_type.soft_deleted', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        adminUserId: currentUserId,
        eventTypeId: id,
        adminActionId: adminAction.id,
      });

      return toEventTypeView(updated);
    });
  }
}
