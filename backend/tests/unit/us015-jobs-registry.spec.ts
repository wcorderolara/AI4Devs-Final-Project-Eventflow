// US-015 / SEC-001 + BE-005 — Bootstrap gated de jobs y ausencia de endpoint HTTP.
//
// Cubre:
// * `JOBS_ENABLED=false` → `registerJobs` no programa nada (EC-03, SEC-01..04).
// * `JOBS_ENABLED=true` → programa con la cadencia configurada.
// * Cadencia inválida → NodeCronScheduler adapter falla fail-fast (EC-03 operativo).
// * No existe ruta HTTP `/jobs/auto-complete*` en el árbol de routers (SEC-03).
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  Scheduler,
  ScheduledTaskHandle,
  ScheduleOptions,
} from '../../src/jobs/scheduler.port.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface RecordedTask {
  cron: string;
  task: () => Promise<void> | void;
  options?: ScheduleOptions;
}

class RecordingScheduler implements Scheduler {
  tasks: RecordedTask[] = [];
  schedule(
    cronExpression: string,
    task: () => Promise<void> | void,
    options?: ScheduleOptions,
  ): ScheduledTaskHandle {
    this.tasks.push({ cron: cronExpression, task, options });
    return { stop: (): void => undefined };
  }
}

afterEach(() => {
  vi.resetModules();
});

async function loadRegistry(env: Record<string, string>): Promise<typeof import('../../src/jobs/index.js')> {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  vi.resetModules();
  return await import('../../src/jobs/index.js');
}

describe('US-015 — registerJobs gated por JOBS_ENABLED', () => {
  it('JOBS_ENABLED=false: no registra ningún scheduler (default seguro)', async () => {
    const { registerJobs } = await loadRegistry({ JOBS_ENABLED: 'false' });
    const scheduler = new RecordingScheduler();
    const handle = registerJobs({ scheduler });
    expect(scheduler.tasks).toHaveLength(0);
    expect(handle.handles).toHaveLength(0);
  });

  it('JOBS_ENABLED=true: registra AutoComplete + ExpireQuotes + ExpireQuoteRequests + EmitT7 con sus cadencias', async () => {
    // US-053 (PB-P1-031): `registerJobs` agrega `ExpireQuotesJob`.
    // US-055 (PB-P1-033): `registerJobs` agrega `ExpireQuoteRequestsJob`.
    // US-034 (PB-P2-004): `registerJobs` agrega `EmitT7NotificationsJob` con timezone
    // `America/Guatemala` (D1). Los cuatro jobs comparten el `Scheduler` port de US-015.
    const { registerJobs } = await loadRegistry({
      JOBS_ENABLED: 'true',
      JOBS_AUTOCOMPLETE_CRON: '30 0 * * *',
      JOBS_EXPIRE_QUOTES_CRON: '0 1 * * *',
      JOBS_EXPIRE_QUOTE_REQUESTS_CRON: '0 1 * * *',
      JOBS_EMIT_T7_CRON: '0 8 * * *',
      JOBS_EMIT_T7_TZ: 'America/Guatemala',
      JOBS_EMIT_T7_ENABLED: 'true',
    });
    const scheduler = new RecordingScheduler();
    const handle = registerJobs({ scheduler });
    expect(scheduler.tasks).toHaveLength(4);
    const crons = scheduler.tasks.map((t) => t.cron).sort();
    expect(crons).toEqual(['0 1 * * *', '0 1 * * *', '0 8 * * *', '30 0 * * *']);
    // US-034: la tarea T-7 se registra con `timezone: 'America/Guatemala'` (D1).
    const t7 = scheduler.tasks.find((t) => t.cron === '0 8 * * *');
    expect(t7?.options?.timezone).toBe('America/Guatemala');
    expect(handle.handles).toHaveLength(4);
    handle.stopAll();
  });

  it('US-034: JOBS_EMIT_T7_ENABLED=false → sólo se registran los 3 jobs previos, no el emisor T-7', async () => {
    const { registerJobs } = await loadRegistry({
      JOBS_ENABLED: 'true',
      JOBS_EMIT_T7_ENABLED: 'false',
    });
    const scheduler = new RecordingScheduler();
    const handle = registerJobs({ scheduler });
    expect(scheduler.tasks).toHaveLength(3);
    handle.stopAll();
  });
});

describe('US-015 — NodeCronScheduler fail-fast con expresión inválida', () => {
  it('NodeCronScheduler lanza si la expresión cron es inválida', async () => {
    const { NodeCronScheduler } = await import('../../src/jobs/node-cron-scheduler.js');
    const s = new NodeCronScheduler();
    expect(() => s.schedule('not-a-cron', () => undefined)).toThrow(/Invalid cron expression/);
  });
});

describe('US-015 / SEC-001 — el job NO expone endpoints HTTP', () => {
  it('grep en árbol de routers: no existe ruta /jobs/auto-complete*', () => {
    const routesRoot = join(process.cwd(), 'src', 'modules');
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (entry.endsWith('.ts')) {
          const contents = readFileSync(full, 'utf8');
          if (/\/jobs\/auto-complete/i.test(contents) || /auto-complete-past-events.*route/i.test(contents)) {
            offenders.push(full);
          }
        }
      }
    };
    walk(routesRoot);
    // El adapter/job puede referenciarse desde `src/jobs/` (fuera del árbol de routers). El
    // testeo aquí es sobre las capas HTTP: NO debe existir ninguna referencia a rutas del job.
    expect(offenders).toEqual([]);
  });
});
