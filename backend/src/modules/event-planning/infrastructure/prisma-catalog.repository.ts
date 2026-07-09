// Adapters Prisma — catálogos EventType/Location (US-095 / BE-003). Validan existencia/activo
// para EC-04 (evento con tipo/location inválidos no persiste).
import type { PrismaClient } from '@prisma/client';
import type { EventTypeRepository, LocationRepository } from '../ports/event.repository.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

export class PrismaEventTypeRepository implements EventTypeRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findActiveIdByCode(code: string): Promise<string | null> {
    const row = await this.prisma.eventType.findFirst({
      where: { code, isActive: true, deletedAt: null },
      select: { id: true },
    });
    return row?.id ?? null;
  }
}

export class PrismaLocationRepository implements LocationRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async existsActive(id: string): Promise<boolean> {
    const row = await this.prisma.location.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    return row !== null;
  }
}
