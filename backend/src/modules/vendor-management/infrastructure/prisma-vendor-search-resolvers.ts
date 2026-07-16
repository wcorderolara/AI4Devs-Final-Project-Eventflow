// Adapters Prisma para resolver slugs de `service_categories.code` y `locations.code`
// (US-045 / BE-004). Se separan de `PrismaVendorSearchRepository` por límite de responsabilidad:
// el repository consulta el listado; los resolvers responden con IDs a partir de slugs.
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type {
  LocationSlugResolver,
  ServiceCategorySlugResolver,
} from '../application/search-vendors.use-case.js';

export class PrismaServiceCategorySlugResolver implements ServiceCategorySlugResolver {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findActiveIdByCode(code: string): Promise<string | null> {
    const row = await this.prisma.serviceCategory.findFirst({
      where: { code, isActive: true, deletedAt: null },
      select: { id: true },
    });
    return row?.id ?? null;
  }
}

export class PrismaLocationSlugResolver implements LocationSlugResolver {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findIdByCode(code: string): Promise<string | null> {
    const row = await this.prisma.location.findFirst({
      where: { code, deletedAt: null },
      select: { id: true },
    });
    return row?.id ?? null;
  }
}
