// PR-5 / US-123 + US-124 — `AiGenerationService` con el wiring de producción: retry único de output
// inválido, fallback validado a mock sólo cuando la config lo habilita, errores de output del provider
// sin degradar a AI_PROVIDER_UNAVAILABLE, PII fuera del provider y semántica AI_DEMO_MODE en la factory.
import { describe, it, expect } from 'vitest';
import { AIExecutionService } from '../../src/modules/ai-assistance/application/ai-execution/ai-execution.service.js';
import { createAIExecutionService } from '../../src/modules/ai-assistance/infrastructure/ai-execution.factory.js';
import { config } from '../../src/config/env.js';
import { AiInvalidOutputError, AiProviderUnavailableError } from '../../src/shared/domain/errors/ai.errors.js';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { FakeProvider, execConfig, execInput, makeAiGenerationService } from '../helpers/ai-execution-fixtures.js';

const VALID_PLAN = { summary: 'Plan', phases: [{ name: 'F1', tasks: ['t1'] }] };

describe('PR-5 — AiGenerationService (US-123 + US-124)', () => {
  it('primario mock: aiMeta con provider/promptVersion del provider y schemaValid', async () => {
    const out = await makeAiGenerationService().generate('event_plan', { guests: 10 }, 'es-LATAM', undefined, 'corr-1');
    expect(out.aiMeta).toMatchObject({ provider: 'mock', promptVersion: 'mock:event_plan:v1', fallbackUsed: false, languageCode: 'es-LATAM' });
    expect(out.schemaValid).toBe(true);
    expect(out.execMeta).toMatchObject({ provider: 'mock', status: 'success', correlationId: 'corr-1' });
  });

  it('output inválido: 1 retry y luego AiInvalidOutputError (sin fallback si no es elegible)', async () => {
    const primary = new FakeProvider('resolve', { output: { invalid: true } });
    const svc = makeAiGenerationService(primary, { llmProvider: 'openai' });
    await expect(svc.generate('event_plan', { x: 1 }, 'es-LATAM', undefined)).rejects.toBeInstanceOf(AiInvalidOutputError);
    expect(primary.calls).toBe(2);
  });

  it('output inválido tras retry + fallback habilitado → mock validado, fallbackUsed=true', async () => {
    const primary = new FakeProvider('resolve', { output: { invalid: true } });
    const svc = makeAiGenerationService(primary, { llmProvider: 'openai', useMockFallback: true });
    const out = await svc.generate('event_plan', { x: 1 }, 'es-LATAM', undefined);
    expect(primary.calls).toBe(2);
    expect(out.aiMeta).toMatchObject({ provider: 'mock', fallbackUsed: true });
    expect(out.execMeta.status).toBe('fallback');
  });

  it('PII se excluye antes de llamar al provider (VR-08)', async () => {
    const seen: Record<string, unknown>[] = [];
    const primary = {
      generate: async (req: { input: Record<string, unknown> }) => {
        seen.push(req.input);
        return { output: VALID_PLAN, provider: 'mock' as const, promptVersion: 'p', latencyMs: 1, fallbackUsed: false };
      },
    };
    await makeAiGenerationService(primary).generate('event_plan', { guests: 1, email: 'a@b.c', phone: '555' }, 'es-LATAM', undefined);
    expect(seen).toEqual([{ guests: 1 }]);
  });

  it('failureMeta usa la metadata segura del error y respeta fallback ⇒ mock', () => {
    const svc = makeAiGenerationService(new MockAIProvider(), { llmProvider: 'openai', timeoutMs: 1234 });
    expect(svc.failureMeta(new AiInvalidOutputError())).toEqual({ provider: 'openai', fallbackUsed: false, timeoutMs: 1234, latencyMs: 0 });
    expect(svc.failureMeta(new AiProviderUnavailableError('x', { provider: 'mock', fallbackUsed: true, latencyMs: 7, timeoutMs: 50 })))
      .toEqual({ provider: 'mock', fallbackUsed: true, timeoutMs: 50, latencyMs: 7 });
  });
});

describe('PR-5 — AIExecutionService', () => {
  it('output inválido del provider se propaga tal cual (no AI_PROVIDER_UNAVAILABLE)', async () => {
    const service = new AIExecutionService({
      primaryProvider: new FakeProvider('throw', { error: new AiInvalidOutputError() }),
      mockProvider: new FakeProvider('resolve'),
      config: execConfig({ useMockFallback: true }),
    });
    await expect(service.execute(execInput)).rejects.toBeInstanceOf(AiInvalidOutputError);
  });

  it('executeMockFallback devuelve output del mock con metadata de fallback', async () => {
    const service = new AIExecutionService({ primaryProvider: new FakeProvider('resolve'), mockProvider: new FakeProvider('resolve', { output: { via: 'mock' }, provider: 'mock' }), config: execConfig() });
    const res = await service.executeMockFallback(execInput);
    expect(res.output).toEqual({ via: 'mock' });
    expect(res.metadata).toMatchObject({ provider: 'mock', originalProvider: 'openai', fallbackUsed: true, status: 'fallback', fallbackReason: 'AI_INVALID_OUTPUT' });
  });

  it('factory: AI_DEMO_MODE conserva la semántica histórica (primario mock, sin fallback mock→mock)', () => {
    const demo = createAIExecutionService({ ...config, LLM_PROVIDER: 'openai', AI_DEMO_MODE: true, NODE_ENV: 'test' });
    expect(demo.primaryProviderId).toBe('mock');
    expect(demo.isFallbackEligible()).toBe(false);
    const mock = createAIExecutionService({ ...config, LLM_PROVIDER: 'mock', AI_DEMO_MODE: false, AI_USE_MOCK_FALLBACK: true, NODE_ENV: 'test' });
    expect(mock.primaryProviderId).toBe('mock');
    expect(mock.isFallbackEligible()).toBe(false);
  });
});
