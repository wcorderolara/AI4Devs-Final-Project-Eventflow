// US-097 / QA-001+QA-004 — Unit tests deterministas de AI (sin BD, sin red). AC-12/13/14; VR/EC.
import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { AiGenerationService } from '../../src/modules/ai-assistance/application/ai-generation.service.js';
import { OUTPUT_SCHEMAS, AI_FEATURE_TYPES, type AiFeatureType } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { MissingInputError, UnsupportedLanguageError, AiInvalidOutputError, AiProviderTimeoutError, AiProviderUnavailableError } from '../../src/shared/domain/errors/ai.errors.js';

const provider = new MockAIProvider();
const service = new AiGenerationService(provider);

describe('MockAIProvider (AI-TS-01/02, AC-14)', () => {
  it('cada feature produce output determinista que pasa su schema', async () => {
    for (const feature of AI_FEATURE_TYPES) {
      const r1 = await provider.generate({ feature, input: { x: 1 }, languageCode: 'es-LATAM' });
      const r2 = await provider.generate({ feature, input: { x: 1 }, languageCode: 'es-LATAM' });
      expect(r1.output).toEqual(r2.output); // determinista
      expect(OUTPUT_SCHEMAS[feature].safeParse(r1.output).success).toBe(true);
      expect(r1.provider).toBe('mock');
    }
  });
});

describe('AiGenerationService (VR-02/03/05, EC-05..08)', () => {
  it('input vacío → MissingInputError (MISSING_INPUT)', async () => {
    await expect(service.generate('event_plan', {}, 'es-LATAM', undefined)).rejects.toBeInstanceOf(MissingInputError);
  });
  it('idioma no soportado → UnsupportedLanguageError', async () => {
    await expect(service.generate('event_plan', { x: 1 }, 'fr', undefined)).rejects.toBeInstanceOf(UnsupportedLanguageError);
  });
  it('idioma omitido → default es-LATAM en aiMeta', async () => {
    const out = await service.generate('event_plan', { x: 1 }, undefined, undefined);
    expect(out.aiMeta.languageCode).toBe('es-LATAM');
    expect(out.aiMeta).toMatchObject({ provider: 'mock', fallbackUsed: false });
    expect(typeof out.aiMeta.latencyMs).toBe('number');
  });
  it('output inválido del provider → AiInvalidOutputError (VR-05)', async () => {
    await expect(service.generate('event_plan', { __simulate: 'invalid' }, 'es-LATAM', undefined)).rejects.toBeInstanceOf(AiInvalidOutputError);
  });
  it('timeout del provider → AiProviderTimeoutError (EC-07)', async () => {
    await expect(service.generate('checklist', { __simulate: 'timeout' }, 'es-LATAM', undefined)).rejects.toBeInstanceOf(AiProviderTimeoutError);
  });
  it('provider no disponible → AiProviderUnavailableError', async () => {
    await expect(service.generate('checklist', { __simulate: 'unavailable' }, 'es-LATAM', undefined)).rejects.toBeInstanceOf(AiProviderUnavailableError);
  });
  it('sanitiza PII antes del provider (VR-08): email/phone no aparecen en el input persistido', async () => {
    const out = await service.generate('event_plan', { guests: 100, email: 'a@b.com', phone: '555' }, 'es-LATAM', undefined);
    expect(out.sanitizedInput).toEqual({ guests: 100 });
  });
});

describe('Feature registry', () => {
  it('cada feature tiene schema y scope (extendido a 9 con quote_compare_summary en US-022)', () => {
    // US-022 (PB-P2-001) amplía el registry: `quote_compare_summary` (event-scope).
    expect(AI_FEATURE_TYPES.length).toBe(9);
    for (const f of AI_FEATURE_TYPES as readonly AiFeatureType[]) {
      expect(OUTPUT_SCHEMAS[f]).toBeDefined();
    }
  });
});
