// US-119 / QA-001..006 — MockAIProvider determinista (PB-P0-009). Sin red, sin secrets, sin BD.
// Cubre contrato+metadata (AC-01/08), determinismo y lookup (AC-02/03/04), missing fixture+warning
// (AC-05), schema compatibility (AC-07) y errores tipados de feature/idioma (EC-03/EC-04).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { buildFixtureKey, fixtureKeyFromRequest } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-fixture-key.js';
import { OUTPUT_SCHEMAS, AI_FEATURE_TYPES, type AiFeatureType } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { UnsupportedLanguageError } from '../../src/shared/domain/errors/ai.errors.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';

const provider = new MockAIProvider();

afterEach(() => vi.restoreAllMocks());

describe('US-119 AC-01/AC-08 — contrato y metadata directa', () => {
  it('retorna AIResult con provider=mock, fallbackUsed=false y metadata', async () => {
    const r = await provider.generate({ feature: 'event_plan', input: { x: 1 }, languageCode: 'es-LATAM' });
    expect(r.provider).toBe('mock');
    expect(r.fallbackUsed).toBe(false);
    expect(r.promptVersion).toBe('mock:event_plan:v1');
    expect(typeof r.latencyMs).toBe('number');
    expect(r.rawOutputHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('US-119 AC-02 — determinismo (deep-equal)', () => {
  it('mismo input/context retorna outputs deep-equal en múltiples llamadas', async () => {
    for (const feature of AI_FEATURE_TYPES) {
      const r1 = await provider.generate({ feature, input: { x: 1 }, languageCode: 'es-LATAM' });
      const r2 = await provider.generate({ feature, input: { x: 1 }, languageCode: 'es-LATAM' });
      const r3 = await provider.generate({ feature, input: { x: 1 }, languageCode: 'es-LATAM' });
      expect(r1.output).toEqual(r2.output);
      expect(r2.output).toEqual(r3.output);
      expect(r1.rawOutputHash).toBe(r3.rawOutputHash);
    }
  });
});

describe('US-119 AC-03/AC-04 — fixture lookup por dimensiones e idioma', () => {
  it('el key builder es estable y explícito en sus dimensiones', () => {
    const k = fixtureKeyFromRequest('event_plan', 'en', { __scenarioSeed: 's1', __promptVersionId: 'v2' });
    expect(k).toMatchObject({ feature: 'event_plan', languageCode: 'en', promptVersionId: 'v2', scenarioSeed: 's1' });
    expect(buildFixtureKey(k)).toBe('event_plan|en|v2|s1||');
  });
  it('idioma aprobado con fixture específica (en) selecciona la variante de idioma', async () => {
    const r = await provider.generate({ feature: 'event_plan', input: { x: 1 }, languageCode: 'en' });
    expect(r.output).toEqual({ summary: 'Suggested plan for the event', phases: [{ name: 'Preparation', tasks: ['Set the date', 'Book the venue'] }] });
  });
});

describe('US-119 AC-05 / EC-01 — missing fixture → output genérico + warning seguro', () => {
  it('idioma sin fixture específica retorna output genérico estable y loguea warning sin datos sensibles', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const r1 = await provider.generate({ feature: 'event_plan', input: { secretGuest: 'a@b.com' }, languageCode: 'pt' });
    const r2 = await provider.generate({ feature: 'event_plan', input: { secretGuest: 'a@b.com' }, languageCode: 'pt' });
    expect(r1.output).toEqual(r2.output); // genérico determinista
    expect(OUTPUT_SCHEMAS.event_plan.safeParse(r1.output).success).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    const payload = JSON.stringify(warnSpy.mock.calls[0]?.[0]);
    expect(payload).toContain('ai.mock.fixture_missing');
    expect(payload).not.toContain('a@b.com'); // sin PII/raw input
    expect(payload).not.toContain('secretGuest');
  });
});

describe('US-119 EC-03/EC-04 — errores tipados', () => {
  it('feature no soportada → ValidationError (no éxito silencioso)', async () => {
    await expect(provider.generate({ feature: 'unknown_feature' as AiFeatureType, input: { x: 1 }, languageCode: 'es-LATAM' })).rejects.toBeInstanceOf(ValidationError);
  });
  it('idioma no soportado → UnsupportedLanguageError', async () => {
    await expect(provider.generate({ feature: 'event_plan', input: { x: 1 }, languageCode: 'fr' })).rejects.toBeInstanceOf(UnsupportedLanguageError);
  });
});

describe('US-119 AC-07 — schema compatibility de todas las fixtures base', () => {
  it('cada feature MVP produce output que pasa su OUTPUT_SCHEMA', async () => {
    for (const feature of AI_FEATURE_TYPES) {
      const r = await provider.generate({ feature, input: { currencyCode: 'GTQ' }, languageCode: 'es-LATAM' });
      expect(OUTPUT_SCHEMAS[feature].safeParse(r.output).success, `feature ${feature}`).toBe(true);
    }
  });
});
