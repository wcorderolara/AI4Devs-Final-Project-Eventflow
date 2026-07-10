// Entry point CLI del seed reproducible (US-085). Pipeline pura:
//   loadConfig → assertEnvSafety → assertSchemaReady → runSeed → emitReport → process.exit
// Exit codes: 0 éxito · 1 error de ejecución · 2 precondición incumplida (env/drift).
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { MockAIProvider } from '../modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { SeedDemoDataUseCase } from '../modules/seed-demo/application/seed-demo-data.use-case.js';
import { assertEnvSafety } from '../modules/seed-demo/infrastructure/environment-guard.js';
import {
  assertSchemaReady,
  MigrationDriftError,
} from '../modules/seed-demo/infrastructure/migration-status-checker.js';
import { parseSeedConfig } from '../modules/seed-demo/infrastructure/seed-config.schema.js';
import { emitSeedReport } from '../modules/seed-demo/infrastructure/seed-report-emitter.js';
import { logger } from '../shared/infrastructure/logger/index.js';

async function main(): Promise<number> {
  const correlationId = randomUUID();

  // 1. Config (Zod) — VR-01.
  let config;
  try {
    config = parseSeedConfig(process.env);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ event: 'seed.config.invalid', correlationId, message });
    process.stderr.write(`Seed config invalid: ${message}\n`);
    return 2;
  }

  // 2. Gate de seguridad — EC-03 / SEC-02.
  const safety = assertEnvSafety(config);
  if (!safety.safe) {
    logger.warn({ event: 'seed.env.blocked', correlationId, reason: safety.reason });
    process.stderr.write(`${safety.reason}\n`);
    return 2;
  }

  const prisma = new PrismaClient();
  try {
    // 3. Drift de migraciones — EC-02.
    try {
      await assertSchemaReady(prisma);
    } catch (err) {
      if (err instanceof MigrationDriftError) {
        logger.warn({ event: 'seed.migration.drift', correlationId });
        process.stderr.write(`${err.message}\n`);
        return 2;
      }
      // Conexión inaccesible / credenciales — EC-01.
      logger.error({ event: 'seed.db.unreachable', correlationId });
      process.stderr.write('Database unreachable. Check DATABASE_URL.\n');
      return 1;
    }

    // 4. Ejecutar el seed y emitir el reporte.
    logger.info({ event: 'seed.start', correlationId, provider: config.LLM_PROVIDER });
    const useCase = new SeedDemoDataUseCase({ prisma, ai: new MockAIProvider(), correlationId });
    const report = await useCase.execute();
    emitSeedReport(report);
    logger.info({ event: 'seed.finished', correlationId, durationMs: report.durationMs, exitCode: report.exitCode });
    return report.exitCode;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ event: 'seed.failed', correlationId, message });
    process.stderr.write(`Seed failed: ${message}\n`);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch(() => process.exit(1));
