// SoftDeleteServiceCategoryUseCase (US-075 / BE-006). Tech Spec §7. AC-04 + EC-03/EC-04.
//
// DELETE /api/v1/admin/service-categories/:id → 200 con `{ category }` + AdminAction
// `action='soft_delete'`. NO hay hard delete físico (BR-SERVICE-003 / SEC-04). Solo
// muta `is_active=false` (Decisión PO D5) — la fila permanece indexada para preservar
// integridad de referencias históricas (VendorService, Quote, EventTask).
//
// Guards en orden (fail-fast, sin AdminAction ni UPDATE si alguna dispara):
//   1. Categoría existe y no está soft-deleted.
//   2. No hay `vendor_services` referenciando esta categoría → `CATEGORY_IN_USE`
//      con `details.usage_count`.
//   3. No hay subcategorías activas (`parent_id = :id AND is_active = true`) →
//      `CATEGORY_HAS_CHILDREN` con `details.children_count`.
//
// `reason` obligatorio [10..500] chars — validado en el controller (produce
// `REASON_REQUIRED` o `INVALID_REASON_LENGTH`), NO en el UseCase. Aquí solo se persiste.
import { Prisma, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  CategoryHasChildrenError,
  CategoryInUseError,
  ServiceCategoryNotFoundError,
} from '../domain/us075.errors.js';
import { toServiceCategoryView, type ServiceCategoryView } from './service-category.view.js';

export interface SoftDeleteServiceCategoryCtx {
  correlationId?: string;
}

export class SoftDeleteServiceCategoryUseCase {
  constructor(
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    id: string,
    reason: string,
    ctx: SoftDeleteServiceCategoryCtx = {},
  ): Promise<ServiceCategoryView> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.serviceCategory.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) throw new ServiceCategoryNotFoundError();

      // Guard 1: `vendor_services` asociados (VR-09 / EC-03).
      const usageCount = await tx.vendorService.count({ where: { serviceCategoryId: id } });
      if (usageCount > 0) throw new CategoryInUseError(usageCount);

      // Guard 2: subcategorías activas (VR-09 / EC-04). Solo cuenta las que están vivas
      // — categorías ya soft-deleted (`is_active=false`) no bloquean.
      const childrenCount = await tx.serviceCategory.count({
        where: { parentId: id, isActive: true, deletedAt: null },
      });
      if (childrenCount > 0) throw new CategoryHasChildrenError(childrenCount);

      const updated = await tx.serviceCategory.update({
        where: { id },
        data: { isActive: false },
      });

      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: currentUserId,
          action: 'soft_delete',
          targetEntity: 'service_category',
          targetId: id,
          metadata: {
            correlationId: ctx.correlationId ?? null,
            reason,
            snapshot: {
              code: existing.code,
              parent_id: existing.parentId,
              sort_order: existing.sortOrder,
              depth_level: existing.depthLevel,
              was_active: existing.isActive,
            },
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      this.logger.emit('service_category.soft_deleted', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        adminUserId: currentUserId,
        serviceCategoryId: id,
        adminActionId: adminAction.id,
      });

      return toServiceCategoryView(updated);
    });
  }
}
