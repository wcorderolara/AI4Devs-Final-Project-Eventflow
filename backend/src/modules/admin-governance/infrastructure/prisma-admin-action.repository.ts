// US-016 / BE-002 — Adapter Prisma append-only para `AdminAction`. `correlation_id` se guarda
// dentro del JSON `metadata` (deviation D-01: la columna dedicada no existe en el schema actual;
// escalar a US-099). Ninguna operación UPDATE/DELETE expuesta.
import { Prisma } from '@prisma/client';
import type {
  AdminActionRepository,
  AdminActionCreateInput,
  PrismaTx,
} from '../ports/admin-action.repository.js';

export class PrismaAdminActionRepository implements AdminActionRepository {
  async create(
    tx: PrismaTx,
    input: AdminActionCreateInput,
  ): Promise<{ id: string; createdAt: Date }> {
    const metadata: Prisma.InputJsonObject = {
      correlationId: input.correlationId ?? null,
      ...(input.extraMetadata ?? {}),
    };
    const created = await (tx as Prisma.TransactionClient).adminAction.create({
      data: {
        adminUserId: input.adminUserId,
        action: input.action,
        targetEntity: input.targetEntity,
        targetId: input.targetId,
        metadata,
        isSeed: false,
      },
      select: { id: true, createdAt: true },
    });
    return created;
  }
}
