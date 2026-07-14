// US-031 (PB-P1-017 / BE-003) — Adapter Prisma del OwnedEventMutabilityReader.
// La query aplica ownership (`userId === ownerUserId`) por diseño: si no matchea, retorna `null`
// para preservar la no-revelación (SEC-04 / EC-02 → 404 global en el error handler).
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../../infrastructure/prisma/client.js';
import type {
  OwnedEventMutability,
  OwnedEventMutabilityReader,
} from '../ports/owned-event-mutability.reader.js';

export class PrismaOwnedEventMutabilityReader implements OwnedEventMutabilityReader {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async find(eventId: string, ownerUserId: string): Promise<OwnedEventMutability | null> {
    const e = await this.prisma.event.findFirst({
      where: { id: eventId, userId: ownerUserId },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!e) return null;

    let mutable = true;
    let immutableReason: OwnedEventMutability['immutableReason'];
    if (e.deletedAt !== null) {
      mutable = false;
      immutableReason = 'deleted';
    } else if (e.status === 'cancelled') {
      mutable = false;
      immutableReason = 'cancelled';
    } else if (e.status === 'completed') {
      mutable = false;
      immutableReason = 'completed';
    }

    return { id: e.id, status: e.status, mutable, immutableReason };
  }
}
