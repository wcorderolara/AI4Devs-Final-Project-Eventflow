// US-116 (PB-P2-013 / BE-005). Controlador thin de `/health` y `/health/ready`.
//
// Contrato (§7.7 · AC-07):
//   - `/health` → 200 sin log (bypass logger success — OBS-001).
//   - `/health/ready` → 200 sin log; 503 con `logger.warn` estructurado
//     `event: 'health.ready.dependency_down'` (§14). Exception inesperada →
//     `logger.error` + 503 defensivo con dependencies=down (VR-02: no expone
//     stack ni mensaje raw al response).
//
// El controlador NO usa `respond.success` / envelope canonical porque el shape
// canónico de US-116 (`docs/16 §21.3`) es un DTO plano sin `meta.correlationId`
// (AC-06 · VR-04). Esto es una excepción explícita al patrón general del repo
// documentada en ADR-API-004 (DOC-002).
import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import type { GetHealthUseCase } from '../../application/use-cases/get-health.use-case.js';
import type { GetReadinessUseCase } from '../../application/use-cases/get-readiness.use-case.js';

export interface HealthControllerDeps {
  health: GetHealthUseCase;
  readiness: GetReadinessUseCase;
  logger: Pick<Logger, 'warn' | 'error'>;
}

export class HealthController {
  constructor(private readonly deps: HealthControllerDeps) {}

  getHealth = (_req: Request, res: Response): void => {
    res.status(200).json(this.deps.health.execute());
  };

  getReadiness = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.deps.readiness.execute();
      if (result.httpStatus === 503) {
        this.deps.logger.warn(
          {
            event: 'health.ready.dependency_down',
            postgres: result.body.dependencies.postgres,
            aiProvider: result.body.dependencies.aiProvider,
            postgresLatencyMs: result.postgresLatencyMs,
          },
          'readiness check failed',
        );
      }
      res.status(result.httpStatus).json(result.body);
    } catch {
      this.deps.logger.error(
        { event: 'health.ready.exception' },
        'unexpected readiness failure',
      );
      res.status(503).json({
        status: 'error',
        version: 'unknown',
        uptimeMs: Math.floor(process.uptime() * 1000),
        timestamp: new Date().toISOString(),
        dependencies: { postgres: 'down', aiProvider: 'down' },
      });
    }
  };
}
