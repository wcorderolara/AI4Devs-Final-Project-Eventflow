// Adapter Prisma — AdminActionWritePort (US-041 / BE-002).
// Escritura mínima en `admin_actions`. TODO: relocalizar bajo `modules/admin-governance` cuando
// el módulo Admin formal exponga su propio port canónico.
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type {
  AdminActionInput,
  AdminActionWritePort,
} from '../ports/admin-action-write.port.js';

export class PrismaAdminActionWriteAdapter implements AdminActionWritePort {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async create(input: AdminActionInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.adminAction.create({
      data: {
        action: input.action,
        targetEntity: input.targetEntity,
        targetId: input.targetId,
        adminUserId: input.adminUserId ?? null,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        correlationId: input.correlationId ?? null,
        metadata:
          input.metadata === undefined || input.metadata === null
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue),
      },
    });
  }
}
