// CreateEventTypeUseCase (US-076 / BE-004). Tech Spec §7. AC-01 + EC-02 + EC-03.
//
// POST /api/v1/admin/event-types → 201 con `EventTypeView` + AdminAction append-only.
// Toda la lógica en un `prisma.$transaction` (Decisión PO D6): validar → insertar
// EventType → insertar AdminAction. NO hay chain audit inverso en `event_types`
// (no existe `admin_action_id` columna) porque el catálogo es "cold" — a diferencia
// de VendorProfile/Review, no requiere leer el último acto sin JOIN a `admin_actions`.
// Los admins consultan el historial vía `admin_actions.target_entity='event_type'`.
//
// Invariantes:
//   1. `es-LATAM` requerido en `name_i18n` → `INVALID_NAME_I18N` (VR-03 / EC-03).
//   2. `code` único → detección eager con SELECT antes del INSERT para producir
//      `DUPLICATE_CODE` (patrón US-075) en lugar de exponer P2002 crudo.
//
// Denormalización de `label`: se puebla desde `name_i18n['es-LATAM']` para compat con
// callers legacy (`PrismaEventTypeRepository.findActive`, `useEventTypes` FE) que
// proyectan `label` directo. Idéntico criterio para `description` desde
// `description_i18n['es-LATAM']`. Sin esta denormalización, esos consumers necesitarían
// resolver locale — cambio de scope no autorizado.
import { Prisma, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  DuplicateEventTypeCodeError,
  InvalidNameI18nError,
} from '../domain/us076.errors.js';
import type { CreateEventTypeBody as CreateBodyFromDto } from '../interface/event-type.dto.js';
import { toEventTypeView, type EventTypeView } from './event-type.view.js';

/**
 * Tipo de entrada del UseCase. Deriva del DTO Zod pero re-declara `sort_order` como
 * opcional para que el `.default(0)` del schema no obligue a los callers (tests, seed,
 * fixtures) a pasarlo explícitamente. El UseCase aplica `?? 0` internamente.
 */
export type CreateEventTypeBody = Omit<CreateBodyFromDto, 'sort_order'> & {
  sort_order?: number;
};

export interface CreateEventTypeCtx {
  correlationId?: string;
}

export class CreateEventTypeUseCase {
  constructor(
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    body: CreateEventTypeBody,
    ctx: CreateEventTypeCtx = {},
  ): Promise<EventTypeView> {
    assertNameI18nHasEsLatam(body.name_i18n);

    return this.prisma.$transaction(async (tx) => {
      // 1) Detección eager de código duplicado (EC-02 / VR-02). El UNIQUE de BD sigue
      // siendo la última línea de defensa (P2002 → mapping por `DuplicateEventTypeCodeError`).
      const dup = await tx.eventType.findUnique({
        where: { code: body.code },
        select: { id: true },
      });
      if (dup) throw new DuplicateEventTypeCodeError();

      // 2) INSERT EventType — `label` y `description` denormalizados desde i18n['es-LATAM'].
      const esLatamName = (body.name_i18n as Record<string, string>)['es-LATAM']!;
      const esLatamDesc = (body.description_i18n as Record<string, string> | undefined)?.['es-LATAM'];
      const created = await tx.eventType.create({
        data: {
          code: body.code,
          label: esLatamName,
          description: esLatamDesc ?? null,
          nameI18n: body.name_i18n as Prisma.InputJsonObject,
          descriptionI18n: body.description_i18n
            ? (body.description_i18n as Prisma.InputJsonObject)
            : undefined,
          sortOrder: body.sort_order ?? 0,
          isActive: true,
        },
      });

      // 3) INSERT AdminAction append-only (Decisión PO D6; BR-ADMIN-011). `metadata`
      // guarda snapshot mínimo — sin FKs cross-domain a `event_types.admin_action_id`.
      const adminAction = await tx.adminAction.create({
        data: {
          adminUserId: currentUserId,
          action: 'create',
          targetEntity: 'event_type',
          targetId: created.id,
          metadata: {
            correlationId: ctx.correlationId ?? null,
            reason: body.reason ?? null,
            snapshot: {
              code: created.code,
              sort_order: created.sortOrder,
              name_i18n: body.name_i18n,
              description_i18n: body.description_i18n ?? null,
            },
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      this.logger.emit('event_type.created', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        adminUserId: currentUserId,
        eventTypeId: created.id,
        code: created.code,
        adminActionId: adminAction.id,
      });

      return toEventTypeView(created);
    });
  }
}

/** Invariante D3/VR-03 — separado para reuso en `Update`. */
export function assertNameI18nHasEsLatam(nameI18n: Record<string, unknown> | undefined): void {
  if (!nameI18n || typeof nameI18n !== 'object') throw new InvalidNameI18nError();
  const val = (nameI18n as Record<string, unknown>)['es-LATAM'];
  if (typeof val !== 'string' || val.trim().length === 0) {
    throw new InvalidNameI18nError();
  }
}
