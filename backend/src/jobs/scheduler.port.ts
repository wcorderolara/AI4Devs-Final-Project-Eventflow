// US-015 / BE-004. Puerto de scheduler intra-proceso (ADR-BE-004).
//
// Abstrae `node-cron` para que los tests puedan sustituirlo por un fake determinista sin
// depender del reloj real. El scheduler recibe una expresión cron (ej. `30 0 * * *`) y una
// tarea async; el adapter concreto vive en `node-cron-scheduler.ts`.
export interface ScheduledTaskHandle {
  /** Detiene el disparo del scheduler (idempotente). */
  stop(): void;
}

export interface Scheduler {
  /**
   * Registra `task` para ejecutarse según `cronExpression`. Si la expresión es inválida el
   * adapter DEBE lanzar antes de retornar; el caller (jobs/index.ts) trata el error como
   * fail-fast de bootstrap.
   */
  schedule(cronExpression: string, task: () => Promise<void> | void): ScheduledTaskHandle;
}
