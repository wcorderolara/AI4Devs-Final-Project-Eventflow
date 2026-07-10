// US-086 (PB-P0-014) BE-004/BE-005 — Rutas del reset surgical Demo bajo `/api/v1/admin/seed`.
// Cadena por ruta: sessionAuth (401) → admin role guard (403) → validación Zod strict (400) →
// handler. El router SÓLO debe montarse cuando `SEED_DEMO_ENABLED=true` (ver `isSeedDemoEnabled` +
// el montaje condicional en `app.ts`): con el flag apagado la ruta no existe y Express responde 404
// natural (mitigación de fingerprinting THR-012, EC-01) — nunca 403 ni 503.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { ResetRequestSchema } from './seed-demo.dto.js';
import { SeedDemoController } from './seed-demo.controller.js';
import { ResetDemoUseCase } from '../application/reset-demo.use-case.js';
import { GetSeedStatusUseCase } from '../application/get-seed-status.use-case.js';
import { seedResetLock } from '../application/seed-reset.lock.js';
import { SeedDemoDataUseCase } from '../application/seed-demo-data.use-case.js';
import { DeterministicSeedAiProvider } from '../infrastructure/deterministic-seed-ai.provider.js';

/**
 * Gate operativo del reset (EC-01). Se evalúa al construir la app (`createApp()`), leyendo
 * `process.env` en el momento del boot para permitir alternarlo en tests. Con el flag apagado la
 * ruta NO se registra → 404 indistinguible de cualquier ruta inexistente.
 */
export function isSeedDemoEnabled(): boolean {
  return process.env.SEED_DEMO_ENABLED === 'true';
}

const controller = new SeedDemoController({
  reset: new ResetDemoUseCase({
    prisma,
    lock: seedResetLock,
    // Repoblado con proveedor AI determinista local (boundary ADR-ARCH-001: no importar
    // MockAIProvider de `ai-assistance` desde código de módulo).
    seedRunnerFactory: (correlationId) =>
      new SeedDemoDataUseCase({ prisma, ai: new DeterministicSeedAiProvider(), correlationId }),
  }),
  status: new GetSeedStatusUseCase(prisma),
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const adminOnly = roleMiddleware(['admin']);

export const seedDemoRouter = Router();

// Guards comunes: sesión válida + rol admin.
seedDemoRouter.use(sessionAuth, adminOnly);

seedDemoRouter.post(
  '/reset',
  validateRequestMiddleware(z.object({ body: ResetRequestSchema })),
  asyncHandler(controller.reset),
);

seedDemoRouter.get('/status', asyncHandler(controller.status));
