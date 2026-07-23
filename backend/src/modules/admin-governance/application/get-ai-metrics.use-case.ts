// US-115 (PB-P2-012 / BE-004). GetAIMetricsUseCase.
//
// Compone las ventanas solicitadas (`24h` | `all-time` | `both`), consulta el
// repository read-only por cada una y llena las 7 features canónicas con
// `count=0, latencyAvgMs=null, fallbackRate=null, acceptanceRate=null` cuando
// no aparecen en el resultado agregado (AC-05).
//
// AC-06 (invariante 24h ≤ all-time) es un invariante natural del filtro SQL:
// el WHERE de la ventana `24h` es un subset del `all-time`. El use case no
// asserta el invariante — lo verifica QA-002.
import type {
  AIFeatureMetric,
  AIMetricsResponse,
  AIMetricsWindow,
  AIMetricsWindowRequested,
  AIWindowMetrics,
} from '../domain/ai-metrics.types.js';
import { CANONICAL_AI_FEATURES } from '../domain/ai-metrics.types.js';
import type { AIMetricsRepository } from '../infrastructure/prisma-ai-metrics.repository.js';

export interface GetAIMetricsInput {
  userId: string;
  window: AIMetricsWindowRequested;
}

export class GetAIMetricsUseCase {
  constructor(private readonly repo: AIMetricsRepository) {}

  async execute(input: GetAIMetricsInput): Promise<AIMetricsResponse> {
    const windowsToInclude: AIMetricsWindow[] =
      input.window === 'both' ? ['24h', 'all-time'] : [input.window];

    const windows: AIWindowMetrics[] = await Promise.all(
      windowsToInclude.map(async (win) => {
        const rows = await this.repo.getMetricsByWindow(win);
        const byType = new Map(rows.map((r) => [r.type, r]));
        const features: AIFeatureMetric[] = CANONICAL_AI_FEATURES.map((type) => {
          const row = byType.get(type);
          const count = row ? Number(row.count) : 0;
          if (count === 0) {
            return {
              type,
              count: 0,
              latencyAvgMs: null,
              fallbackRate: null,
              acceptanceRate: null,
            };
          }
          return {
            type,
            count,
            latencyAvgMs: row?.latencyAvgMs ?? null,
            fallbackRate: row?.fallbackRate ?? null,
            acceptanceRate: row?.acceptanceRate ?? null,
          };
        });
        return { window: win, features };
      }),
    );

    return { windows };
  }
}
