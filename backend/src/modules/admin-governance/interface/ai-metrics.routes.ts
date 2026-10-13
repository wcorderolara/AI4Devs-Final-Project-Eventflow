// US-115 (PB-P2-012 / BE-005) — Ruta admin `GET /api/v1/admin/ai-metrics`.
//
// Cadena de middlewares (§7 Tech Spec · Decisión PO D2):
//   sessionAuth → roleMiddleware(['admin']) → validateRequestMiddleware(query) →
//   controller.getMetrics.
//
// Sin AdminAction (D7 · US-115 es READ-ONLY sin cambio de estado). El log
// estructurado del acceso lo emite el controlador (`admin.ai_metrics.viewed`).
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { requireSession, requireRole } from '../../../infrastructure/auth-composition.js';
import { aiMetricsQuerySchema } from '../../../shared/validation/ai-metrics.query.schema.js';
import { PrismaAIMetricsRepository } from '../infrastructure/prisma-ai-metrics.repository.js';
import { GetAIMetricsUseCase } from '../application/get-ai-metrics.use-case.js';
import { AIMetricsController } from './ai-metrics.controller.js';

const repository = new PrismaAIMetricsRepository();
const getAIMetrics = new GetAIMetricsUseCase(repository);
const controller = new AIMetricsController({ getAIMetrics });

export const adminAIMetricsRouter = Router();

adminAIMetricsRouter.use(requireSession, requireRole('admin'));

adminAIMetricsRouter.get(
  '/',
  validateRequestMiddleware(z.object({ query: aiMetricsQuerySchema })),
  asyncHandler(controller.getMetrics),
);
