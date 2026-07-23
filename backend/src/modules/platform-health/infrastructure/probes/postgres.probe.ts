// US-116 (PB-P2-013 / BE-003). Probe read-only sobre Postgres para readiness.
//
// Ejecuta `SELECT 1` con timeout duro de 500 ms via `Promise.race` (AC-03, EC-01,
// §7.3 · NFR-PERF-001 P95 < 500ms). El caller (`GetReadinessUseCase`) mapea
// `down` a `status='error'` + HTTP 503 y `ok` a HTTP 200.
//
// La cláusula SQL es literal (no depende de input del cliente); Prisma template
// literal parametriza estructuralmente. `catch` opaco: nunca se propaga stack ni
// mensaje raw al response (VR-02 · SEC-02).
import type { PrismaClient } from '@prisma/client';

export type PostgresCheckResult = { status: 'ok' | 'down'; latencyMs: number };

export const POSTGRES_TIMEOUT_MS = 500;

export class PostgresProbe {
  constructor(private readonly prisma: PrismaClient) {}

  async check(): Promise<PostgresCheckResult> {
    const start = process.hrtime.bigint();
    let timer: NodeJS.Timeout | null = null;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('postgres_check_timeout')),
            POSTGRES_TIMEOUT_MS,
          );
        }),
      ]);
      return { status: 'ok', latencyMs: elapsedMs(start) };
    } catch {
      return { status: 'down', latencyMs: elapsedMs(start) };
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }
}

function elapsedMs(start: bigint): number {
  return Number((process.hrtime.bigint() - start) / 1_000_000n);
}
