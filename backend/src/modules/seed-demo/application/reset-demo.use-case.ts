// US-086 (PB-P0-014) BE-002 + OBS-001 — Reset surgical del entorno Demo.
// Orquesta: (1) lock optimista (EC-03), (2) limpieza surgical `WHERE is_seed = true` en orden FK
// descendente dentro de una transacción (rollback atómico, EC-02), (3) repoblado idempotente
// delegando en `SeedDemoDataUseCase` (US-085), (4) auditoría obligatoria en `AdminAction`
// (BR-ADMIN-004/011), (5) liberación del lock. Nunca toca filas `is_seed=false` (SEC-04).
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import {
  SeedResetFailedError,
  SeedResetInProgressError,
} from '../../../shared/domain/errors/seed-demo.errors.js';
import type { SeedReport } from '../domain/seed-report.js';
import type { ResetReportDto } from '../interface/seed-demo.dto.js';
import type { SeedResetLock } from './seed-reset.lock.js';

/** Runner de siembra idempotente (US-085). Se inyecta por factory para testeo aislado del reset. */
export interface SeedRunner {
  execute(): Promise<SeedReport>;
}

/** UUID centinela para `AdminAction.targetId` (requerido, no-null): el reset es global, sin target. */
const SEED_DEMO_TARGET_ID = '00000000-0000-0000-0000-000000000000';
const SEED_DEMO_TARGET_ENTITY = 'seed-demo';

// Orden de deletes: descendientes FK primero → ancestros al final. Cada tabla se filtra por
// `is_seed = true` (surgical). Modelos sin filas sembradas hoy (attachments, event_tasks, budgets,
// budget_items) se incluyen por robustez: `deleteMany` sobre 0 filas es inocuo.
const DELETE_ORDER: ReadonlyArray<{ entity: string; deleteMany: (tx: Prisma.TransactionClient) => Promise<{ count: number }> }> = [
  { entity: 'notifications', deleteMany: (tx) => tx.notification.deleteMany({ where: { isSeed: true } }) },
  { entity: 'aiRecommendations', deleteMany: (tx) => tx.aIRecommendation.deleteMany({ where: { isSeed: true } }) },
  { entity: 'reviews', deleteMany: (tx) => tx.review.deleteMany({ where: { isSeed: true } }) },
  { entity: 'bookingIntents', deleteMany: (tx) => tx.bookingIntent.deleteMany({ where: { isSeed: true } }) },
  { entity: 'quotes', deleteMany: (tx) => tx.quote.deleteMany({ where: { isSeed: true } }) },
  { entity: 'quoteRequests', deleteMany: (tx) => tx.quoteRequest.deleteMany({ where: { isSeed: true } }) },
  { entity: 'budgetItems', deleteMany: (tx) => tx.budgetItem.deleteMany({ where: { isSeed: true } }) },
  { entity: 'budgets', deleteMany: (tx) => tx.budget.deleteMany({ where: { isSeed: true } }) },
  { entity: 'eventTasks', deleteMany: (tx) => tx.eventTask.deleteMany({ where: { isSeed: true } }) },
  { entity: 'attachments', deleteMany: (tx) => tx.attachment.deleteMany({ where: { isSeed: true } }) },
  { entity: 'events', deleteMany: (tx) => tx.event.deleteMany({ where: { isSeed: true } }) },
  { entity: 'vendorServices', deleteMany: (tx) => tx.vendorService.deleteMany({ where: { isSeed: true } }) },
  // US-042 SEED-001: la M:N `vendor_profile_categories` no tiene `isSeed` propia — se filtra
  // por su vendorProfile padre. FK `ON DELETE RESTRICT` obliga a borrarla antes de vendor_profiles.
  {
    entity: 'vendorProfileCategories',
    deleteMany: (tx) =>
      tx.vendorProfileCategory.deleteMany({ where: { vendorProfile: { isSeed: true } } }),
  },
  { entity: 'vendorProfiles', deleteMany: (tx) => tx.vendorProfile.deleteMany({ where: { isSeed: true } }) },
  { entity: 'adminActions', deleteMany: (tx) => tx.adminAction.deleteMany({ where: { isSeed: true } }) },
  { entity: 'serviceCategories', deleteMany: (tx) => tx.serviceCategory.deleteMany({ where: { isSeed: true } }) },
  { entity: 'eventTypes', deleteMany: (tx) => tx.eventType.deleteMany({ where: { isSeed: true } }) },
  { entity: 'locations', deleteMany: (tx) => tx.location.deleteMany({ where: { isSeed: true } }) },
  { entity: 'users', deleteMany: (tx) => tx.user.deleteMany({ where: { isSeed: true } }) },
];

