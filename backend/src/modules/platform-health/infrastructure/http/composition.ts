// US-116 (PB-P2-013 / BE-006). Composition root del módulo `platform-health`.
//
// Instancia probes + use cases + controller con Prisma singleton + Pino singleton, y
// expone `platformHealthRouter` listo para montar en `app.ts`. Se separa del router
// para preservar el patrón DI (tests instancian `buildPlatformHealthRouter` con doubles).
import { prisma } from '../../../../infrastructure/prisma/client.js';
import { logger } from '../../../../shared/logger.js';
import { GetHealthUseCase } from '../../application/use-cases/get-health.use-case.js';
import { GetReadinessUseCase } from '../../application/use-cases/get-readiness.use-case.js';
import { AiProviderProbe } from '../probes/ai-provider.probe.js';
import { PostgresProbe } from '../probes/postgres.probe.js';
import { HealthController } from './health.controller.js';
import { buildPlatformHealthRouter } from './platform-health.router.js';

const pgProbe = new PostgresProbe(prisma);
const aiProbe = new AiProviderProbe();
const healthUseCase = new GetHealthUseCase();
const readinessUseCase = new GetReadinessUseCase(pgProbe, aiProbe);
const controller = new HealthController({
  health: healthUseCase,
  readiness: readinessUseCase,
  logger,
});

export const platformHealthRouter = buildPlatformHealthRouter(controller);
