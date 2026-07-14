// US-025 (PB-P1-016) / QA-001 — Unit tests: `AIRecommendationApplyStrategyRegistry`,
// `OutputDtoResolver` y los errores tipados HITL. Prueba cobertura completa del enum
// `AI_FEATURE_TYPES` (8 tipos MVP) — CI bloquea si se agrega un `type` sin strategy registrada.
import { describe, it, expect } from 'vitest';
import { AI_FEATURE_TYPES, OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { AIRecommendationApplyStrategyRegistry } from '../../src/modules/ai-assistance/application/hitl/apply-strategy.registry.js';
import { OutputDtoResolver } from '../../src/modules/ai-assistance/application/hitl/output-dto.resolver.js';
import { MVP_APPLY_STRATEGIES } from '../../src/modules/ai-assistance/application/hitl/strategies/index.js';
import {
  RecommendationTypeNotApplicableError,
  RecommendationNotPendingError,
  EditedPayloadInvalidError,
  SideEffectFailedError,
  OwnershipDeniedError,
} from '../../src/modules/ai-assistance/domain/errors/hitl.errors.js';
import { ErrorCodes } from '../../src/shared/domain/errors/error-codes.js';

describe('US-025 / QA-001 — AIRecommendationApplyStrategyRegistry', () => {
  it('registra strategy y la resuelve por type', () => {
    const registry = new AIRecommendationApplyStrategyRegistry([...MVP_APPLY_STRATEGIES]);
    const s = registry.resolve('event_plan');
    expect(s.type).toBe('event_plan');
  });

  it('lanza RecommendationTypeNotApplicableError para type desconocido', () => {
    const registry = new AIRecommendationApplyStrategyRegistry([...MVP_APPLY_STRATEGIES]);
    expect(() => registry.resolve('nonexistent_type')).toThrow(RecommendationTypeNotApplicableError);
  });

  it('lanza RecommendationTypeNotApplicableError si el type es válido del enum pero sin strategy registrada', () => {
    // Registry vacío — todos los tipos válidos del enum deben rechazarse.
    const registry = new AIRecommendationApplyStrategyRegistry();
    for (const t of AI_FEATURE_TYPES) {
      expect(() => registry.resolve(t)).toThrow(RecommendationTypeNotApplicableError);
    }
  });

  it('detecta strategies duplicadas (mismo type)', () => {
    const registry = new AIRecommendationApplyStrategyRegistry();
    registry.register(MVP_APPLY_STRATEGIES[0]);
    expect(() => registry.register(MVP_APPLY_STRATEGIES[0])).toThrow(/Duplicate apply strategy/);
  });

  it('cobertura completa: MVP_APPLY_STRATEGIES cubre los 8 tipos AI_FEATURE_TYPES', () => {
    const registry = new AIRecommendationApplyStrategyRegistry([...MVP_APPLY_STRATEGIES]);
    const registered = new Set(registry.registeredTypes());
    for (const t of AI_FEATURE_TYPES) {
      expect(registered.has(t), `type ${t} sin strategy registrada`).toBe(true);
    }
    expect(registered.size).toBe(AI_FEATURE_TYPES.length);
  });
});

describe('US-025 / QA-001 — OutputDtoResolver', () => {
  const resolver = new OutputDtoResolver();

  it.each(AI_FEATURE_TYPES)('schemaFor(%s) retorna el schema del type', (type) => {
    const schema = resolver.schemaFor(type);
    expect(schema).toBe(OUTPUT_SCHEMAS[type]);
  });

  it('schemaFor(unknown) retorna null', () => {
    expect(resolver.schemaFor('does_not_exist')).toBeNull();
  });

  it('valida output correcto para event_plan (happy path)', () => {
    const schema = resolver.schemaFor('event_plan')!;
    const ok = schema.safeParse({ summary: 'Boda pequeña', phases: [{ name: 'T-30', tasks: ['reservar salón'] }] });
    expect(ok.success).toBe(true);
  });

  it('rechaza output inválido para event_plan', () => {
    const schema = resolver.schemaFor('event_plan')!;
    const bad = schema.safeParse({ summary: 42 });
    expect(bad.success).toBe(false);
  });
});

describe('US-025 / QA-001 — Errores tipados HITL', () => {
  it('RecommendationNotPendingError → code RECOMMENDATION_NOT_PENDING', () => {
    const err = new RecommendationNotPendingError();
    expect(err.code).toBe(ErrorCodes.RECOMMENDATION_NOT_PENDING);
  });

  it('RecommendationTypeNotApplicableError → code RECOMMENDATION_TYPE_NOT_APPLICABLE + type', () => {
    const err = new RecommendationTypeNotApplicableError('checklist');
    expect(err.code).toBe(ErrorCodes.RECOMMENDATION_TYPE_NOT_APPLICABLE);
    expect(err.type).toBe('checklist');
  });

  it('EditedPayloadInvalidError → code EDITED_PAYLOAD_INVALID + issuesSummary', () => {
    const err = new EditedPayloadInvalidError('foo.bar:invalid_type');
    expect(err.code).toBe(ErrorCodes.EDITED_PAYLOAD_INVALID);
    expect(err.zodIssuesSummary).toBe('foo.bar:invalid_type');
  });

  it('SideEffectFailedError → code SIDE_EFFECT_FAILED + type + cause', () => {
    const cause = new Error('DB conn');
    const err = new SideEffectFailedError('checklist', cause);
    expect(err.code).toBe(ErrorCodes.SIDE_EFFECT_FAILED);
    expect(err.type).toBe('checklist');
    expect(err.cause).toBe(cause);
  });

  it('OwnershipDeniedError(admin_excluded) → FORBIDDEN, (not_owner) → RESOURCE_NOT_FOUND', () => {
    const a = new OwnershipDeniedError('admin_excluded');
    expect(a.code).toBe(ErrorCodes.FORBIDDEN);
    const n = new OwnershipDeniedError('not_owner');
    expect(n.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
  });
});
