// US-024 (PB-P2-002) / BE-004 — TaskPriorityCacheService.
//
// Cache in-memory con TTL 5 minutos (D4) para el resultado de la priorización IA por evento.
// La key es `${eventId}:${signature}` — al cambiar el estado del checklist (nueva tarea, edición,
// cambio de status) `computeChecklistSignature` produce otra clave ⇒ cache miss automático
// (AC-05). Cardinalidad acotada por evento; lazy expiry en `get` para evitar timers residuales.
//
// Paridad con `MetricsCacheService` (US-079): mismo patrón de `clock` inyectable para tests
// deterministas de expiración; instancia compartida a nivel proceso (singleton en el módulo de
// composición) para que dos requests seguidas del mismo evento reutilicen el mismo mapa.
export interface Clock {
  now(): number;
}

const systemClock: Clock = { now: () => Date.now() };

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface TaskPriorityCachedPayload {
  aiRecommendationId: string;
  output: {
    top: Array<{ task_id: string; reason: string; urgency_score: number }>;
    rationale_summary?: string;
  };
  locale: string;
  localeFallback: boolean;
  generatedAt: Date;
}

export const TASK_PRIORITY_CACHE_TTL_MS = 5 * 60 * 1000;

export class TaskPriorityCacheService {
  private readonly entries = new Map<string, CacheEntry<TaskPriorityCachedPayload>>();

  constructor(
    private readonly clock: Clock = systemClock,
    private readonly ttlMs: number = TASK_PRIORITY_CACHE_TTL_MS,
  ) {}

  private buildKey(eventId: string, signature: string): string {
    return `${eventId}:${signature}`;
  }

  get(eventId: string, signature: string): TaskPriorityCachedPayload | null {
    const key = this.buildKey(eventId, signature);
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (this.clock.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(eventId: string, signature: string, value: TaskPriorityCachedPayload): void {
    const key = this.buildKey(eventId, signature);
    this.entries.set(key, { value, expiresAt: this.clock.now() + this.ttlMs });
  }

  invalidate(eventId: string, signature: string): void {
    this.entries.delete(this.buildKey(eventId, signature));
  }

  clear(): void {
    this.entries.clear();
  }
}
