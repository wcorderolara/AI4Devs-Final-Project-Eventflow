// US-015 / BE-004 + BE-005. Registrador único de jobs intra-proceso (ADR-BE-004).
//
// `registerJobs` es el único punto de bootstrap para schedulers: si `JOBS_ENABLED=false`
// (default en dev/test/QA y en todas las réplicas salvo la designada) el registrador NO
// programa nada (EC-03, SEC-01..04). Con `true` valida la expresión cron (fail-fast a través
// del adapter `NodeCronScheduler`) y registra `AutoCompletePastEventsJob`.
//
// No hay ruta HTTP asociada; el job SOLO se activa por scheduler. La ausencia de endpoint es
// una decisión de seguridad, validada por el test TASK-PB-P1-009-US-015-SEC-001.
import { config } from '../config/env.js';
import { logger } from '../shared/infrastructure/logger/index.js';
import { SystemClock } from '../infrastructure/time/system-clock.js';
import { PrismaEventRepository } from '../modules/event-planning/infrastructure/prisma-event.repository.js';
import { AutoCompletePastEventsUseCase } from '../modules/event-planning/application/auto-complete-past-events.use-case.js';
import { AutoCompletePastEventsJob } from './auto-complete-past-events.job.js';
import { ExpireQuotesJob } from './expire-quotes.job.js';
import { ExpireQuotesUs053UseCase } from '../modules/quote-flow/application/expire-quotes.us053.use-case.js';
import { PrismaQuoteNotificationSenderAdapter } from '../infrastructure/notifications/prisma-quote-notification-sender.adapter.js';
// US-054 (BE-004) + US-056 (BE-002/003): el UC de expiración consume el service común genérico
// `QuoteEventNotificationService` en lugar de invocar directamente el port de notifications.
import { QuoteEventNotificationService } from '../modules/quote-flow/services/quote-event-notification.service.js';
// US-055 (PB-P1-033 / BE-004 + BE-006): registro del `ExpireQuoteRequestsJob` en el mismo
// bootstrap. Reusa `Scheduler`, `ClockPort` y `DomainEventLogger` del ExpireQuotesJob.
import { ExpireQuoteRequestsJob } from './expire-quote-requests.job.js';
import { ExpireQuoteRequestsUs055UseCase } from '../modules/quote-flow/application/expire-quote-requests.us055.use-case.js';
import { StructuredDomainEventLogger } from '../infrastructure/observability/structured-domain-event-logger.js';
// US-034 (PB-P2-004 / OPS-001): registro del `EmitT7NotificationsJob` en el mismo
// bootstrap. Consume la fuente `America/Guatemala` (D1) vía `ScheduleOptions.timezone`.
import { EmitT7NotificationsJob } from './emit-t7-notifications.job.js';
import { EmitT7NotificationsUseCase } from '../modules/notifications/application/emit-t7-notifications.use-case.js';
import { PrismaEventTaskT7Repository } from '../modules/task-management/infrastructure/prisma-event-task-t7.repository.js';
import { PrismaNotificationT7Repository } from '../modules/notifications/infrastructure/prisma-notification-t7.repository.js';
import { LoggingSimulatedT7EmailAdapter } from '../modules/notifications/infrastructure/logging-simulated-t7-email.adapter.js';
import { PrismaOrganizerLanguageLookup } from '../modules/event-planning/infrastructure/prisma-organizer-language.lookup.js';
import { NodeCronScheduler } from './node-cron-scheduler.js';
import type { Scheduler, ScheduledTaskHandle } from './scheduler.port.js';

export interface JobRegistryHandle {
  /** Handles activos (vacío si `JOBS_ENABLED=false`). */
  handles: ScheduledTaskHandle[];
  /** Detiene todos los schedulers registrados (para tests y graceful shutdown). */
  stopAll(): void;
}

export interface RegisterJobsDeps {
  scheduler?: Scheduler;
  clock?: import('../shared/domain/clock.port.js').ClockPort;
  autoCompleteUseCase?: AutoCompletePastEventsUseCase;
  expireQuotesUseCase?: ExpireQuotesUs053UseCase;
  expireQuoteRequestsUseCase?: ExpireQuoteRequestsUs055UseCase;
  emitT7UseCase?: EmitT7NotificationsUseCase;
  now?: () => Date;
}

/**
 * Registra los jobs intra-proceso si `config.JOBS_ENABLED` es `true`. Con `false` retorna un
 * handle vacío sin efectos secundarios (útil para tests de bootstrap: US-015 SEC-001).
 */
