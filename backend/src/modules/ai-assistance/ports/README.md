# Contrato del puerto `LLMProvider` (US-117 / PB-P0-009)

Única superficie permitida para que la capa Application invoque generación IA. **Backend-only**:
el frontend nunca importa este puerto ni SDKs de proveedores. Los SDKs concretos
(`openai`, `@anthropic-ai/sdk`) sólo pueden vivir en `../infrastructure/` (adapters).

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `ai-contract.ts` | Tipos formales del contrato: `ProviderId`, `LanguageCode`, `PromptVersionId`, `AIContext`, `AIResult<TOutput>`. |
| `llm-provider.ts` | Interfaz `LLMProvider` (firma operativa `generate()`, US-097) y `LlmGenerationResult`. |
| `index.ts` | Barrel de import estable para adapters (US-118/119/120). |
| `ai-recommendation.repository.ts` | Puerto de persistencia de `AIRecommendation` (US-097). |

## Nota de alineación US-097 ↔ US-117 (importante)

US-097 (PB-P0-004) entregó primero un puerto operativo con un **único método** `generate({ feature,
input, languageCode, preferMock? }) → LlmGenerationResult`, consumido por `AiGenerationService`,
`MockAIProvider`, `UnavailableAIProvider` y la factory. US-117 **formaliza y endurece** ese contrato
sin romperlo (decisión de scope "Opción B"):

- Se conserva la firma `generate()` y `LlmGenerationResult` (no se migra a 7 métodos por feature).
- Se agregan los tipos formales `AIContext` y `AIResult<TOutput>` como la forma **auditable canónica**
  hacia la que convergen los adapters de US-118/119/120.
- `LlmGenerationResult.provider` se restringe a `ProviderId` (AC-06); `promptVersion` es el alias
  operativo de `AIResult.promptVersionId`.

Deviación registrada frente a la Technical Spec de US-117 (que prescribía métodos por feature +
`AIContext`/`AIResult` cableados en la firma): se documenta en el execution record de US-117
(`management/workflows/development-execution/P0/PB-P0-009/US-117-execution.md`, §9). Migrar la firma
a métodos por feature requeriría reescribir el stack IA de US-097 y una actualización formal de la
Tech Spec; queda como deuda técnica opcional, no bloqueante.

## Métodos / features MVP (AC-02, PO-001)

El registro de features (`../domain/ai-features.ts`) declara las features MVP invocables vía
`generate(feature, …)`: `event_plan`, `checklist`, `budget_suggestion`, `vendor_categories`,
`quote_brief`, `quote_comparison`, `task_prioritization` y **`vendor_bio`**.

**Decisión `generateVendorBio` (PO-001 / DOC-002):** `vendor_bio` queda **incluido** en el contrato
MVP ejecutable (ya implementado por `MockAIProvider` en US-097, con schema y scope `vendor`). No se
difiere ni se marca como no usado; US-118/119/120 deben soportarlo. No se agregan features future sin
ADR/decisión PO.

## Semántica de metadata (AI-002)

- **`fallbackUsed`** (`AIResult`, obligatorio): indica si la respuesta provino de un fallback
  controlado. US-117 **no** implementa fallback; sólo transporta el flag para auditoría (fallback a
  `MockAIProvider` pertenece a PB-P0-011).
- **`preferMock`** (`AIContext`, opcional): **sólo contexto**. El puerto no decide selección dinámica;
  composition/fallback autorizada lo honra bajo flags permitidos (EC-04).
- **`rawOutputHash`** (`AIResult`, opcional): hash de auditoría para trazar sin almacenar el texto
  crudo del provider (SEC-04). US-117 no calcula el hash real.
- **`correlationId` / `promptVersionId` / `provider` / `languageCode` / `latencyMs`**: metadata mínima
  para logs, métricas y auditoría en historias posteriores (AC-03/AC-04, OBS-001).

## Errores tipados (AC-05)

Definidos en `../../../shared/domain/errors/ai.errors.ts`, sin dependencia HTTP (el mapping a status
ocurre en `errorHandlerMiddleware`):

| Contrato US-117 (AC-05) | Implementación real | HTTP |
|---|---|---|
| timeout | `AiProviderTimeoutError` | 503 |
| output inválido | `AiInvalidOutputError` | 422 |
| provider no disponible | `AiProviderUnavailableError` | 503 |
| provider no configurado | `AIProviderNotConfiguredError` (nuevo, US-117) | 503 |

> Nota de naming: el nombre `AITimeoutError` ya existe en el shared kernel (US-093) mapeado a **504**
> con semántica distinta; por eso el timeout de provider conserva `AiProviderTimeoutError` (503) en
> vez de renombrarse.

## Non-goals de US-117

No se implementa: `OpenAIProvider`, selector runtime por `LLM_PROVIDER` (la factory de US-097 ya
resuelve mock/unavailable), `PromptRegistry`, `PromptBuilder`, `OutputValidator`, retry/fallback
service, persistencia nueva, endpoints REST, UI ni imports de SDKs en Application/Ports.
