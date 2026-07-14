// US-028 (PB-P1-018 / BE-002) — Adapter Prisma del `ServiceCategoryReadPort`.
// Filtra `is_active=true` + `deleted_at IS NULL` para no aceptar categorías retiradas del
// catálogo. Cachea el resultado en memoria con TTL corto para mitigar el riesgo NFR-PERF-001
// declarado en §17 (lookup en el hot path del insert). El cache es local por instancia y se
// invalida por expiración — no requiere Redis en MVP.
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/infrastructure/prisma/prisma.client.js';
import type {
  ServiceCategoryReadPort,
  ServiceCategoryRow,
} from '../../ports/service-category-read.port.js';

const DEFAULT_CACHE_TTL_MS = 60_000;

interface CacheEntry {
  value: ServiceCategoryRow | null;
  expiresAt: number;
}

export interface PrismaServiceCategoryReadAdapterOptions {
  /** TTL del cache in-memory (ms). `0` desactiva el cache — útil en tests. */
  cacheTtlMs?: number;
}

export class PrismaServiceCategoryReadAdapter implements ServiceCategoryReadPort {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(opts: PrismaServiceCategoryReadAdapterOptions = {}) {
    this.ttlMs = opts.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  async findActiveByCode(
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ServiceCategoryRow | null> {
    // Cache hit — solo se aplica sin `tx` (dentro de una transacción, el lookup debe usar la
    // vista consistente de la transacción, no un valor pre-transacción).
    if (!tx && this.ttlMs > 0) {
      const cached = this.cache.get(code);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    const client = tx ?? prisma;
    const row = await client.serviceCategory.findFirst({
      where: { code, isActive: true, deletedAt: null },
      select: { code: true, label: true },
    });
    const value: ServiceCategoryRow | null = row
      ? { code: row.code, label: row.label }
      : null;

    if (!tx && this.ttlMs > 0) {
      this.cache.set(code, { value, expiresAt: Date.now() + this.ttlMs });
    }
    return value;
  }
}
