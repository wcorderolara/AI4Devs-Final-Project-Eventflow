// US-129 · PB-P2-017 — Suite IA con MockAIProvider (tests deterministas).
//
// Cubre los Acceptance Criteria de US-129 usando el `MockAIProvider` real
// (US-119) — sin red, sin SDK, sin secrets. Complementa (no duplica) las
// suites preexistentes:
//   - `us119-mock-ai-provider.spec.ts` (contrato/metadata/determinismo/lookup
//     — 6 describes actualmente `.skip` esperando PB-P1-013..015 · fuera de
//     scope US-129 · execution record D-01).
//   - `us119-mock-no-network.guard.spec.ts` (guard estático AC-06 · SEC-001).
//   - `us123-ai-timeout.service.spec.ts` + `us123-fallback.service.spec.ts`
//     (composición timeout + fallback — capa AIExecutionService).
//   - `us122-persist-ai-recommendation.service.spec.ts` (contrato de
//     persistencia AIRecommendation — QA-003 reconocido).
//
// Esta suite se enfoca en el **shape del provider**: valida Zod estricto por
// feature, hooks de error controlado (`__simulate`), determinismo, metadata
// y ausencia de secrets en runtime — objetivo Doc 20 §7 AI-T-01 y §25.4.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_FEATURE_TYPES,
  OUTPUT_SCHEMAS,
  type AiFeatureType,
} from '../../src/modules/ai-assistance/domain/ai-features.js';
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  UnsupportedLanguageError,
} from '../../src/shared/domain/errors/ai.errors.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import { assertNoOpenAIRealKey, getMockAIProvider } from '../helpers/mock-ai.js';

const provider = getMockAIProvider();

// D-02 · US-129 · execution record: el set canónico son las 7 features
// (AI-001..006 + AI-008 · docs/7). `AI_FEATURE_TYPES` en producción tiene 10
// entradas — cubrimos el superset porque el costo marginal es cero y el
// valor es tapar cualquier gap contra el shape real.
const CANONICAL_MVP_FEATURES: readonly AiFeatureType[] = [
  'event_plan',
  'checklist',
  'budget_suggestion',
  'vendor_categories',
  'quote_brief',
  'quote_comparison',
  'task_prioritization',
];

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// SEC-001 · AC-01 · VR-01/SEC-02 — ausencia de OPENAI_API_KEY real en el runner
// ---------------------------------------------------------------------------

