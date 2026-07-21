// US-079 (PB-P1-045) / BE-002 — GetAdminMetricsUseCase.
//
// Compone 7 sub-agregados (users, vendors, events, quotes, bookings, reviews, ai) sobre el schema
// operativo y envuelve el resultado con cache in-memory TTL 60s (Decisión PO D3, Tech Spec §7).
// El propio use case emite los logs estructurados `admin.metrics.cache.hit/miss` (Tech Spec §14
// / BE-004) para que la observabilidad quede consistente aun si el controller cambia.
//
// Precedencia §4 (schema Prisma > Tech Spec):
//   - `EventStatus` real: draft | active | completed | cancelled (Tech Spec menciona
//     planning/in_progress — no existen en el enum). Se emiten sólo las claves reales.
//   - `AIRecommendation`: la columna es `kind` (no `recommendation_type`); el flag
//     `fallback_used` vive dentro de `aiMeta` JSONB (poblado por `persist-ai-recommendation.service`).
//     Para `success_count` filtramos por `aiMeta.path=['fallbackUsed'], equals=false`.
//
// AC-05 / SEC-02: el DTO `AdminMetricsResponse` es la ÚNICA fuente del shape emitido — sin
// campos comerciales (revenue/gmv/arpu/conversion_rate_*/monetary). QA-005 asserta la ausencia.
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import type { MetricsCacheService } from '../infrastructure/metrics-cache.service.js';
import type {
  AdminAIMetric,
  AdminBookingsMetric,
  AdminEventsMetric,
  AdminMetricsResponse,
  AdminQuotesMetric,
  AdminReviewsMetric,
  AdminUsersMetric,
  AdminVendorsMetric,
} from '../dto/admin-metrics.response.js';

export const ADMIN_METRICS_CACHE_KEY = 'admin:metrics:v1';
export const ADMIN_METRICS_TTL_MS = 60_000;

export interface GetAdminMetricsDeps {
  cache: MetricsCacheService;
  prisma?: PrismaClient;
  clock?: () => Date;
}

export interface GetAdminMetricsResult {
  metrics: AdminMetricsResponse;
  cacheHit: boolean;
}

export class GetAdminMetricsUseCase {
  private readonly cache: MetricsCacheService;
  private readonly prisma: PrismaClient;
  private readonly clock: () => Date;

  constructor(deps: GetAdminMetricsDeps) {
    this.cache = deps.cache;
    this.prisma = deps.prisma ?? defaultPrisma;
    this.clock = deps.clock ?? (() => new Date());
  }

  async execute(): Promise<GetAdminMetricsResult> {
    const cached = this.cache.get<AdminMetricsResponse>(ADMIN_METRICS_CACHE_KEY);
    if (cached) {
      logger.info({ event: 'admin.metrics.cache.hit', key: ADMIN_METRICS_CACHE_KEY });
      return { metrics: cached, cacheHit: true };
    }

    logger.info({ event: 'admin.metrics.cache.miss', key: ADMIN_METRICS_CACHE_KEY });

    const [users, vendors, events, quotes, bookings, reviews, ai] = await Promise.all([
      this.computeUsers(),
      this.computeVendors(),
      this.computeEvents(),
      this.computeQuotes(),
      this.computeBookings(),
      this.computeReviews(),
      this.computeAI(),
    ]);

    const metrics: AdminMetricsResponse = {
      users,
      vendors,
      events,
      quotes,
      bookings,
      reviews,
      ai,
      generated_at: this.clock().toISOString(),
    };

    this.cache.set(ADMIN_METRICS_CACHE_KEY, metrics, ADMIN_METRICS_TTL_MS);
    return { metrics, cacheHit: false };
  }

  private async computeUsers(): Promise<AdminUsersMetric> {
    const [total, byRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    ]);
    return {
      total,
      by_role: Object.fromEntries(byRole.map((r) => [r.role, r._count._all])),
    };
  }

  private async computeVendors(): Promise<AdminVendorsMetric> {
    const [total, byStatus, hiddenCount] = await Promise.all([
      this.prisma.vendorProfile.count(),
      this.prisma.vendorProfile.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.vendorProfile.count({ where: { isHidden: true } }),
    ]);
    return {
      total,
      by_status: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
      hidden_count: hiddenCount,
    };
  }

  private async computeEvents(): Promise<AdminEventsMetric> {
    const [total, byStatus] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      total,
      by_status: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    };
  }

  private async computeQuotes(): Promise<AdminQuotesMetric> {
    const [
      quoteRequestsCreated,
      quotesResponded,
      quotesAccepted,
      quotesRejected,
      quotesExpired,
    ] = await Promise.all([
      this.prisma.quoteRequest.count(),
      this.prisma.quote.count({ where: { status: { in: ['sent', 'accepted', 'rejected', 'expired'] } } }),
      this.prisma.quote.count({ where: { status: 'accepted' } }),
      this.prisma.quote.count({ where: { status: 'rejected' } }),
      this.prisma.quote.count({ where: { status: 'expired' } }),
    ]);
    return {
      quote_requests_created: quoteRequestsCreated,
      quotes_responded: quotesResponded,
      quotes_accepted: quotesAccepted,
      quotes_rejected: quotesRejected,
      quotes_expired: quotesExpired,
    };
  }

  private async computeBookings(): Promise<AdminBookingsMetric> {
    const [created, confirmed, cancelled] = await Promise.all([
      this.prisma.bookingIntent.count(),
      this.prisma.bookingIntent.count({ where: { status: 'confirmed_intent' } }),
      this.prisma.bookingIntent.count({ where: { status: 'cancelled' } }),
    ]);
    return {
      booking_intents_created: created,
      booking_intents_confirmed: confirmed,
      booking_intents_cancelled: cancelled,
    };
  }

  private async computeReviews(): Promise<AdminReviewsMetric> {
    const [total, byStatus] = await Promise.all([
      this.prisma.review.count(),
      this.prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      total,
      by_status: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    };
  }

  private async computeAI(): Promise<AdminAIMetric> {
    // Prisma `groupBy` sobre `kind` requiere que la columna JSONB no rompa la agregación; los
    // filtros por JSON path viven en `where`. Cargamos dos vistas:
    //  1) por kind (total)
    //  2) por kind con `aiMeta.fallbackUsed = false` (éxito no-fallback, D5).
    const [total, byKindTotal, byKindSuccess] = await Promise.all([
      this.prisma.aIRecommendation.count(),
      this.prisma.aIRecommendation.groupBy({ by: ['kind'], _count: { _all: true } }),
      this.prisma.aIRecommendation.groupBy({
        by: ['kind'],
        where: { aiMeta: { path: ['fallbackUsed'], equals: false } },
        _count: { _all: true },
      }),
    ]);
    const successMap = new Map(byKindSuccess.map((r) => [r.kind, r._count._all]));
    const byType: Record<string, { total_count: number; success_count: number }> = {};
    for (const row of byKindTotal) {
      byType[row.kind] = {
        total_count: row._count._all,
        success_count: successMap.get(row.kind) ?? 0,
      };
    }
    return {
      total_recommendations: total,
      by_type: byType,
    };
  }
}
