// US-036 (PB-P1-020 / BE-002, R1) — Adapter Prisma para `ServiceCategoryReadPort`.
// Vive dentro de `budget-management/infrastructure/` (módulo dueño del port) para respetar
// ADR-ARCH-001. Consulta `service_categories WHERE is_active = true AND deleted_at IS NULL`.
// Sin cache en MVP (dataset chico); memoizable en el composition root si crece.
import { prisma } from '../../../shared/infrastructure/prisma/prisma.client.js';
import type { ServiceCategoryReadPort } from '../ports/service-category-read.port.js';

export class PrismaServiceCategoryReadAdapter implements ServiceCategoryReadPort {
  async getActiveCodes(): Promise<Set<string>> {
    const rows = await prisma.serviceCategory.findMany({
      where: { isActive: true, deletedAt: null },
      select: { code: true },
    });
    return new Set(rows.map((r) => r.code));
  }

  async findIdByCode(code: string): Promise<string | null> {
    const row = await prisma.serviceCategory.findFirst({
      where: { code, isActive: true, deletedAt: null },
      select: { id: true },
    });
    return row?.id ?? null;
  }
}
