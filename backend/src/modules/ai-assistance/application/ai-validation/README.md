# AI Output Validation — Zod strict + retry único (US-124 / PB-P0-011)

Capa **backend-only** que parsea y valida el output de `LLMProvider` contra schemas **Zod
`.strict()`** por feature, con **exactamente un retry** cuando el output falla parse/schema
(ADR-AI-007). Sólo output schema-valid puede convertirse en `AIRecommendation` exitosa (HITL).

> Alcance US-124: NO implementa providers, NO orquesta timeout/fallback (US-123), NO persiste
> (US-122), NO crea endpoints/UI. NO reintenta timeouts/provider errors (se delegan a US-123).

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `ai-output-parser.ts` | Parse JSON-only (objeto o string JSON; sin prosa, sin reparación). |
| `output-schema-registry.ts` | Resuelve el schema por `featureType`/`outputSchemaRef` (reutiliza `OUTPUT_SCHEMAS`). |
| `ai-output-validation.service.ts` | Valida con Zod strict; retorna typed output + metadata; summary Zod bounded. |
| `ai-retry-policy.ts` | `isRetryableOutputError` (sólo parse/schema) + `AI_MAX_OUTPUT_RETRIES=1`. |
| `validated-ai-execution.service.ts` | Orquesta generate → validate → retry(1) → fallback validado → error controlado. |
| `ai-validation-logger.ts` | Logs seguros (whitelist) de validation/retry/success. |

## Contrato de validación (AC-01/AC-08)

- **Parse JSON-only**: objeto plano o string JSON puro. Prosa+JSON, arrays y primitivos → `AI_OUTPUT_PARSE_ERROR`.
- **Zod `.strict()`**: campos extra, tipos/enums inválidos, required faltantes e invariants (currency/
  language) → `AI_INVALID_OUTPUT_SCHEMA`. Esto mitiga prompt-injection y salida fuera de contrato (SEC-05).
- **Summary seguro**: los errores exponen `schemaErrorSummary` **bounded** con sólo `path:code` de Zod
  — **nunca** valores del output ni raw output (SEC-04).

## Retry (AC-03/AC-04)

- Retry **máximo 1**, y **sólo** para `AiInvalidOutputError`/`AiInvalidOutputSchemaError`/`AiOutputParseError`.
- Timeout, provider unavailable/not-configured, auth, rate-limit, 5xx → **no retry**: se propagan
  (delegados a US-123). `retryCount=1` se registra cuando se hace el segundo intento.

## Fallback (AC-07)

Si ambos intentos fallan y el orquestador upstream provee un `fallback()` (delegado a la capa de
fallback de US-123 → `MockAIProvider`), su output **también** pasa por el mismo schema strict antes de
considerarse success. Fallback inválido → `AI_INVALID_OUTPUT` controlado. Sin fallback a Anthropic.

## Handoff a features AI consumidoras (DOC-002)

Las historias AI de feature (P1/P2) **no** deben duplicar validación/retry: deben:
1. Registrar/definir su schema strict en `OUTPUT_SCHEMAS` (domain) — la referencia estable es
   `ai.<featureType>.output.v1`.
2. Invocar `ValidatedAIExecutionService.execute({ featureType, correlationId, provider }, { generate, fallback? })`
   donde `generate(attempt)` envuelve la llamada al provider (vía la capa de US-123).
3. Consumir el resultado: `output` typed + `metadata` (`schemaValid`, `retryCount`, `schemaName`) para
   persistir con **US-122** (`AIRecommendation`, columna `retry_count` con constraint DB `0..1`).
4. En fallo controlado (`AI_INVALID_OUTPUT`) mapear a `422` en su endpoint; opcionalmente persistir un
   failure record seguro vía US-122 (`persistFailure`), nunca raw invalid output.

### Alineación documental (DOC-001) y schema (Deviation D2)

- ADR-AI-007 / docs/17: fallback MVP es `MockAIProvider`/US-123 (no plantilla estática); retry máx 1.
- El registry reutiliza `OUTPUT_SCHEMAS` (US-097) — no duplica schemas. `retry_count` es columna real
  (`AIRecommendation`, constraint `0..1`); `schema_valid` viaja como marker/`ai_meta` (no columna dedicada).
- Ubicación en `application/ai-validation/` (cohesión con `application/ai-execution/` de US-123);
  los folders de la spec (`infrastructure/output-validators/`) eran sugeridos. Métricas: N/A (sin infra).
