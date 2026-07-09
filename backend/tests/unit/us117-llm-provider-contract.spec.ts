// US-117 / QA-001, QA-002, QA-003 — Contract, type y error tests del puerto LLMProvider (PB-P0-009).
// Sin BD, sin red, sin SDK externo. Verifica: sustituibilidad (AC-01/AC-08), metadata obligatoria
// del contrato formal (AC-03/AC-04), provider ids y language codes restringidos (AC-06) y errores
// tipados sin dependencia HTTP (AC-05). Los checks de tipo negativos los valida `npm run typecheck`.
import { describe, it, expect } from 'vitest';
import type {
  LLMProvider,
  LlmGenerationResult,
  AIContext,
  AIResult,
  ProviderId,
  LanguageCode,
  PromptVersionId,
} from '../../src/modules/ai-assistance/ports/index.js';
import type { AiFeatureType } from '../../src/modules/ai-assistance/domain/ai-features.js';
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  AiInvalidOutputError,
  AIProviderNotConfiguredError,
} from '../../src/shared/domain/errors/ai.errors.js';
import { AppError } from '../../src/shared/domain/errors/app.error.js';

// ── Fake provider sin SDK externo (AC-08): implementa el puerto y retorna determinista ──
class FakeProvider implements LLMProvider {
  generate(request: {
    feature: AiFeatureType;
    input: Record<string, unknown>;
    languageCode: string;
    preferMock?: boolean;
  }): Promise<LlmGenerationResult> {
    return Promise.resolve({
      output: { echo: request.feature },
      provider: 'mock',
      promptVersion: `fake-${request.feature}-v1`,
      latencyMs: 0,
      fallbackUsed: false,
    });
  }
}

describe('US-117 AC-01/AC-08 — sustituibilidad sin SDK', () => {
  it('un fake provider implementa LLMProvider y retorna resultado determinista', async () => {
    const provider: LLMProvider = new FakeProvider();
    const r1 = await provider.generate({ feature: 'event_plan', input: { x: 1 }, languageCode: 'es-LATAM' });
    const r2 = await provider.generate({ feature: 'event_plan', input: { x: 1 }, languageCode: 'es-LATAM' });
    expect(r1).toEqual(r2);
    expect(r1.provider).toBe('mock');
    expect(r1.fallbackUsed).toBe(false);
    expect(typeof r1.latencyMs).toBe('number');
    expect(r1.promptVersion).toBe('fake-event_plan-v1');
  });
});

describe('US-117 AC-03/AC-04 — metadata obligatoria del contrato formal', () => {
  it('AIContext transporta la metadata requerida', () => {
    const ctx: AIContext = {
      language: 'es-LATAM',
      userId: 'u1',
      promptVersionId: 'pv-1',
      correlationId: 'corr-1',
      timeoutMs: 60_000,
      currency: 'GTQ',
      preferMock: true,
    };
    expect(ctx.correlationId).toBe('corr-1');
    expect(ctx.timeoutMs).toBe(60_000);
  });

  it('AIResult<TOutput> incluye metadata auditable obligatoria + rawOutputHash opcional', () => {
    const result: AIResult<{ summary: string }> = {
      output: { summary: 'ok' },
      provider: 'mock',
      promptVersionId: 'pv-1',
      languageCode: 'es-LATAM',
      latencyMs: 1,
      fallbackUsed: false,
      rawOutputHash: 'sha256:deadbeef',
    };
    expect(result.provider).toBe('mock');
    expect(result.fallbackUsed).toBe(false);
    expect(result.output.summary).toBe('ok');
  });
});

describe('US-117 AC-05 — errores tipados sin dependencia HTTP', () => {
  it('cada error se construye, lanza y captura, y extiende AppError sin exponer HTTP', () => {
    const errors: AppError[] = [
      new AiProviderTimeoutError(),
      new AiProviderUnavailableError(),
      new AiInvalidOutputError(),
      new AIProviderNotConfiguredError('not configured', { provider: 'openai', correlationId: 'c1', causeCode: 'NO_API_KEY' }),
    ];
    for (const e of errors) {
      expect(e).toBeInstanceOf(AppError);
      expect(typeof e.code).toBe('string');
      // Sin acoplamiento a Express/HTTP: el error no lleva status/req/res.
      expect((e as unknown as { status?: unknown }).status).toBeUndefined();
      expect(() => { throw e; }).toThrow();
    }
  });

  it('AIProviderNotConfiguredError expone código estable y metadata segura', () => {
    const e = new AIProviderNotConfiguredError('x', { provider: 'anthropic', promptVersionId: 'pv-2' });
    expect(e.code).toBe('AI_PROVIDER_NOT_CONFIGURED');
    expect(e.meta?.provider).toBe('anthropic');
    // La metadata segura no transporta secrets ni prompts crudos.
    expect(Object.keys(e.meta ?? {})).not.toContain('apiKey');
  });
});

// ── Type-level tests: validados por `npm run typecheck` (AC-06 / VR-01/02/04/05 / NT-02..04) ──
describe('US-117 AC-06 — restricciones de tipos (compile-time)', () => {
  it('valores válidos compilan; valores inválidos fallan el typecheck', () => {
    const okProvider: ProviderId = 'anthropic';
    const okLang: LanguageCode = 'pt';
    const okPv: PromptVersionId = 'pv-1';
    expect([okProvider, okLang, okPv]).toHaveLength(3);

    // @ts-expect-error — provider fuera de openai|mock|anthropic (VR-02 / NT-02)
    const _badProvider: ProviderId = 'gemini';
    // @ts-expect-error — idioma fuera de es-LATAM|es-ES|pt|en (VR-01)
    const _badLang: LanguageCode = 'fr';
    // @ts-expect-error — AIContext sin correlationId (VR-04 / NT-03)
    const _badCtx: AIContext = { language: 'en', userId: 'u', promptVersionId: 'p', timeoutMs: 1 };
    // @ts-expect-error — AIResult sin fallbackUsed (VR-05 / NT-04)
    const _badResult: AIResult<number> = { output: 1, provider: 'mock', promptVersionId: 'p', languageCode: 'en', latencyMs: 1 };
    void [_badProvider, _badLang, _badCtx, _badResult];
  });
});
