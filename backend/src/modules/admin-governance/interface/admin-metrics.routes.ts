// US-079 (PB-P1-045) / BE-003 — Ruta admin `GET /api/v1/admin/metrics`.
// Cadena: sessionAuth → roleMiddleware(['admin']) → controller.get. AdminGuard reuso (US-067
// SessionMiddleware + role guard). Sin AdminAction (Decisión PO D4).
//
// El cache in-memory `MetricsCacheService` se instancia a nivel módulo para que la vida útil
// coincida con la del proceso Express (TTL 60s server-side alineado con el `Cache-Control`
// client-side).
import { Router } from 'express';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { MetricsCacheService } from '../infrastructure/metrics-cache.service.js';
import { GetAdminMetricsUseCase } from '../application/get-admin-metrics.use-case.js';
import { AdminMetricsController } from './admin-metrics.controller.js';

const metricsCache = new MetricsCacheService();
const getMetrics = new GetAdminMetricsUseCase({ cache: metricsCache });
const controller = new AdminMetricsController({ getMetrics });

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const adminOnly = roleMiddleware(['admin']);

export const adminMetricsRouter = Router();
adminMetricsRouter.use(sessionAuth, adminOnly);
adminMetricsRouter.get('/', asyncHandler(controller.get));

/** Sólo para tests que necesitan resetear estado entre casos (QA-002). */
export const __adminMetricsCacheForTests = metricsCache;
