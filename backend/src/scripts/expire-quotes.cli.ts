// CLI del ExpireQuotesJob (US-053 / BE-004). Fuerza una ejecución **inmediata** del
// `ExpireQuotesUs053UseCase` (sin jitter) contra la BD apuntada por `DATABASE_URL`.
//
// Uso: `npm run job:expire-quotes` (definido en `package.json`).
//
// Emite al stdout el resumen del run (`totalExpired`, `batchCount`, `durationMs`, `errorCount`).
// Termina con exit code 0 si el UC completó (incluso con 0 quotes), 1 si el UC lanzó excepción
// no capturable. Útil para QA/demo y para invocaciones ad-hoc en operación.
/* eslint-disable no-console */
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../infrastructure/prisma/client.js';
import { SystemClock } from '../infrastructure/time/system-clock.js';
import { StructuredDomainEventLogger } from '../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaQuoteNotificationSenderAdapter } from '../infrastructure/notifications/prisma-quote-notification-sender.adapter.js';
import { ExpireQuotesUs053UseCase } from '../modules/quote-flow/application/expire-quotes.us053.use-case.js';
import { QuoteNotificationService } from '../modules/quote-flow/services/quote-notification.service.js';
import { config } from '../config/env.js';

async function main(): Promise<void> {
  const clock = new SystemClock();
  const logger = new StructuredDomainEventLogger();
  const quoteNotifications = new QuoteNotificationService(
    new PrismaQuoteNotificationSenderAdapter(prisma),
    logger,
  );
  const uc = new ExpireQuotesUs053UseCase(quoteNotifications, clock, logger, prisma);
  const runId = uuidv4();
  const result = await uc.execute({
    correlationId: `cli-${runId}`,
    runId,
    batchSize: config.JOBS_EXPIRE_QUOTES_BATCH_SIZE,
  });
  console.log(JSON.stringify({ runId, ...result }));
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