export interface ResetDemoCommand {
  actorAdminId: string;
  correlationId: string;
  reason?: string;
}

export interface ResetDemoDeps {
  prisma: PrismaClient;
  lock: SeedResetLock;
  /** Construye el runner de siembra con el `correlationId` del reset (idempotente, US-085). */
  seedRunnerFactory: (correlationId: string) => SeedRunner;
}

export class ResetDemoUseCase {
  constructor(private readonly deps: ResetDemoDeps) {}

  async execute(command: ResetDemoCommand): Promise<ResetReportDto> {
    const { prisma, lock } = this.deps;
    const { actorAdminId, correlationId, reason } = command;

    // EC-03 — Exclusión mutua. `acquire()` es síncrono: corre antes del primer await, por lo que un
    // segundo request concurrente lo encuentra ocupado y recibe 409.
    if (!lock.acquire()) {
      logger.warn({ event: 'seed.reset.conflict', correlationId, actorAdminId });
      throw new SeedResetInProgressError();
    }

    const startedAt = Date.now();
    logger.info({ event: 'seed.reset.started', correlationId, actorAdminId });

    try {
      // (1) Limpieza surgical atómica (rollback total ante error → EC-02).
      const entitiesDeleted: Record<string, number> = {};
      await prisma.$transaction(async (tx) => {
        for (const step of DELETE_ORDER) {
          const { count } = await step.deleteMany(tx);
          entitiesDeleted[step.entity] = count;
        }
      });

      // (2) Repoblado idempotente vía el runner de US-085 (upserts por clave natural).
      const seedReport = await this.deps.seedRunnerFactory(correlationId).execute();

      const entitiesReseeded: Record<string, number> = {};
      for (const [domain, counts] of Object.entries(seedReport.domains)) {
        entitiesReseeded[domain] = counts.created + counts.updated + counts.unchanged;
      }

      const durationMs = Date.now() - startedAt;
      const report: ResetReportDto = {
        entitiesDeleted,
        entitiesReseeded,
        seedVersion: seedReport.scriptVersion,
        correlationId,
        durationMs,
      };

      // (3) Auditoría obligatoria (éxito). `isSeed=false`: la fila de auditoría debe SOBREVIVIR al
      // próximo reset surgical.
      await this.writeAudit(prisma, {
        actorAdminId,
        action: 'SEED_RESET',
        correlationId,
        reason,
        metadata: { entitiesDeleted, entitiesReseeded, seedVersion: report.seedVersion, durationMs },
      });

      logger.info({
        event: 'seed.reset.completed',
        correlationId,
        actorAdminId,
        entitiesDeleted,
        entitiesReseeded,
        durationMs,
      });
      return report;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ event: 'seed.reset.failed', correlationId, actorAdminId, error: message });
      // Auditoría de fallo (best-effort: no enmascarar el error original si la auditoría también falla).
      await this.writeAudit(prisma, {
        actorAdminId,
        action: 'SEED_RESET_FAILED',
        correlationId,
        reason,
        metadata: { error: message },
      }).catch((auditErr) => {
        logger.error({
          event: 'seed.reset.audit_failed',
          correlationId,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        });
      });
      throw new SeedResetFailedError();
    } finally {
      lock.release();
    }
  }

  private async writeAudit(
    prisma: PrismaClient,
    input: {
      actorAdminId: string;
      action: 'SEED_RESET' | 'SEED_RESET_FAILED';
      correlationId: string;
      reason?: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    await prisma.adminAction.create({
      data: {
        adminUserId: input.actorAdminId,
        action: input.action,
        targetEntity: SEED_DEMO_TARGET_ENTITY,
        targetId: SEED_DEMO_TARGET_ID,
        metadata: { ...input.metadata, correlationId: input.correlationId, reason: input.reason ?? null } as Prisma.InputJsonValue,
        isSeed: false,
      },
    });
  }
}
