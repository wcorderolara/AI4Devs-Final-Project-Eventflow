// US-116 (PB-P2-013 / BE-004). GetReadinessUseCase — combina PostgresProbe +
// AiProviderProbe y determina `status` + `httpStatus` según la matriz §7.6:
//
//   pg='down'                              → status='error',    httpStatus=503
//   pg='ok'   + ai='down'                  → status='degraded', httpStatus=200
//   pg='ok'   + ai ∈ {'ok', 'mock'}        → status='ok',       httpStatus=200
//
// AC-03: sólo `postgres='down'` dispara 503; `aiProvider='down'` reporta
// `degraded` pero mantiene 200 (LLM no bloquea rotación de tráfico).
// AC-06 (invariante consistency): 24h.count ≤ all-time.count — N/A aquí; la
// invariante de readiness es que el HTTP status refleja la severidad correcta.
import { getAppVersion } from '../../../../shared/config/app-version.js';
import type { ReadyResponseDto } from '../../domain/types.js';
import type { AiProviderProbe } from '../../infrastructure/probes/ai-provider.probe.js';
import type { PostgresProbe } from '../../infrastructure/probes/postgres.probe.js';

export type ReadinessResult = {
  httpStatus: 200 | 503;
  body: ReadyResponseDto;
  postgresLatencyMs: number;
};

export class GetReadinessUseCase {
  constructor(
    private readonly pg: PostgresProbe,
    private readonly ai: AiProviderProbe,
  ) {}

  async execute(): Promise<ReadinessResult> {
    const pgResult = await this.pg.check();
    const aiResult = this.ai.check();

    let status: ReadyResponseDto['status'];
    let httpStatus: 200 | 503;
    if (pgResult.status === 'down') {
      status = 'error';
      httpStatus = 503;
    } else if (aiResult === 'down') {
      status = 'degraded';
      httpStatus = 200;
    } else {
      status = 'ok';
      httpStatus = 200;
    }

    return {
      httpStatus,
      postgresLatencyMs: pgResult.latencyMs,
      body: {
        status,
        version: getAppVersion(),
        uptimeMs: Math.floor(process.uptime() * 1000),
        timestamp: new Date().toISOString(),
        dependencies: { postgres: pgResult.status, aiProvider: aiResult },
      },
    };
  }
}
