// UpdateEventTypeUseCase (US-076 / BE-005). Tech Spec §7. AC-02.
//
// PATCH /api/v1/admin/event-types/:id → 200 con `EventTypeView` + AdminAction.
// Permite mutar `name_i18n`, `description_i18n`, `sort_order` y `is_active`.
// El cambio `is_active: false → true` se detecta como `reactivate` y dispara la acción
// `reactivate` en `admin_actions` (Decisión PO D6). Cualquier otro cambio → `update`.
//
// `label` y `description` se re-sincronizan con `name_i18n['es-LATAM']` /
// `description_i18n['es-LATAM']` cuando estos campos se actualizan, para preservar los
// callers legacy (paridad US-075).
import { Prisma, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { EventTypeNotFoundError } from '../domain/us076.errors.js';
import type { UpdateEventTypeBody } from '../interface/event-type.dto.js';
import { assertNameI18nHasEsLatam } from './create-event-type.use-case.js';
import { toEventTypeView, type EventTypeView } from './event-type.view.js';

export interface UpdateEventTypeCtx {
  correlationId?: string;
}

export class UpdateEventTypeUseCase {
  constructor(
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    id: string,
    body: UpdateEventTypeBody,
    ctx: UpdateEventTypeCtx = {},
  ): Promise<EventTypeView> {
    if (body.name_i18n !== undefined) {
      assertNameI18nHasEsLatam(body.name_i18n as Record<string, unknown>);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1) Carga la fila viva (excluye soft-deleted).
      const existing = await tx.eventType.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) throw new EventTypeNotFoundError();

      // 2) Detección reactivate (Decisión PO D6).
      const wasActive = existing.isActive;
      const willBeActive = body.is_active ?? wasActive;
      const isReactivating = !wasActive && willBeActive;

      // 3) Sync denormalizado de `label` / `description`.
      const patch: Prisma.EventTypeUpdateInput = {};
      if (body.name_i18n !== undefined) {
        const esLatam = (body.name_i18n as Record<string, string>)['es-LATAM']!;
        patch.nameI18n = body.name_i18n as Prisma.InputJsonObject;
        patch.label = esLatam;
      }
      if (body.description_i18n !== undefined) {
        patch.descriptionI18n = body.description_i18n as Prisma.InputJsonObject;
        patch.description = (body.description_i18n as Record<string, string>)['es-LATAM'] ?? null;
      }
      if (body.sort_order !== undefined) patch.sortOrder = body.sort_order;
      if (body.is_active !== undefined) patch.isActive = body.is_active;

      const updated = await tx.eventType.update({ where: { id }, data: patch });

      // 4) AdminAction append-only (`reactivate` cuando aplique).
      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: currentUserId,
          action: isReactivating ? 'reactivate' : 'update',
          targetEntity: 'event_type',
          targetId: id,
          metadata: {
            correlationId: ctx.correlationId ?? null,
            reason: body.reason ?? null,
            from: {
              sort_order: existing.sortOrder,
              is_active: existing.isActive,
            },
            to: {
              sort_order: updated.sortOrder,
              is_active: updated.isActive,
            },
            patched_fields: Object.keys(body).filter((k) => k !== 'reason'),
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      this.logger.emit(isReactivating ? 'event_type.reactivated' : 'event_type.updated', {
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
