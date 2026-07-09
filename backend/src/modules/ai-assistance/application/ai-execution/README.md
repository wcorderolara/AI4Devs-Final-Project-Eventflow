# AI Execution — timeout 60s + fallback Mock controlado (US-123 / PB-P0-011)

Capa **backend-only** que envuelve las invocaciones a `LLMProvider` con un **timeout de 60,000 ms**
(default oficial, PO Decision 8.1 #9 / BR-AI-009) y un **fallback controlado** a `MockAIProvider`
sólo en modo demo/test. No crea endpoints, no persiste, no valida JSON ni reintenta (eso es US-124).

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `ai-execution-types.ts` | `AIExecutionInput/Result/Metadata/Config`. |
| `ai-execution-config.ts` | `readAIExecutionConfig(env)` + `validateAIExecutionConfig` (`AiConfigInvalidError`). |
| `ai-timeout.service.ts` | `withTimeout(op, {timeoutMs})` — corta la espera; ignora resultado tardío. |
| `fallback.service.ts` | Elegibilidad + allowlist de fallback (**sólo `mock`**). |
| `ai-execution.service.ts` | `AIExecutionService.execute` — orquesta primario + timeout + fallback + metadata. |
| `ai-execution-logger.ts` | Logs seguros (whitelist) de timeout/fallback/failure. |
| `../../infrastructure/ai-execution.factory.ts` | Wiring con la provider factory real. |

## Reglas de fallback (AC-02..AC-05)

- Fallback permitido **sólo** si `AI_DEMO_MODE=true` **o** `AI_USE_MOCK_FALLBACK=true`.
- Único target de fallback: **`MockAIProvider`**. `AnthropicProvider` **nunca** es fallback (ADR-AI-004).
- `LLM_PROVIDER=mock` ⇒ mock es **primario** con `fallbackUsed=false` (no cuenta como fallback).
- Fallback deshabilitado ⇒ **error controlado** (`AI_PROVIDER_TIMEOUT` / `AI_PROVIDER_UNAVAILABLE`),
  **sin** llamar a mock (no silent fallback en producción, AC-03).
- Si el mock fallback también falla ⇒ `AI_FALLBACK_FAILED` (sin loop, sin Anthropic).

## Matriz de environments (Deviation D1)

El repo usa `NODE_ENV`; la matriz de la historia se mapea así:

| Perfil | LLM_PROVIDER | AI_DEMO_MODE | AI_USE_MOCK_FALLBACK | AI_LOG_PAYLOADS | Mapeo repo |
|---|---|---|---|---|---|
| local-dev | openai/mock | false | opcional | false | NODE_ENV=development |
| test | mock | false | false | false | NODE_ENV=test |
| demo-academic | openai | true | true | false | NODE_ENV≠production, demo |
| production-academic | openai | false | false | false | NODE_ENV=production |

Config validation (env.ts superRefine **y** `validateAIExecutionConfig`): en `NODE_ENV=production`
los flags `AI_DEMO_MODE`/`AI_USE_MOCK_FALLBACK` deben ser false (sin fallback silencioso) y
`AI_LOG_PAYLOADS=true` está prohibido en demo/producción (SEC-04). `AI_TIMEOUT_MS` default `60000`
(Deviation D2, reemplaza el placeholder `8000` de US-097).

## Observabilidad (AC-08) — Deviation OBS-002

Eventos seguros: `ai.provider.timeout`, `ai.provider.failure`, `ai.fallback_used`,
`ai.fallback_failed`, `ai.config.invalid`. **Métricas** (`ai_timeout_total`, etc.) quedan como
**No Aplicable** en el MVP: el proyecto aún no tiene infraestructura de métricas (Prometheus/OTel);
los logs estructurados son la fuente de observabilidad (la spec §14 marca métricas como opcionales).

## Handoff a US-124 (DOC-002)

US-123 entrega el **output primario o fallback + `AIExecutionMetadata`**. **No** valida JSON ni
reintenta output inválido: eso es responsabilidad de **US-124**. El output de fallback (mock) debe
pasar por la validación de US-124 antes de considerarse success en historias consumidoras. La
metadata (`provider`, `originalProvider`, `fallbackUsed`, `fallbackReason`, `timeoutMs`, `latencyMs`,
`originalErrorCode`, `correlationId`, `status`) es consumible por **US-122** para persistir
`AIRecommendation`, incluyendo el path de error (los errores tipados exponen `.meta`).

## Adopción incremental

El path de endpoint de US-097 sigue usando `createLlmProvider()` (demo→mock directo) hasta que un
use case migre a `createAIExecutionService()`. US-123 entrega la capa; la adopción por los use cases
de feature es incremental y no rompe el comportamiento existente.
