// US-124 / QA-002, QA-004, QA-005 (AC-03..07, AC-10) — ValidatedAIExecutionService.
// Retry success, retry exhausted, no-retry para timeout/provider, output inválido nunca sale por
// success path, y fallback delegado validado con el mismo schema.
import { describe, it, expect } from 'vitest';
import { ValidatedAIExecutionService } from '../../src/modules/ai-assistance/application/ai-validation/validated-ai-execution.service.js';
import {
  AiInvalidOutputError,
  AiProviderTimeoutError,
} from '../../src/shared/domain/errors/ai.errors.js';

const service = new ValidatedAIExecutionService();
const VALID = { summary: 'Plan', phases: [{ name: 'F1', tasks: ['t1'] }] };
const INVALID = { summary: 'x', bad: true }; // falta phases + campo extra
const input = { featureType: 'event_plan' as const, correlationId: 'c-1', provider: 'openai' };

/** Generador que devuelve outputs en orden por intento; cuenta llamadas. */
function generator(outputs: unknown[]) {
  const calls = { count: 0 };
  const gen = async (attempt: number) => {
    calls.count += 1;
    return outputs[attempt];
  };
  return { gen, calls };
}

describe('US-124 AC-05 — retry success', () => {
  it('primer output inválido, retry válido => success con retryCount=1', async () => {
    const { gen } = generator([INVALID, VALID]);
    const r = await service.execute(input, { generate: gen });
    expect(r.metadata.schemaValid).toBe(true);
    expect(r.metadata.retryCount).toBe(1);
    expect(r.output).toEqual(VALID);
  });

  it('primer output válido => success con retryCount=0 (sin segundo intento)', async () => {
    const { gen, calls } = generator([VALID, VALID]);
    const r = await service.execute(input, { generate: gen });
    expect(r.metadata.retryCount).toBe(0);
    expect(calls.count).toBe(1);
  });
});

describe('US-124 AC-03/AC-06 — retry exhausted', () => {
  it('ambos outputs inválidos => AiInvalidOutputError (retryCount 1), sin tercer intento', async () => {
    const { gen, calls } = generator([INVALID, INVALID, VALID]);
    await expect(service.execute(input, { generate: gen })).rejects.toBeInstanceOf(AiInvalidOutputError);
    expect(calls.count).toBe(2); // NO hay tercer intento
  });

  it('AC-02: output inválido nunca sale por el success path (execute rechaza)', async () => {
    const { gen } = generator([INVALID, INVALID]);
    const outcome = await service.execute(input, { generate: gen }).then(() => 'success').catch(() => 'rejected');
    expect(outcome).toBe('rejected');
  });

  it('el error controlado incluye metadata segura sin raw output', async () => {
    const { gen } = generator([INVALID, INVALID]);
    try {
      await service.execute(input, { generate: gen });
    } catch (e) {
      const err = e as AiInvalidOutputError;
      expect(err.meta?.retryCount).toBe(1);
      expect(err.meta?.schemaName).toBe('ai.event_plan.output.v1');
      expect(JSON.stringify(err.meta)).not.toContain('"bad"');
    }
  });
});

describe('US-124 AC-04 — no retry para timeout/provider errors', () => {
  it('generate lanza AiProviderTimeoutError => se propaga sin retry', async () => {
    const calls = { count: 0 };
    const gen = async () => {
      calls.count += 1;
      throw new AiProviderTimeoutError();
    };
    await expect(service.execute(input, { generate: gen })).rejects.toBeInstanceOf(AiProviderTimeoutError);
    expect(calls.count).toBe(1); // no hubo retry de validación
  });
});

describe('US-124 AC-07 — fallback delegado y validado', () => {
  it('tras retry failure, fallback válido => success (provider mock)', async () => {
    const { gen } = generator([INVALID, INVALID]);
    const r = await service.execute(input, { generate: gen, fallback: async () => VALID });
    expect(r.metadata.schemaValid).toBe(true);
    expect(r.metadata.provider).toBe('mock');
  });

  it('fallback inválido => AiInvalidOutputError (fallback también valida el schema)', async () => {
    const { gen } = generator([INVALID, INVALID]);
    await expect(service.execute(input, { generate: gen, fallback: async () => INVALID })).rejects.toBeInstanceOf(AiInvalidOutputError);
  });
});
