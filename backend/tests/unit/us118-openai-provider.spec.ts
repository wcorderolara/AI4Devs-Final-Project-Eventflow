// US-118 / QA-001..006 — Tests deterministas de OpenAIProvider (PB-P0-009). Sin red real, sin
// secretos reales, sin BD (AC-08). Usa transport fake inyectado. Cubre success/config/structured
// output/timeout/error mapping/safe logs (AC-01..AC-07).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAIProvider, createOpenAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/openai/openai-provider.js';
import { resolveOpenAIConfig, type OpenAIConfig } from '../../src/modules/ai-assistance/infrastructure/providers/openai/openai-config.js';
import {
  OpenAIHttpError,
  OpenAIMalformedResponseError,
  type OpenAIChatTransport,
  type OpenAIChatRequest,
  type OpenAIChatResponse,
} from '../../src/modules/ai-assistance/infrastructure/providers/openai/openai-client.js';
import {
  AIProviderNotConfiguredError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  AiInvalidOutputError,
} from '../../src/shared/domain/errors/ai.errors.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import type { AiFeatureType } from '../../src/modules/ai-assistance/domain/ai-features.js';

const FAKE_KEY = 'sk-test-fake-key-do-not-use';
const cfg: OpenAIConfig = { apiKey: FAKE_KEY, model: 'gpt-4o-mini', baseUrl: 'https://api.openai.test/v1', timeoutMs: 5000 };
const REQ = { feature: 'event_plan' as AiFeatureType, input: { guests: 100 }, languageCode: 'es-LATAM' };

class FakeTransport implements OpenAIChatTransport {
  lastRequest?: OpenAIChatRequest;
  constructor(private readonly behavior: (req: OpenAIChatRequest, signal: AbortSignal) => Promise<OpenAIChatResponse>) {}
  createChatCompletion(req: OpenAIChatRequest, signal: AbortSignal): Promise<OpenAIChatResponse> {
    this.lastRequest = req;
    return this.behavior(req, signal);
  }
}

