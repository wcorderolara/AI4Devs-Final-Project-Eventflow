// US-025 (PB-P1-016 / BE-002) — `AIRecommendationApplyStrategyRegistry`. Registro DI de strategies
// por `type` con detección de duplicados. Test dedicado enumera `AI_FEATURE_TYPES` para asegurar
// cobertura de los 8 tipos MVP; CI bloquea si se agrega un `type` sin strategy registrada.
import { AI_FEATURE_TYPES, type AiFeatureType } from '../../domain/ai-features.js';
import type { ApplyStrategy } from '../../domain/hitl/apply-strategy.contract.js';
import { RecommendationTypeNotApplicableError } from '../../domain/errors/hitl.errors.js';

export class AIRecommendationApplyStrategyRegistry {
  private readonly strategies = new Map<AiFeatureType, ApplyStrategy>();

  constructor(strategies: ReadonlyArray<ApplyStrategy> = []) {
    for (const s of strategies) this.register(s);
  }

  register(strategy: ApplyStrategy): void {
    if (this.strategies.has(strategy.type)) {
      throw new Error(`Duplicate apply strategy for type: ${strategy.type}`);
    }
    this.strategies.set(strategy.type, strategy);
  }

  resolve<T = unknown>(type: string): ApplyStrategy<T> {
    const isKnown = (AI_FEATURE_TYPES as readonly string[]).includes(type);
    if (!isKnown) {
      throw new RecommendationTypeNotApplicableError(type);
    }
    const s = this.strategies.get(type as AiFeatureType);
    if (!s) throw new RecommendationTypeNotApplicableError(type);
    return s as ApplyStrategy<T>;
  }

  /** Introspección — usado por el test de cobertura de enum (QA-001). */
  registeredTypes(): AiFeatureType[] {
    return Array.from(this.strategies.keys());
  }
}
