// US-015 / BE-004. Adapter node-cron del puerto Scheduler (ADR-BE-004).
//
// Nota: `node-cron` valida la expresión cron internamente al llamar `schedule`; una expresión
// inválida lanza síncronamente y el bootstrap (`registerJobs`) trata el error como fail-fast.
import cron from 'node-cron';
import type { Scheduler, ScheduledTaskHandle } from './scheduler.port.js';

export class NodeCronScheduler implements Scheduler {
  schedule(cronExpression: string, task: () => Promise<void> | void): ScheduledTaskHandle {
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
    const scheduled = cron.schedule(cronExpression, () => {
      // No relanzar: el use case ya captura por evento; cualquier error a este nivel se
      // registra en el log `end` a través del `try/finally` del job.
      Promise.resolve(task()).catch(() => undefined);
    });
    return { stop: (): void => scheduled.stop() };
  }
}
