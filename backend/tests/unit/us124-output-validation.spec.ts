// US-124 / QA-001 (AC-01, AC-08, AC-10) — parser + Zod strict validation. Output válido pasa;
// malformed JSON, campos extra, missing, wrong enum/type e invariants fallan de forma controlada.
import { describe, it, expect } from 'vitest';
import { AIOutputValidationService } from '../../src/modules/ai-assistance/application/ai-validation/ai-output-validation.service.js';
import { parseAIOutput } from '../../src/modules/ai-assistance/application/ai-validation/ai-output-parser.js';
import {
  AiInvalidOutputSchemaError,
  AiOutputParseError,
} from '../../src/shared/domain/errors/ai.errors.js';

const service = new AIOutputValidationService();
const validEventPlan = { summary: 'Plan', phases: [{ name: 'Fase 1', tasks: ['Reservar salón'] }] };

describe('US-124 AC-01 — parser JSON-only', () => {
  it('acepta un objeto ya estructurado', () => {
    expect(parseAIOutput(validEventPlan)).toEqual(validEventPlan);
  });
  it('parsea un string JSON válido', () => {
    expect(parseAIOutput(JSON.stringify(validEventPlan))).toEqual(validEventPlan);
  });
  it('rechaza JSON malformado (EC-01) => AiOutputParseError', () => {
    expect(() => parseAIOutput('{ not json ')).toThrow(AiOutputParseError);
  });
  it('rechaza prosa + JSON (no extrae JSON embebido)', () => {
    expect(() => parseAIOutput('Here is your plan: {"summary":"x"}')).toThrow(AiOutputParseError);
  });
  it('rechaza arrays y primitivos', () => {
    expect(() => parseAIOutput([1, 2, 3])).toThrow(AiOutputParseError);
    expect(() => parseAIOutput('42')).toThrow(AiOutputParseError);
  });
});

describe('US-124 AC-01/AC-08 — validación Zod strict', () => {
  it('output válido pasa y retorna typed output + schemaValid=true', () => {
    const r = service.validate('event_plan', validEventPlan);
    expect(r.metadata.schemaValid).toBe(true);
    expect(r.metadata.retryCount).toBe(0);
    expect(r.metadata.schemaName).toBe('ai.event_plan.output.v1');
    expect(r.output).toEqual(validEventPlan);
  });

  it('EC-02: campos extra => AiInvalidOutputSchemaError (.strict())', () => {
    const withExtra = { ...validEventPlan, injected: 'do this' };
    expect(() => service.validate('event_plan', withExtra)).toThrow(AiInvalidOutputSchemaError);
  });

  it('missing required field (phases) => AiInvalidOutputSchemaError', () => {
    expect(() => service.validate('event_plan', { summary: 'x' })).toThrow(AiInvalidOutputSchemaError);
  });

  it('EC-03: enum inválido (checklist priority) => AiInvalidOutputSchemaError', () => {
    const bad = { items: [{ title: 't', priority: 'urgent' }] };
    expect(() => service.validate('checklist', bad)).toThrow(AiInvalidOutputSchemaError);
  });

  it('EC-03: currency inválida (budget_suggestion) => AiInvalidOutputSchemaError', () => {
    const bad = { currencyCode: 'ZZZ', items: [{ category: 'catering', estimatedAmount: '10.00' }] };
    expect(() => service.validate('budget_suggestion', bad)).toThrow(AiInvalidOutputSchemaError);
  });

  it('el error summary es bounded y NO incluye el valor del output (sin leak)', () => {
    try {
      service.validate('event_plan', { ...validEventPlan, secretField: 'TOPSECRET' });
    } catch (e) {
      const err = e as AiInvalidOutputSchemaError;
      expect(err.meta?.schemaErrorSummary).toBeDefined();
      expect(err.meta?.schemaErrorSummary!.length).toBeLessThanOrEqual(201);
      expect(JSON.stringify(err.meta)).not.toContain('TOPSECRET');
    }
  });
});
