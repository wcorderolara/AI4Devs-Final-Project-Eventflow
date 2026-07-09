// US-120 / QA-001..006 — AnthropicProvider stub no funcional (PB-P0-009). Sin red, sin secrets, sin BD.
// Verifica contract compliance (AC-01), failure explícito tipado en todo método (AC-02), metadata
// segura (AC-06), resolución del selector (AC-04) y que Anthropic no es fallback target (AC-05).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnthropicProvider } from '../../src/modules/ai-assistance/infrastructure/providers/anthropic/anthropic-provider.js';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { selectProvider } from '../../src/modules/ai-assistance/infrastructure/llm-provider.factory.js';
import { AIProviderNotConfiguredError } from '../../src/shared/domain/errors/ai.errors.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { AI_FEATURE_TYPES } from '../../src/modules/ai-assistance/domain/ai-features.js';

const provider = new AnthropicProvider();
const REQ = { feature: 'event_plan' as const, input: { secret: 'a@b.com' }, languageCode: 'es-LATAM' };

afterEach(() => vi.restoreAllMocks());

describe('US-120 AC-01/AC-07 — contract compliance', () => {
  it('AnthropicProvider implementa LLMProvider e instancia sin secrets', () => {
    const p: { generate: unknown } = new AnthropicProvider();
    expect(typeof p.generate).toBe('function');
  });
});

describe('US-120 AC-02 — failure explícito tipado', () => {
  it('generate() rechaza con AIProviderNotConfiguredError, provider=anthropic, sin AIResult', async () => {
    await expect(provider.generate(REQ)).rejects.toBeInstanceOf(AIProviderNotConfiguredError);
    try {
      await provider.generate(REQ);
      expect.unreachable('debe lanzar');
    } catch (e) {
      const err = e as AIProviderNotConfiguredError;
      expect(err.code).toBe('AI_PROVIDER_NOT_CONFIGURED');
      expect(err.meta?.provider).toBe('anthropic');
      expect(err.meta?.causeCode).toBe('ANTHROPIC_STUB_NOT_IMPLEMENTED_MVP');
    }
  });

  it('falla explícitamente para cada feature del contrato (nunca output exitoso)', async () => {
    for (const feature of AI_FEATURE_TYPES) {
      await expect(provider.generate({ feature, input: { x: 1 }, languageCode: 'es-LATAM' })).rejects.toBeInstanceOf(AIProviderNotConfiguredError);
    }
  });
});

describe('US-120 AC-06 — observabilidad y error seguros', () => {
  it('el error/log no exponen el input recibido ni raw prompts', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const err = await provider.generate(REQ).catch((e: unknown) => e) as AIProviderNotConfiguredError;
    // El error público no transporta el input/payload sensible.
    expect(JSON.stringify(err.meta ?? {})).not.toContain('a@b.com');
    expect(err.message).not.toContain('a@b.com');
    // Log warn con metadata segura y sin payload.
    const payload = JSON.stringify(warnSpy.mock.calls[0]?.[0]);
    expect(payload).toContain('ai.provider.not_implemented');
    expect(payload).toContain('anthropic');
    expect(payload).not.toContain('a@b.com');
    expect(payload).not.toContain('secret');
  });
});

describe('US-120 AC-04/AC-05 — selector resuelve al stub, no fallback', () => {
  it('selectProvider("anthropic", false) → AnthropicProvider (no Mock, no fallback silencioso)', () => {
    const resolved = selectProvider('anthropic', false);
    expect(resolved).toBeInstanceOf(AnthropicProvider);
    expect(resolved).not.toBeInstanceOf(MockAIProvider);
  });
  it('el fallback controlado usa Mock (mock/demo), nunca Anthropic', () => {
    expect(selectProvider('mock', false)).toBeInstanceOf(MockAIProvider);
    expect(selectProvider('anthropic', true)).toBeInstanceOf(MockAIProvider); // demo-mode → Mock, no Anthropic
  });
});
