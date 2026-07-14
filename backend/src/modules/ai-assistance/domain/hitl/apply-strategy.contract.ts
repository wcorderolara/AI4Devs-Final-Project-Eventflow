// US-025 (PB-P1-016 / BE-002) — Contrato de `ApplyStrategy<T>`. Cada `type` de `AIRecommendation`
// tiene una strategy inyectable que materializa el side effect dentro de la transacción atómica
// del `ApplyAIRecommendationUseCase`. La strategy NO abre transacciones propias; recibe el
// cliente transaccional del caller (adapter-injectable, tipo estructural — evita importar
// `Prisma` desde `domain/` para respetar ADR-ARCH-002).
import type { AiFeatureType } from '../ai-features.js';
import type { AiRecommendationView } from '../ai-recommendation.js';

/**
 * Tipo estructural del cliente transaccional que las strategies reciben. Coincide en runtime
 * con `Prisma.TransactionClient` pero se declara localmente para no acoplar el domain a la
 * infraestructura (ADR-ARCH-002). Cada strategy interpreta este `any` con sus propios tipos
 * (`tx as Prisma.TransactionClient`) en la capa de aplicación.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransactionClient = any;

/**
 * Resultado del `applyInTransaction` — trazabilidad bidireccional opcional.
 * Cuando la strategy crea una entidad única, retorna `{ appliedEntityType, appliedEntityId }`.
 * Cuando materializa múltiples entidades o no materializa ninguna (`vendor_categories`,
 * `quote_comparison`), retorna `{ appliedEntityType: null, appliedEntityId: null }`.
 */
export interface ApplyStrategyOutcome {
  appliedEntityType: string | null;
  appliedEntityId: string | null;
}

export interface ApplyStrategyArgs<T = unknown> {
  /** Cliente transaccional inyectado por el use case; NUNCA abrir una nueva transacción aquí. */
  tx: TransactionClient;
  /** Vista de la recomendación (post-load, post-ownership). */
  recommendation: AiRecommendationView;
  /** Output efectivo a aplicar: `editedPayload` si el usuario editó, o el output original. */
  finalOutput: T;
  /** Actor autenticado (dueño). */
  actorId: string;
}

export interface ApplyStrategy<T = unknown> {
  readonly type: AiFeatureType;
  applyInTransaction(args: ApplyStrategyArgs<T>): Promise<ApplyStrategyOutcome>;
}
