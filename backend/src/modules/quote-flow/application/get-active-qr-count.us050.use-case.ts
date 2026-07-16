// GetActiveQrCountUs050UseCase (US-050 / BE-003). Tech Spec §7 UseCase; AC-03, EC-01..EC-03.
// Orquesta el endpoint `GET /api/v1/quote-requests/active-count`:
//   1. Ownership del evento (SEC-02, uniforme `404 EVENT_NOT_FOUND` — hereda US-049 SEC-05).
//   2. Categoría existe y `is_active=true` (VR-03) → `400 INVALID_CATEGORY`.
//   3. Conteo lazy vía `QuoteRequestActiveCounterPort` — `status ∈ ('sent','viewed','responded')`
//      AND `(expires_at IS NULL OR expires_at > NOW())` (DEV-01/DEV-02 del execution record).
//   4. Cálculo de `available_slots = max(0, limit - active_count)` con `limit=5` (BR-QUOTE-009).
import type { PrismaClient } from '@prisma/client';
import type { QuoteRequestActiveCounterPort } from '../../../shared/application/quote-request-active-counter.port.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  EventNotFoundError,
  ServiceCategoryUnavailableError,
} from '../domain/us049.errors.js';
import type {
  ActiveQrCountUs050Query,
  ActiveQrCountUs050Response,
} from '../dto/active-qr-count.us050.query.js';

/** Estados considerados "activos" — alineado con el enum físico `QuoteRequestStatus` (DEV-02). */
const ACTIVE_STATUSES = ['sent', 'viewed', 'responded'] as const;

/** Límite por (event, service_category) — BR-QUOTE-009 / C-016. */
export const QR_CATEGORY_LIMIT = 5;

export class GetActiveQrCountUs050UseCase {
  constructor(
    private readonly counter: QuoteRequestActiveCounterPort,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(currentUserId: string, query: ActiveQrCountUs050Query): Promise<ActiveQrCountUs050Response> {
    // Ownership: `404 EVENT_NOT_FOUND` uniforme (SEC-05 US-049) — evento inexistente o ajeno
    // devuelven el mismo código; no se revela existencia.
    const event = await this.prisma.event.findFirst({
      where: { id: query.event_id, userId: currentUserId, deletedAt: null },
      select: { id: true },
    });
    if (!event) throw new EventNotFoundError();

    // Categoría existente y activa (VR-03 / EC-03).
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id: query.service_category_id, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!category) throw new ServiceCategoryUnavailableError();

    const activeCount = await this.counter.countActiveByEventAndCategory({
      eventId: query.event_id,
      serviceCategoryId: query.service_category_id,
      activeStatuses: ACTIVE_STATUSES,
      notExpired: true,
    });

    return {
      active_count: activeCount,
      limit: QR_CATEGORY_LIMIT,
      available_slots: Math.max(0, QR_CATEGORY_LIMIT - activeCount),
      statuses_counted: ACTIVE_STATUSES,
    };
  }
}
