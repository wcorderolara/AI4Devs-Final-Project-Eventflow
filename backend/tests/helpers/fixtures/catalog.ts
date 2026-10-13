// Referencias de catálogo ya semilladas (event type, location y opcionalmente categoría activa).
// Devuelven `null` si falta alguna, para que el spec decida el skip.
import type { PrismaClient } from '@prisma/client';

export async function pickCatalogRefs(
  prisma: PrismaClient,
): Promise<{ eventTypeId: string; locationId: string } | null> {
  const [eventType, location] = await Promise.all([
    prisma.eventType.findFirst({ where: { isActive: true, deletedAt: null } }),
    prisma.location.findFirst({ where: { deletedAt: null } }),
  ]);
  if (!eventType || !location) return null;
  return { eventTypeId: eventType.id, locationId: location.id };
}

export async function pickCatalogRefsWithCategory(prisma: PrismaClient): Promise<{
  eventTypeId: string;
  locationId: string;
  serviceCategoryId: string;
  serviceCategoryCode: string;
} | null> {
  const [eventType, location, category] = await Promise.all([
    prisma.eventType.findFirst({ where: { isActive: true, deletedAt: null } }),
    prisma.location.findFirst({ where: { deletedAt: null } }),
    prisma.serviceCategory.findFirst({ where: { isActive: true, deletedAt: null } }),
  ]);
  if (!eventType || !location || !category) return null;
  return {
    eventTypeId: eventType.id,
    locationId: location.id,
    serviceCategoryId: category.id,
    serviceCategoryCode: category.code,
  };
}