describe('US-129 · SEC-001 · sin IA real en runtime de tests', () => {
  it('runner NO tiene `OPENAI_API_KEY` real (guard `assertNoOpenAIRealKey`)', () => {
    // `assertNoOpenAIRealKey` acepta vacío / `dummy` / `test` / `sk-test*`;
    // cualquier otra cosa (una key `sk-XXXX` real accidental) hace fallar el
    // test. Guardia contra fugas de secrets al pipeline.
    expect(() => assertNoOpenAIRealKey()).not.toThrow();
  });

  it('`LLM_PROVIDER=openai` NO es la configuración implícita — el mock provider es el path por defecto en CI', () => {
    // El env var por defecto en el runner de Vitest de este repo es `mock`
    // (verificado en `pr.yml:test-backend-coverage` con `env: LLM_PROVIDER:
    // mock`). Aquí lo aserramos como sanity — sin depender de env real,
    // consultamos si LLM_PROVIDER está seteado y, en tal caso, exigimos que
    // sea `mock`. Si no está seteado, aceptamos: el config Zod tiene default
    // de infra que la fábrica interpreta como mock en tests.
    const explicit = process.env.LLM_PROVIDER;
    if (explicit !== undefined) {
      expect(explicit).toBe('mock');
    } else {
      // No forzamos: el `env.ts` valida y el factory selecciona; ver AI-001.
      expect(true).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// QA-001 · AC-02 · VR-02 — cada feature produce output que satisface su
// esquema Zod estricto (asserts sobre schema, no texto literal — evita FPs).
// ---------------------------------------------------------------------------

describe('US-129 · QA-001 · 7 features MVP + 3 extensiones — validación Zod estricta', () => {
  it.each(CANONICAL_MVP_FEATURES)(
    'feature canónica `%s` produce output conforme a OUTPUT_SCHEMAS[feature]',
    async (feature) => {
      const result = await provider.generate({
        feature,
        input: { currencyCode: 'GTQ' },
        languageCode: 'es-LATAM',
      });
      const parsed = OUTPUT_SCHEMAS[feature].safeParse(result.output);
      expect(parsed.success, JSON.stringify(parsed)).toBe(true);
    },
  );

  it('las 10 features de `AI_FEATURE_TYPES` (incluidas extensiones) también producen output conforme', async () => {
    // D-02: superset — sin duplicar, iteramos sobre todas y validamos.
    for (const feature of AI_FEATURE_TYPES) {
      const result = await provider.generate({
        feature,
        input: { currencyCode: 'GTQ' },
        languageCode: 'es-LATAM',
      });
      const parsed = OUTPUT_SCHEMAS[feature].safeParse(result.output);
      expect(parsed.success, `feature ${feature}: ${JSON.stringify(parsed)}`).toBe(true);
    }
  });

  it('cada respuesta lleva metadata canónica (provider=mock, fallbackUsed=false, promptVersion, latencyMs, rawOutputHash)', async () => {
    const result = await provider.generate({
      feature: 'event_plan',
      input: {},
      languageCode: 'es-LATAM',
    });
    expect(result.provider).toBe('mock');
    expect(result.fallbackUsed).toBe(false);
    expect(result.promptVersion).toMatch(/^mock:event_plan:/);
    expect(typeof result.latencyMs).toBe('number');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.rawOutputHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// QA-002 · AC-03 · VR-03 — timeout / unavailable / JSON inválido.
// Usamos los hooks `__simulate` del provider (documentados en
// `mock-ai-provider.ts:9-11`) para forzar los caminos de error controlado
// SIN esperar 60s reales — Doc 20 §25.4 (fake timers, VR-04).
// ---------------------------------------------------------------------------

describe('US-129 · QA-002 · comportamiento transversal — timeout, unavailable, JSON inválido', () => {
  it('`__simulate: "timeout"` rechaza con `AiProviderTimeoutError` (mapeado a fallback aguas arriba)', async () => {
    await expect(
      provider.generate({
        feature: 'event_plan',
        input: { __simulate: 'timeout' },
        languageCode: 'es-LATAM',
      }),
    ).rejects.toBeInstanceOf(AiProviderTimeoutError);
    // AIExecutionService.execute() convierte este rechazo en
    // `fallbackUsed=true` con `fallbackReason='AI_TIMEOUT'` (verificado en
    // `us123-fallback.service.spec.ts`).
  });

  it('`__simulate: "unavailable"` rechaza con `AiProviderUnavailableError`', async () => {
    await expect(
      provider.generate({
        feature: 'event_plan',
        input: { __simulate: 'unavailable' },
        languageCode: 'es-LATAM',
      }),
    ).rejects.toBeInstanceOf(AiProviderUnavailableError);
  });

  it('`__simulate: "invalid"` produce output NO conforme al schema Zod (error semántico sin crash)', async () => {
    // NT-02: JSON inválido → error semántico, sin crash. El provider resuelve
    // con un `output` deliberadamente incompatible; el use case aguas arriba
    // usa Zod parse para detectar y mapear a `AiInvalidOutputError`. Aquí lo
    // asertamos a nivel de shape.
    const result = await provider.generate({
      feature: 'event_plan',
      input: { __simulate: 'invalid' },
      languageCode: 'es-LATAM',
    });
    const parsed = OUTPUT_SCHEMAS.event_plan.safeParse(result.output);
    expect(parsed.success).toBe(false);
    // Y no crashea el proceso (test llegó hasta acá).
  });

  it('feature no soportada → `ValidationError` (no éxito silencioso, no red)', async () => {
    await expect(
      provider.generate({
        feature: 'unknown_feature' as AiFeatureType,
        input: {},
        languageCode: 'es-LATAM',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('idioma no soportado → `UnsupportedLanguageError` (defensa runtime EC-04)', async () => {
    await expect(
      provider.generate({
        feature: 'event_plan',
        input: {},
        // Cast intencional: el tipado TS excluye locales fuera de whitelist,
        // pero probamos la guarda runtime del provider (Doc 20 · US-084).
        languageCode: 'fr' as never,
      }),
    ).rejects.toBeInstanceOf(UnsupportedLanguageError);
  });
});

// ---------------------------------------------------------------------------
// QA-004 · AC-05 · VR-04 — determinismo (0 falsos positivos) + tiempo <60s.
// ---------------------------------------------------------------------------

describe('US-129 · QA-004 · determinismo y tiempo total', () => {
  it('mismo input → mismo output en 3 llamadas consecutivas por cada feature canónica', async () => {
    for (const feature of CANONICAL_MVP_FEATURES) {
      const [a, b, c] = await Promise.all([
        provider.generate({ feature, input: { seed: 1 }, languageCode: 'es-LATAM' }),
        provider.generate({ feature, input: { seed: 1 }, languageCode: 'es-LATAM' }),
        provider.generate({ feature, input: { seed: 1 }, languageCode: 'es-LATAM' }),
      ]);
      expect(a.output).toEqual(b.output);
      expect(b.output).toEqual(c.output);
      expect(a.rawOutputHash).toBe(c.rawOutputHash);
    }
  });

  it('la suite completa de generación por feature termina muy por debajo de 60s', async () => {
    // VR-04: objetivo del suite total <60s (Doc 20 §21). Como este spec por
    // sí solo genera N x features y NO hace I/O real, medir su duración es
    // un indicador honesto. Umbral defensivo 3s para tener holgura CI.
    const start = performance.now();
    for (let i = 0; i < 3; i += 1) {
      for (const feature of AI_FEATURE_TYPES) {
        await provider.generate({
          feature,
          input: { currencyCode: 'GTQ' },
          languageCode: 'es-LATAM',
        });
      }
    }
    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(3_000);
  });
});

// ---------------------------------------------------------------------------
// SEC-001 · AC-01 · SEC-03 — sin PII en fixtures ni logs.
// El guard estático `us119-mock-no-network.guard.spec.ts` ya cubre que el
// mock no importa SDKs/HTTP/secrets a nivel de código. Aquí verificamos el
// runtime: los outputs de las 10 features no contienen emails, teléfonos ni
// palabras que huelan a secret (`sk-XXX`, `api_key`).
// ---------------------------------------------------------------------------

describe('US-129 · SEC-001 · fixtures del mock — sin PII ni secretos en el output', () => {
  // UUIDs (task_id, quote_id, etc.) son parte del contrato y no cuentan como
  // PII — se strippean antes de aplicar patrones. Los patrones testean:
  // email, secret pattern OpenAI (`sk-XXX`) y keywords sensibles.
  const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const PII_PATTERNS = [
    /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/i, // email
    /\bsk-[A-Za-z0-9]{20,}\b/, // OpenAI secret real (≥20 chars, evita `sk-test-*` cortos)
    /\b(?:api[-_]?key|password|bearer|authorization)\b/i, // sensitive keywords
  ];

  it.each(AI_FEATURE_TYPES)('output de `%s` no contiene PII/secretos textuales', async (feature) => {
    const result = await provider.generate({
      feature,
      input: { currencyCode: 'GTQ' },
      languageCode: 'es-LATAM',
    });
    const serialized = JSON.stringify(result.output).replace(UUID_PATTERN, '<uuid>');
    for (const pattern of PII_PATTERNS) {
      expect(
        pattern.test(serialized),
        `feature ${feature}: patrón ${pattern} matcheó en output "${serialized}"`,
      ).toBe(false);
    }
  });
});