const okJson = (obj: unknown): FakeTransport => new FakeTransport(() => Promise.resolve({ content: JSON.stringify(obj) }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('resolveOpenAIConfig (US-118 AC-02 / VR-01/VR-02)', () => {
  it('sin OPENAI_API_KEY → AIProviderNotConfiguredError sin exponer el valor', () => {
    expect(() => resolveOpenAIConfig({ OPENAI_MODEL: 'gpt-4o-mini', AI_TIMEOUT_MS: 8000 })).toThrow(AIProviderNotConfiguredError);
  });
  it('sin OPENAI_MODEL → AIProviderNotConfiguredError', () => {
    expect(() => resolveOpenAIConfig({ OPENAI_API_KEY: FAKE_KEY, AI_TIMEOUT_MS: 8000 })).toThrow(AIProviderNotConfiguredError);
  });
  it('config válida resuelve baseUrl default y timeout', () => {
    const c = resolveOpenAIConfig({ OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'gpt-4o-mini', AI_TIMEOUT_MS: 8000 });
    expect(c).toMatchObject({ apiKey: FAKE_KEY, model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', timeoutMs: 8000 });
  });
  it('AI_TIMEOUT_MS inválido cae al default 60000', () => {
    const c = resolveOpenAIConfig({ OPENAI_API_KEY: FAKE_KEY, OPENAI_MODEL: 'm', AI_TIMEOUT_MS: 0 });
    expect(c.timeoutMs).toBe(60_000);
  });
});

describe('OpenAIProvider success path (US-118 AC-01/AC-04)', () => {
  it('retorna AIResult con provider=openai, fallbackUsed=false y metadata', async () => {
    let clock = 1000;
    const provider = new OpenAIProvider(cfg, okJson({ summary: 'ok', phases: [] }), () => (clock += 25));
    const r = await provider.generate(REQ);
    expect(r.provider).toBe('openai');
    expect(r.fallbackUsed).toBe(false);
    expect(r.output).toEqual({ summary: 'ok', phases: [] });
    expect(r.promptVersion).toBe('openai:gpt-4o-mini');
    expect(typeof r.latencyMs).toBe('number');
    expect(r.latencyMs).toBeGreaterThan(0);
    expect(r.rawOutputHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('OpenAIProvider structured output request (US-118 AC-03)', () => {
  it('el request usa response_format json_object y propaga feature/idioma/input', async () => {
    const transport = okJson({ items: [] });
    const provider = new OpenAIProvider(cfg, transport);
    await provider.generate(REQ);
    expect(transport.lastRequest?.responseFormat).toEqual({ type: 'json_object' });
    expect(transport.lastRequest?.model).toBe('gpt-4o-mini');
    const system = transport.lastRequest?.messages.find((m) => m.role === 'system')?.content ?? '';
    expect(system).toContain('event_plan');
    expect(system).toContain('es-LATAM');
    const user = transport.lastRequest?.messages.find((m) => m.role === 'user')?.content ?? '';
    expect(JSON.parse(user)).toEqual({ guests: 100 });
  });
});

describe('OpenAIProvider timeout (US-118 AC-05)', () => {
  it('excede timeoutMs → AiProviderTimeoutError, sin fallback', async () => {
    vi.useFakeTimers();
    // Transport que sólo se resuelve/rechaza cuando el signal aborta.
    const transport = new FakeTransport(
      (_req, signal) =>
        new Promise<OpenAIChatResponse>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const provider = new OpenAIProvider({ ...cfg, timeoutMs: 5000 }, transport);
    const p = provider.generate(REQ);
    const assertion = expect(p).rejects.toBeInstanceOf(AiProviderTimeoutError);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });
});

describe('OpenAIProvider error mapping (US-118 AC-06)', () => {
  it('output no-JSON → AiInvalidOutputError (EC-02)', async () => {
    const provider = new OpenAIProvider(cfg, new FakeTransport(() => Promise.resolve({ content: 'no soy json' })));
    await expect(provider.generate(REQ)).rejects.toBeInstanceOf(AiInvalidOutputError);
  });
  it('respuesta sin contenido → AiInvalidOutputError', async () => {
    const provider = new OpenAIProvider(cfg, new FakeTransport(() => Promise.reject(new OpenAIMalformedResponseError())));
    await expect(provider.generate(REQ)).rejects.toBeInstanceOf(AiInvalidOutputError);
  });
  it.each([401, 403, 429, 500, 503])('HTTP %i → AiProviderUnavailableError (EC-04)', async (status) => {
    const provider = new OpenAIProvider(cfg, new FakeTransport(() => Promise.reject(new OpenAIHttpError(status))));
    await expect(provider.generate(REQ)).rejects.toBeInstanceOf(AiProviderUnavailableError);
  });
  it('error de red → AiProviderUnavailableError', async () => {
    const provider = new OpenAIProvider(cfg, new FakeTransport(() => Promise.reject(new Error('ECONNRESET'))));
    await expect(provider.generate(REQ)).rejects.toBeInstanceOf(AiProviderUnavailableError);
  });
});

describe('OpenAIProvider safe logs (US-118 AC-07 / SEC-01 / OBS-001)', () => {
  it('logs de éxito no contienen API key ni prompts completos y traen metadata segura', async () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const provider = new OpenAIProvider(cfg, okJson({ ok: true }));
    await provider.generate(REQ);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.stringify(infoSpy.mock.calls[0]?.[0]);
    expect(payload).not.toContain(FAKE_KEY);
    expect(payload).not.toContain('guests');
    expect(payload).toContain('ai.request.success');
    expect(payload).toContain('openai');
  });
  it('logs de falla registran errorCode sin secretos', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const provider = new OpenAIProvider(cfg, new FakeTransport(() => Promise.reject(new OpenAIHttpError(429))));
    await expect(provider.generate(REQ)).rejects.toBeInstanceOf(AiProviderUnavailableError);
    const payload = JSON.stringify(warnSpy.mock.calls[0]?.[0]);
    expect(payload).not.toContain(FAKE_KEY);
    expect(payload).toContain('ai.request.failed');
    expect(payload).toContain('AI_PROVIDER_UNAVAILABLE');
  });
});

describe('createOpenAIProvider (US-118 AC-02 factory wiring)', () => {
  it('sin config OpenAI en el entorno de test → AIProviderNotConfiguredError (fail-fast seguro)', () => {
    // El setup de tests usa LLM_PROVIDER=mock y no define OPENAI_API_KEY/MODEL.
    expect(() => createOpenAIProvider()).toThrow(AIProviderNotConfiguredError);
  });
});