export function registerJobs(deps: RegisterJobsDeps = {}): JobRegistryHandle {
  if (!config.JOBS_ENABLED) {
    logger.info({
      event: 'jobs.registry.disabled',
      reason: 'JOBS_ENABLED=false',
    });
    return { handles: [], stopAll: () => undefined };
  }

  const scheduler = deps.scheduler ?? new NodeCronScheduler();
  const clock = deps.clock ?? new SystemClock();
  const useCase =
    deps.autoCompleteUseCase ??
    new AutoCompletePastEventsUseCase({
      repo: new PrismaEventRepository(),
      clock,
      logger,
    });
  const autoCompleteJob = new AutoCompletePastEventsJob({
    useCase,
    clock,
    logger,
    cadence: config.JOBS_AUTOCOMPLETE_CRON,
  });

  const handle = scheduler.schedule(config.JOBS_AUTOCOMPLETE_CRON, () => autoCompleteJob.run());
  const handles = [handle];

  // US-053 (PB-P1-031): ExpireQuotesJob. Comparte `Scheduler` con el job de US-015 y usa el
  // `StructuredDomainEventLogger` para colar los eventos en el canal de dominio (canal `error`
  // para `.failed`).
  const domainLogger = new StructuredDomainEventLogger();
  const quoteEvents = new QuoteEventNotificationService(
    new PrismaQuoteNotificationSenderAdapter(),
    domainLogger,
  );
  const expireQuotesUseCase =
    deps.expireQuotesUseCase ??
    new ExpireQuotesUs053UseCase(quoteEvents, clock, domainLogger);
  const expireQuotesJob = new ExpireQuotesJob({
    useCase: expireQuotesUseCase,
    clock,
    logger: domainLogger,
    cadence: config.JOBS_EXPIRE_QUOTES_CRON,
    jitterMaxMs: config.JOBS_EXPIRE_QUOTES_JITTER_MAX_MS,
    batchSize: config.JOBS_EXPIRE_QUOTES_BATCH_SIZE,
  });
  handles.push(scheduler.schedule(config.JOBS_EXPIRE_QUOTES_CRON, () => expireQuotesJob.run()));

  // US-055 (PB-P1-033 / BE-006): `ExpireQuoteRequestsJob`. Comparte `Scheduler`, `ClockPort`
  // y `DomainEventLogger` con el `ExpireQuotesJob`. Cron alineado a `0 1 * * *` (D2); el
  // jitter ±5min lo desincroniza del `ExpireQuotesJob` en la ejecución real.
  const expireQuoteRequestsUseCase =
    deps.expireQuoteRequestsUseCase ??
    new ExpireQuoteRequestsUs055UseCase(clock, domainLogger, {
      qrExpirationDays: config.QR_EXPIRATION_DAYS,
      batchSize: config.JOBS_EXPIRE_QUOTE_REQUESTS_BATCH_SIZE,
    });
  const expireQuoteRequestsJob = new ExpireQuoteRequestsJob({
    useCase: expireQuoteRequestsUseCase,
    clock,
    logger: domainLogger,
    cadence: config.JOBS_EXPIRE_QUOTE_REQUESTS_CRON,
    jitterMaxMs: config.JOBS_EXPIRE_QUOTE_REQUESTS_JITTER_MAX_MS,
    batchSize: config.JOBS_EXPIRE_QUOTE_REQUESTS_BATCH_SIZE,
  });
  handles.push(
    scheduler.schedule(config.JOBS_EXPIRE_QUOTE_REQUESTS_CRON, () => expireQuoteRequestsJob.run()),
  );

  // US-034 (PB-P2-004 / OPS-001): `EmitT7NotificationsJob`. Cron único diario a 08:00
  // hora local de Guatemala (D1). Se registra únicamente si `JOBS_EMIT_T7_ENABLED=true`
  // dentro del gate global `JOBS_ENABLED`.
  const emitT7Jobs: string[] = [];
  if (config.JOBS_EMIT_T7_ENABLED) {
    const emitT7UseCase =
      deps.emitT7UseCase ??
      new EmitT7NotificationsUseCase({
        clock,
        taskRepo: new PrismaEventTaskT7Repository(),
        notificationRepo: new PrismaNotificationT7Repository(),
        languageLookup: new PrismaOrganizerLanguageLookup(),
        emailAdapter: new LoggingSimulatedT7EmailAdapter(),
        logger,
        batchSize: config.JOBS_EMIT_T7_BATCH_SIZE,
      });
    const emitT7Job = new EmitT7NotificationsJob({
      useCase: emitT7UseCase,
      clock,
      logger,
      cadence: config.JOBS_EMIT_T7_CRON,
    });
    handles.push(
      scheduler.schedule(config.JOBS_EMIT_T7_CRON, () => emitT7Job.run(), {
        timezone: config.JOBS_EMIT_T7_TZ,
      }),
    );
    emitT7Jobs.push('emit-t7-notifications');
  }

  logger.info({
    event: 'jobs.registry.enabled',
    jobs: [
      'auto-complete-past-events',
      'expire-quotes',
      'expire-quote-requests',
      ...emitT7Jobs,
    ],
    cadence: {
      autoComplete: config.JOBS_AUTOCOMPLETE_CRON,
      expireQuotes: config.JOBS_EXPIRE_QUOTES_CRON,
      expireQuoteRequests: config.JOBS_EXPIRE_QUOTE_REQUESTS_CRON,
      emitT7: config.JOBS_EMIT_T7_ENABLED
        ? `${config.JOBS_EMIT_T7_CRON} (${config.JOBS_EMIT_T7_TZ})`
        : 'disabled',
    },
  });

  return {
    handles,
    stopAll: (): void => {
      for (const h of handles) h.stop();
    },
  };
}
