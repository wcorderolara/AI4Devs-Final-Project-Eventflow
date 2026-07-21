// US-079 (PB-P1-045) / BE-001 — MetricsCacheService.
// Cache in-memory con TTL para el dashboard admin de métricas operativas (Tech Spec §7).
// Bounded a 1 entrada canónica (`admin:metrics:v1`, Decisión PO D3): cardinalidad fija ⇒ sin
// riesgo de OOM. Provee `clock` inyectable para tests deterministas de expiración.
//
// La instancia se comparte a nivel proceso (singleton export) para que el `Cache-Control:
// private, max-age=60` del cliente y el TTL server-side se alineen. Se acepta como trade-off que
// múltiples instancias horizontales cacheen por separado (cache miss inicial por réplica); en
// MVP la app corre en una única réplica.
export interface Clock {
  now(): number;
}

const systemClock: Clock = { now: () => Date.now() };

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MetricsCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  constructor(private readonly clock: Clock = systemClock) {}

  get<T>(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (this.clock.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.entries.set(key, { data, expiresAt: this.clock.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
