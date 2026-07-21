// US-016 / BE-002 — Use case: lectura admin de un evento con auditoría transaccional.
// Contrato:
//   1. `findByIdIncludingDeleted` → null ⇒ NotFoundError (EC-02), sin auditar.
//   2. Insert `AdminAction(action='view_event')` en la misma `$transaction` (AC-01).
//   3. Devuelve `AdminEventReadView` (VR-02: whitelist explícita, sin datos internos sensibles).
//
// Cualquier falla del insert de auditoría revierte la transacción y se propaga al errorHandler
// como 500 (el controlador no oculta el error).
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import type { AdminEventRepository } from '../ports/admin-event.repository.js';
import type { AdminActionRepository } from '../ports/admin-action.repository.js';
import type { AdminEventReadView } from '../dto/admin-event-read.dto.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type { PrismaClient } from '@prisma/client';

export interface AdminViewEventInput {
  eventId: string;
  actorUserId: string;
  correlationId: string | null;
}

export class AdminViewEventUseCase {
  constructor(
    private readonly events: AdminEventRepository,
    private readonly adminActions: AdminActionRepository,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(input: AdminViewEventInput): Promise<AdminEventReadView> {
    // AC-01: transacción read + audit. El insert de AdminAction requiere el eventId, así que la
    // lectura se hace primero; ambos ocurren dentro del mismo `$transaction` para garantizar la
    // pista de auditoría (o rollback conjunto si el insert falla).
    //
    // US-078 §7 (AC-02/AC-04): preferimos `findDetailByIdIncludingDeleted` cuando existe
    // (default en producción con `PrismaAdminEventRepository`). Los fakes de test de US-016
    // sólo implementan `findByIdIncludingDeleted`; se hace fallback transparente para no
    // romper la suite legada.
    const finder = this.events.findDetailByIdIncludingDeleted
      ? this.events.findDetailByIdIncludingDeleted.bind(this.events)
      : this.events.findByIdIncludingDeleted.bind(this.events);

    return this.prisma.$transaction(async (tx) => {
      const row = await finder(input.eventId);
      if (!row) {
        // EC-02: no persistir AdminAction en 404. La transacción se cierra sin cambios.
        throw new NotFoundError('Event not found');
      }
      await this.adminActions.create(tx, {
        adminUserId: input.actorUserId,
        action: 'view_event',
        targetEntity: 'event',
        targetId: input.eventId,
        correlationId: input.correlationId,
      });

      // VR-02: whitelist explícita. `deleted` flag deriva de `deletedAt` (EC-01).
      // US-078: `counts` y `budgetSummary` se emiten cuando el repository los pobló
      // (default en producción). Ambos son opcionales en el contrato (dto), preservando
      // compatibilidad con consumers legados de US-016.
      const view: AdminEventReadView = {
        id: row.id,
        ownerId: row.ownerId,
        eventTypeCode: row.eventTypeCode,
        name: row.name,
        eventDate: row.eventDate,
        guestsCount: row.guestsCount,
        locationId: row.locationId,
        estimatedBudget: row.estimatedBudget,
        currencyCode: row.currencyCode,
        languageCode: row.languageCode,
        status: row.status,
        notes: row.notes,
        autoCompleted: row.autoCompleted,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
        deleted: row.deletedAt !== null,
        owner: row.owner,
        ...(row.counts !== undefined ? { counts: row.counts } : {}),
        ...(row.budgetSummary !== undefined ? { budgetSummary: row.budgetSummary } : {}),
      };
      return view;
    });
  }
}
