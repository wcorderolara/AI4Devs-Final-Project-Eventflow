// US-086 (PB-P0-014) BE-004 — Controlador DELGADO del reset surgical Demo. Lee el actor de la
// sesión (`req.user.id`) y el body ya validado, delega en los use cases y serializa el envelope
// estándar. El mapeo de errores (401/403/404/409/500) lo resuelve el `errorHandlerMiddleware`.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type { ResetRequest } from './seed-demo.dto.js';
import type { ResetDemoUseCase } from '../application/reset-demo.use-case.js';
import type { GetSeedStatusUseCase } from '../application/get-seed-status.use-case.js';

export interface SeedDemoUseCases {
  reset: ResetDemoUseCase;
  status: GetSeedStatusUseCase;
}

function requireAdminId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

export class SeedDemoController {
  constructor(private readonly useCases: SeedDemoUseCases) {}

  // POST /api/v1/admin/seed/reset → 202 Accepted con ResetReportDto.
  reset = async (req: Request, res: Response): Promise<void> => {
    const correlationId = req.correlationId ?? '';
    const body = (req.validated?.body ?? {}) as ResetRequest;
    const report = await this.useCases.reset.execute({
      actorAdminId: requireAdminId(req),
      correlationId,
      reason: body.reason,
    });
    res.status(202).json(success(report, correlationId));
  };

  // GET /api/v1/admin/seed/status → 200 OK con SeedStatusResponseDto.
  status = async (req: Request, res: Response): Promise<void> => {
    const correlationId = req.correlationId ?? '';
    requireAdminId(req);
    const status = await this.useCases.status.execute();
    res.status(200).json(success(status, correlationId));
  };
}
