// US-015 / SEC-001 + BE-005 — Bootstrap gated de jobs y ausencia de endpoint HTTP.
//
// Cubre:
// * `JOBS_ENABLED=false` → `registerJobs` no programa nada (EC-03, SEC-01..04).
// * `JOBS_ENABLED=true` → programa con la cadencia configurada.
// * Cadencia inválida → NodeCronScheduler adapter falla fail-fast (EC-03 operativo).
// * No existe ruta HTTP `/jobs/auto-complete*` en el árbol de routers (SEC-03).
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Scheduler, ScheduledTaskHandle } from '../../src/jobs/scheduler.port.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface RecordedTask {
  cron: string;
  task: () => Promise<void> | void;
}

class RecordingScheduler implements Scheduler {
  tasks: RecordedTask[] = [];
  schedule(cronExpression: string, task: () => Promise<void> | void): ScheduledTaskHandle {
    this.tasks.push({ cron: cronExpression, task });
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

  it('JOBS_ENABLED=true: registra AutoComplete + ExpireQuotes + ExpireQuoteRequests con sus cadencias', async () => {
    // US-053 (PB-P1-031): `registerJobs` agrega `ExpireQuotesJob`.
    // US-055 (PB-P1-033): `registerJobs` agrega `ExpireQuoteRequestsJob`. Los tres jobs
    // comparten el `Scheduler` port de US-015.
    const { registerJobs } = await loadRegistry({
      JOBS_ENABLED: 'true',
      JOBS_AUTOCOMPLETE_CRON: '30 0 * * *',
      JOBS_EXPIRE_QUOTES_CRON: '0 1 * * *',
      JOBS_EXPIRE_QUOTE_REQUESTS_CRON: '0 1 * * *',
    });
    const scheduler = new RecordingScheduler();
    const handle = registerJobs({ scheduler });
    expect(scheduler.tasks).toHaveLength(3);
    const crons = scheduler.tasks.map((t) => t.cron).sort();
    expect(crons).toEqual(['30 0 * * *', '0 1 * * *', '0 1 * * *'].sort());
    expect(handle.handles).toHaveLength(3);
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
