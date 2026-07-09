// US-123 / QA-002, QA-003, QA-005, QA-006 + AI-001/002/003 (AC-01..06, AC-09) — AIExecutionService.
// Timeout con/sin fallback, mock primario, no Anthropic fallback, metadata, y determinismo del mock.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AIExecutionService } from '../../src/modules/ai-assistance/application/ai-execution/ai-execution.service.js';
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  AiFallbackFailedError,
} from '../../src/shared/domain/errors/ai.errors.js';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { FakeProvider, execConfig, execInput } from '../helpers/ai-execution-fixtures.js';

afterEach(() => vi.useRealTimers());

describe('US-123 AC-01/AC-03 — timeout sin fallback (EC-01)', () => {
  it('provider excede timeout y fallback deshabilitado => AiProviderTimeoutError, sin llamar mock', async () => {
    vi.useFakeTimers();
    const mock = new FakeProvider('resolve');
    const service = new AIExecutionService({ primaryProvider: new FakeProvider('hang'), mockProvider: mock, config: execConfig() });
    const promise = service.execute(execInput);
    const assertion = expect(promise).rejects.toBeInstanceOf(AiProviderTimeoutError);
    await vi.advanceTimersByTimeAsync(60000);
    await assertion;
    expect(mock.calls).toBe(0);
  });

  it('el error de timeout expone metadata segura (AC-06)', async () => {
    vi.useFakeTimers();
    const service = new AIExecutionService({ primaryProvider: new FakeProvider('hang'), mockProvider: new FakeProvider('resolve'), config: execConfig({ timeoutMs: 30000 }) });
    const captured = service.execute(execInput).catch((e) => e);
    await vi.advanceTimersByTimeAsync(30000);
    const err = (await captured) as AiProviderTimeoutError;
    expect(err.meta?.originalErrorCode).toBe('AI_PROVIDER_TIMEOUT');
    expect(err.meta?.fallbackUsed).toBe(false);
    expect(err.meta?.correlationId).toBe('corr-123');
    expect(err.meta?.timeoutMs).toBe(30000);
  });
});

describe('US-123 AC-02/AC-05 — fallback habilitado', () => {
  it('provider falla y fallback enabled => MockAIProvider con fallbackUsed=true', async () => {
    const mock = new FakeProvider('resolve', { output: { via: 'mock' }, provider: 'mock' });
    const service = new AIExecutionService({
      primaryProvider: new FakeProvider('throw', { error: new AiProviderUnavailableError() }),
      mockProvider: mock,
      config: execConfig({ useMockFallback: true }),
    });
    const res = await service.execute(execInput);
    expect(res.metadata.fallbackUsed).toBe(true);
    expect(res.metadata.provider).toBe('mock');
    expect(res.metadata.originalProvider).toBe('openai');
    expect(res.metadata.originalErrorCode).toBe('AI_PROVIDER_UNAVAILABLE');
    expect(res.output).toEqual({ via: 'mock' });
    expect(mock.calls).toBe(1);
  });

  it('AC-05: primary anthropic falla y fallback va a mock (NUNCA a anthropic)', async () => {
    const mock = new FakeProvider('resolve', { provider: 'mock' });
    const service = new AIExecutionService({
      primaryProvider: new FakeProvider('throw', { error: new AiProviderUnavailableError() }),
      mockProvider: mock,
      config: execConfig({ llmProvider: 'anthropic', demoMode: true }),
    });
    const res = await service.execute(execInput);
    expect(res.metadata.provider).toBe('mock');
    expect(res.metadata.originalProvider).toBe('anthropic');
  });

  it('EC-05: mock fallback también falla => AiFallbackFailedError (sin loop)', async () => {
    const service = new AIExecutionService({
      primaryProvider: new FakeProvider('throw', { error: new AiProviderUnavailableError() }),
      mockProvider: new FakeProvider('throw', { error: new Error('mock down') }),
      config: execConfig({ useMockFallback: true }),
    });
    await expect(service.execute(execInput)).rejects.toBeInstanceOf(AiFallbackFailedError);
  });
});

describe('US-123 AC-04 — LLM_PROVIDER=mock como provider primario', () => {
  it('mock primario => provider=mock, fallbackUsed=false', async () => {
    const primaryMock = new FakeProvider('resolve', { provider: 'mock' });
    const fallbackMock = new FakeProvider('resolve');
    const service = new AIExecutionService({ primaryProvider: primaryMock, mockProvider: fallbackMock, config: execConfig({ llmProvider: 'mock' }) });
    const res = await service.execute(execInput);
    expect(res.metadata.provider).toBe('mock');
    expect(res.metadata.fallbackUsed).toBe(false);
    expect(res.metadata.status).toBe('success');
    expect(fallbackMock.calls).toBe(0); // el fallback no se usa cuando mock es primario
  });

  it('mock primario que falla NO cae en fallback (evita mock→mock)', async () => {
    const fallbackMock = new FakeProvider('resolve');
    const service = new AIExecutionService({
      primaryProvider: new FakeProvider('throw', { error: new AiProviderUnavailableError() }),
      mockProvider: fallbackMock,
      config: execConfig({ llmProvider: 'mock', useMockFallback: true }),
    });
    await expect(service.execute(execInput)).rejects.toBeInstanceOf(AiProviderUnavailableError);
    expect(fallbackMock.calls).toBe(0);
  });
});

describe('US-123 AC-06 — metadata de ejecución completa y segura', () => {
  it('success primario incluye metadata sin payloads', async () => {
    const service = new AIExecutionService({ primaryProvider: new FakeProvider('resolve', { output: { plan: 'x' } }), mockProvider: new FakeProvider('resolve'), config: execConfig() });
    const res = await service.execute(execInput);
    expect(res.metadata).toMatchObject({ featureType: 'event_plan', provider: 'openai', originalProvider: 'openai', fallbackUsed: false, timeoutMs: 60000, correlationId: 'corr-123', status: 'success' });
    expect(typeof res.metadata.latencyMs).toBe('number');
    expect(JSON.stringify(res.metadata)).not.toContain('wedding'); // sin input
  });

  it('latencyMs usa el clock inyectable (determinístico)', async () => {
    let t = 1000;
    const now = () => (t += 25); // primer call start, segundo call fin → +25 acumulado
    const service = new AIExecutionService({ primaryProvider: new FakeProvider('resolve'), mockProvider: new FakeProvider('resolve'), config: execConfig(), now });
    const res = await service.execute(execInput);
    expect(res.metadata.latencyMs).toBeGreaterThan(0);
  });
});

describe('US-123 AI-001 — fallback con MockAIProvider real es determinístico', () => {
  it('fallback usa MockAIProvider real sin red y produce output estable', async () => {
    const service = new AIExecutionService({
      primaryProvider: new FakeProvider('throw', { error: new AiProviderUnavailableError() }),
      mockProvider: new MockAIProvider(),
      config: execConfig({ demoMode: true }),
    });
    const a = await service.execute(execInput);
    const b = await service.execute(execInput);
    expect(a.metadata.fallbackUsed).toBe(true);
    expect(a.metadata.provider).toBe('mock');
    expect(a.output).toEqual(b.output); // determinístico
  });
});
