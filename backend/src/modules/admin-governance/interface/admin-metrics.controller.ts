// US-079 (PB-P1-045) / BE-003 — Controlador `GET /api/v1/admin/metrics`.
// Delgado: valida presencia de sesión admin (guards en la ruta) e invoca el use case. Setea el
// header `Cache-Control: private, max-age=60` (Decisión PO D3, Tech Spec §7) para alinear el
// cache client-side con el TTL server-side.
//
// El log estructurado de acceso `admin.metrics.viewed` se emite aquí (Tech Spec §14 / BE-004);
// los eventos `cache.hit` / `cache.miss` los emite el use case.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import type { GetAdminMetricsUseCase } from '../application/get-admin-metrics.use-case.js';

export interface AdminMetricsControllerDeps {
  getMetrics: GetAdminMetricsUseCase;
}

export class AdminMetricsController {
  constructor(private readonly deps: AdminMetricsControllerDeps) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const actorUserId = req.user?.id;
    if (!actorUserId) throw new UnauthorizedError();

    const startedAt = Date.now();
    const { metrics, cacheHit } = await this.deps.getMetrics.execute();

    res.setHeader('Cache-Control', 'private, max-age=60');
    logger.info({
      event: 'admin.metrics.viewed',
      actorUserId,
      correlationId: req.correlationId ?? null,
      latencyMs: Date.now() - startedAt,
      cacheHit,
    });
    res.status(200).json(success(metrics, req.correlationId ?? ''));
  };
}
