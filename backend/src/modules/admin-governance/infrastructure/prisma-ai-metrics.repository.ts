// US-115 (PB-P2-012 / BE-003). Repositorio read-only para métricas agregadas de
// AIRecommendation por feature y ventana temporal. Sirve al `GetAIMetricsUseCase`
// y se coloca en `admin-governance` (READ side) para no acoplar al bounded
// context de escritura HITL (`ai-assistance/ports/ai-recommendation.repository`).
//
// Deviation D-02 (execution record): el schema real de `ai_recommendations` no
// expone `latency_ms`, `fallback_used` ni `accepted` como columnas dedicadas.
// La latencia y el flag de fallback viven en `ai_meta` JSONB (`ai_meta.latencyMs`,
// `ai_meta.fallbackUsed`) — poblados por `persist-ai-recommendation.service` —
// y la aceptación es `status = 'accepted'` (`AIRecommendationStatus`).
//
// La query usa `NULLIF(COUNT(*), 0)` para evitar `NaN` cuando no hay data del
// tipo. Los redondeos aplicados (latencia 1 decimal; rates 4 decimales) son los
// declarados por el Tech Spec §7.
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type { AIMetricsRawRow, AIMetricsWindow } from '../domain/ai-metrics.types.js';

export interface AIMetricsRepository {
  getMetricsByWindow(window: AIMetricsWindow): Promise<AIMetricsRawRow[]>;
}

interface RawRow {
  type: string;
  count: bigint | number;
  latency_avg_ms: number | null;
  fallback_rate: number | null;
  acceptance_rate: number | null;
}

export class PrismaAIMetricsRepository implements AIMetricsRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async getMetricsByWindow(window: AIMetricsWindow): Promise<AIMetricsRawRow[]> {
    // La cláusula WHERE se compone con `Prisma.sql`/`Prisma.empty` — literales
    // controlados por el servidor, no por input del usuario (SEC-04: la única
    // superficie de query externa es `window`, ya validada por Zod strict).
    const whereClause =
      window === '24h'
        ? Prisma.sql`WHERE created_at >= NOW() - INTERVAL '24 hours'`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT
        kind AS type,
        COUNT(*)::int AS count,
        ROUND(AVG((ai_meta->>'latencyMs')::numeric), 1)::float8 AS latency_avg_ms,
        ROUND(
          (SUM(CASE WHEN (ai_meta->>'fallbackUsed')::boolean THEN 1 ELSE 0 END)::numeric
            / NULLIF(COUNT(*), 0)),
          4
        )::float8 AS fallback_rate,
        ROUND(
          (SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END)::numeric
            / NULLIF(COUNT(*), 0)),
          4
        )::float8 AS acceptance_rate
      FROM ai_recommendations
      ${whereClause}
      GROUP BY kind;
    `;

    return rows.map((r) => ({
      type: r.type,
      count: typeof r.count === 'bigint' ? Number(r.count) : r.count,
      latencyAvgMs: r.latency_avg_ms === null ? null : Number(r.latency_avg_ms),
      fallbackRate: r.fallback_rate === null ? null : Number(r.fallback_rate),
      acceptanceRate: r.acceptance_rate === null ? null : Number(r.acceptance_rate),
    }));
  }
}
