// PrismaQuoteRequestActiveCounterAdapter (US-050 / BE-002). Implementación Prisma del
// `QuoteRequestActiveCounterPort`. Ejecuta un solo `COUNT(*)` filtrando por (event, category,
// status ∈ activos) y aplicando el filtro lazy `expires_at IS NULL OR expires_at > NOW()`
// cuando `notExpired=true`.
//
// Vive en `src/infrastructure/quote-flow/` (capa `app-infra`) para poder ser importado desde
// cualquier módulo sin violar `boundaries/element-types` (ADR-ARCH-001).
import type { PrismaClient, QuoteRequestStatus } from '@prisma/client';
import type {
  CountActiveByEventAndCategoryInput,
  QuoteRequestActiveCounterPort,
} from '../../shared/application/quote-request-active-counter.port.js';
import { prisma as defaultPrisma } from '../prisma/client.js';

export class PrismaQuoteRequestActiveCounterAdapter implements QuoteRequestActiveCounterPort {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async countActiveByEventAndCategory(
    input: CountActiveByEventAndCategoryInput,
  ): Promise<number> {
    const now = new Date();
    return this.prisma.quoteRequest.count({
      where: {
        eventId: input.eventId,
        serviceCategoryId: input.serviceCategoryId,
        status: { in: input.activeStatuses as QuoteRequestStatus[] },
        ...(input.notExpired
          ? { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
          : {}),
      },
    });
  }
}
