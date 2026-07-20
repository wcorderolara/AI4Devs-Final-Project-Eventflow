// UpdateServiceCategoryUseCase (US-075 / BE-005). Tech Spec §7. AC-03 + EC-02.
//
// PATCH /api/v1/admin/service-categories/:id → 200 con `{ category }` + AdminAction.
// Permite mutar `name_i18n`, `description_i18n`, `parent_id`, `sort_order` y `is_active`.
// El cambio `is_active: false → true` se detecta como `reactivate` y disparar la acción
// `reactivate` en `admin_actions` (Decisión PO D7). Cualquier otro cambio → `update`.
//
// Reglas de jerarquía (Decisión PO D4):
//   - Si `parent_id` cambia a un UUID:
//       * el nuevo parent debe existir;
//       * el nuevo parent debe ser root (`parent_id === null`) — si no, `INVALID_HIERARCHY_DEPTH`;
//       * la categoría a actualizar NO debe tener children activos (si los tiene, moverla a
//         sub crearía nivel 3) → `INVALID_HIERARCHY_DEPTH`.
//   - Si `parent_id` cambia a `null` → siempre válido (subir a root); `depth_level=1`.
//   - Si no cambia, `depth_level` se recalcula con el estado existente (defensa por
//     idempotencia de writes; nunca degrada).
//
// `label` y `description` se re-sincronizan con `name_i18n['es-LATAM']` / `description_i18n
// ['es-LATAM']` cuando estos campos se actualizan, para preservar los callers legacy.
import { Prisma, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  InvalidHierarchyDepthError,
  InvalidParentIdError,
  ServiceCategoryNotFoundError,
} from '../domain/us075.errors.js';
import type { UpdateServiceCategoryBody } from '../interface/service-category.dto.js';
import { assertNameI18nHasEsLatam } from './create-service-category.use-case.js';
import { toServiceCategoryView, type ServiceCategoryView } from './service-category.view.js';

export interface UpdateServiceCategoryCtx {
  correlationId?: string;
}

export class UpdateServiceCategoryUseCase {
  constructor(
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    id: string,
    body: UpdateServiceCategoryBody,
    ctx: UpdateServiceCategoryCtx = {},
  ): Promise<ServiceCategoryView> {
    if (body.name_i18n !== undefined) {
      assertNameI18nHasEsLatam(body.name_i18n as Record<string, unknown>);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1) Carga la fila con conteo de hijos activos (necesario para la validación
      // "no puedes mover a sub si tienes children"). Excluye soft-deleted.
      const existing = await tx.serviceCategory.findFirst({
        where: { id, deletedAt: null },
        include: { _count: { select: { children: true } } },
      });
      if (!existing) throw new ServiceCategoryNotFoundError();

      // 2) Validación de parent_id (Decisión PO D4).
      let nextDepthLevel = existing.depthLevel;
      const parentChanges =
        body.parent_id !== undefined && body.parent_id !== existing.parentId;
      if (parentChanges) {
        if (body.parent_id === null) {
          nextDepthLevel = 1;
        } else {
          const parent = await tx.serviceCategory.findUnique({
            where: { id: body.parent_id! },
            select: { id: true, parentId: true },
          });
          if (!parent) throw new InvalidParentIdError();
          if (parent.parentId !== null) throw new InvalidHierarchyDepthError();
          if (existing._count.children > 0) throw new InvalidHierarchyDepthError();
          nextDepthLevel = 2;
        }
      }

      // 3) Detección reactivate (Decisión PO D7).
      const wasActive = existing.isActive;
      const willBeActive = body.is_active ?? wasActive;
      const isReactivating = !wasActive && willBeActive;

      // 4) Sync denormalizado de `label` / `description`.
      const patch: Prisma.ServiceCategoryUpdateInput = {};
      if (body.name_i18n !== undefined) {
        const esLatam = (body.name_i18n as Record<string, string>)['es-LATAM']!;
        patch.nameI18n = body.name_i18n as Prisma.InputJsonObject;
        patch.label = esLatam;
      }
      if (body.description_i18n !== undefined) {
        patch.descriptionI18n = body.description_i18n as Prisma.InputJsonObject;
        patch.description = (body.description_i18n as Record<string, string>)['es-LATAM'] ?? null;
      }
      if (body.parent_id !== undefined) {
        patch.parent = body.parent_id
          ? { connect: { id: body.parent_id } }
          : { disconnect: true };
        patch.depthLevel = nextDepthLevel;
      }
      if (body.sort_order !== undefined) patch.sortOrder = body.sort_order;
      if (body.is_active !== undefined) patch.isActive = body.is_active;

      const updated = await tx.serviceCategory.update({ where: { id }, data: patch });

      // 5) AdminAction append-only (`reactivate` cuando aplique).
      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: currentUserId,
          action: isReactivating ? 'reactivate' : 'update',
          targetEntity: 'service_category',
          targetId: id,
          metadata: {
            correlationId: ctx.correlationId ?? null,
            reason: body.reason ?? null,
            from: {
              parent_id: existing.parentId,
              sort_order: existing.sortOrder,
              is_active: existing.isActive,
              depth_level: existing.depthLevel,
            },
            to: {
              parent_id: updated.parentId,
              sort_order: updated.sortOrder,
              is_active: updated.isActive,
              depth_level: updated.depthLevel,
            },
            patched_fields: Object.keys(body).filter((k) => k !== 'reason'),
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      this.logger.emit(isReactivating ? 'service_category.reactivated' : 'service_category.updated', {
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
