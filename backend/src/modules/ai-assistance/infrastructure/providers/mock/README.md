# `MockAIProvider` (US-119 / PB-P0-009)

Adapter **Infrastructure** determinista que implementa el puerto `LLMProvider` (US-117). Es el
provider obligatorio para **CI, desarrollo local y demo offline**: sin red externa, sin SDKs de IA
y sin secrets (`LLM_PROVIDER=mock`). Backend-only.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `mock-fixture-key.ts` | `MockFixtureKey` + builder determinístico y `fixtureKeyFromRequest`. |
| `mock-fixtures.ts` | Fixtures base por feature (`es-LATAM`), overrides por idioma/seed y `resolveFixture`. |
| `mock-ai-provider.ts` | `MockAIProvider implements LLMProvider`. |

## Dimensiones de lookup (AI-003 / AC-03)

La selección de fixture es determinística por estas dimensiones (nunca por raw prompts):

- **`feature`** — feature IA MVP (`event_plan`, `checklist`, …, `vendor_bio`).
- **`languageCode`** — idioma aprobado (`es-LATAM | es-ES | pt | en`).
- **`promptVersionId`** — default `v1`; hook `input.__promptVersionId`.
- **`scenarioSeed`** — default `default`; hook `input.__scenarioSeed`.
- **`eventTypeCode?` / `vendorProfileId?`** — matchers opcionales desde `input`.

> Nota de alineación (US-117 Opción B): el puerto operativo `generate({ feature, input, languageCode })`
> no transporta `AIContext`, por eso `promptVersionId`/`scenarioSeed`/matchers se leen de hooks
> opcionales del `input` con defaults deterministas. `correlationId` no está disponible en la frontera
> del puerto y no se loguea.

### Cómo agregar fixtures

- Agregar entradas a `LANGUAGE_FIXTURES` en `mock-fixtures.ts` con `buildFixtureKey({...})`.
- Usar **datos ficticios** (seed/demo). Prohibido: PII real, nombres/emails/teléfonos reales,
  secrets, API keys, raw prompts.
- Todo output debe ser **schema-compatible** con `OUTPUT_SCHEMAS[feature]` (validado en
  `tests/unit/us119-mock-ai-provider.spec.ts`, AC-07).

## Comportamiento

- **Determinismo (AC-02):** misma entrada/contexto → output deep-equal. Sin `Date.now` ni
  `Math.random` (`latencyMs` constante).
- **Idioma (AC-04):** fixture específica de idioma si existe (p. ej. `event_plan`/`en`); si no,
  output genérico (base `es-LATAM`).
- **Missing fixture (AC-05 / EC-01):** input válido sin match exacto → output genérico determinista
  + `logger.warn('ai.mock.fixture_missing', …)` con campos seguros (feature, language, promptVersionId,
  scenarioSeed) — sin raw input, prompts, secrets ni PII.
- **Errores tipados:** feature no soportada → `ValidationError` (EC-03); idioma no soportado →
  `UnsupportedLanguageError` (EC-04).
- **Metadata (AC-08):** `provider='mock'`, `fallbackUsed=false` (direct call), `promptVersion`,
  `rawOutputHash`.
- **Hooks de test** (`input.__simulate` ∈ {timeout, unavailable, invalid}): compatibilidad con US-097.

## Non-goals (US-119)

No implementa: `OpenAIProvider`/`AnthropicProvider`, selector runtime completo, `PromptRegistry`,
fallback orchestration/retry, persistencia de `AIRecommendation`, endpoints, UI, RAG/agents.

## Documentation alignment (DOC-002, no bloqueante)

- **Seed DB:** `docs/11-Data-Seed-Strategy.md` describe seed de `AIRecommendation`. US-119 sólo crea
  **fixtures del provider** (versionables, en código); **no** crea seed DB ni persiste `AIRecommendation`
  (pertenece a PB-P0-010).
- **Fallback:** `docs/17-AI-Architecture-and-PromptOps-Design.md` describe `fallbackUsed=true` cuando el
  mock es invocado por el fallback service. En US-119 la **llamada directa** usa `fallbackUsed=false`; la
  atribución de fallback pertenece a **PB-P0-011**.
- `AI_USE_MOCK_FALLBACK` (mencionada en la spec para demo) es una variable de **PB-P0-011** y queda
  fuera de US-119; la config de mock para test/CI ya funciona con `LLM_PROVIDER=mock` sin secrets.
