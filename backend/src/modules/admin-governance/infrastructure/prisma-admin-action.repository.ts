// US-016 / BE-002 — Adapter Prisma append-only para `AdminAction`. `correlation_id` se guarda
// dentro del JSON `metadata` (deviation D-01: la columna dedicada no existe en el schema actual;
// escalar a US-099). Ninguna operación UPDATE/DELETE expuesta.
import type { Prisma } from '@prisma/client';
import { recordAdminAction } from '../../../infrastructure/persistence/record-admin-action.js';
import type {
  AdminActionRepository,
  AdminActionCreateInput,
  PrismaTx,
} from '../ports/admin-action.repository.js';

export class PrismaAdminActionRepository implements AdminActionRepository {
  async create(tx: PrismaTx, input: AdminActionCreateInput): Promise<{ id: string }> {
    return recordAdminAction(tx as Prisma.TransactionClient, {
      adminUserId: input.adminUserId,
      action: input.action,
      targetEntity: input.targetEntity,
      targetId: input.targetId,
      correlationId: input.correlationId,
      metadata: input.extraMetadata,
      isSeed: false,
    });
  }
}
