# `OpenAIProvider` (US-118 / PB-P0-009)

Adapter **Infrastructure** que implementa el puerto `LLMProvider` (US-117) usando la API de OpenAI.
Es el provider funcional principal del MVP cuando `LLM_PROVIDER=openai`. **Backend-only**: el
frontend nunca lo invoca ni recibe la API key.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `openai-config.ts` | `resolveOpenAIConfig()`: valida `OPENAI_API_KEY`/`OPENAI_MODEL` backend-only; lanza `AIProviderNotConfiguredError` si faltan. |
| `openai-client.ts` | Transport HTTP (`fetch` nativo Node 22, sin SDK) encapsulado + interfaz inyectable para tests. |
| `openai-error-mapper.ts` | Normaliza fallas a errores tipados del contrato. |
| `openai-provider.ts` | `OpenAIProvider implements LLMProvider` + `createOpenAIProvider()` para el factory. |

## Configuración (backend-only)

| Env var | Requerido | Default |
|---|---|---|
| `OPENAI_API_KEY` | sí (si `LLM_PROVIDER=openai`) | — |
| `OPENAI_MODEL` | sí (si `LLM_PROVIDER=openai`) | — |
| `OPENAI_BASE_URL` | no | `https://api.openai.com/v1` |
| `AI_TIMEOUT_MS` | no | `8000` (repo; nominal de la historia 60000) |

Config inválida falla de forma segura (`AIProviderNotConfiguredError`) sin imprimir el valor del
secreto. CI/tests usan `LLM_PROVIDER=mock` y **no** requieren secretos reales (AC-08).

## Comportamiento

- Solicita **structured output** (`response_format: { type: 'json_object' }`) y parsea el JSON.
- Timeout por llamada con `AbortController` (usa `config.timeoutMs`) → `AiProviderTimeoutError`.
- Mapea respuesta válida a `LlmGenerationResult` (forma operativa del puerto US-117): `provider='openai'`,
  `promptVersion`, `latencyMs`, `fallbackUsed=false`, `rawOutputHash`. El `AiGenerationService` valida
  el output contra el schema del feature y agrega `languageCode` al `aiMeta`.
- Logs seguros (`ai.request.success` / `ai.request.failed`) con `provider`, `model`, `featureType`,
  `languageCode`, `latencyMs`, `status`/`errorCode`. Nunca API key, prompts completos ni raw output.

### Mapeo de errores (AC-06)

| Falla | Error tipado | HTTP (error handler) |
|---|---|---|
| config ausente | `AIProviderNotConfiguredError` | 503 |
| timeout/abort | `AiProviderTimeoutError` | 503 |
| auth/quota/rate/5xx/red | `AiProviderUnavailableError` | 503 |
| JSON inválido / sin contenido | `AiInvalidOutputError` | 422 |

> Nota de naming (heredada de US-117): AC-05/AC-06 nombran `AITimeoutError`, pero ese nombre ya existe
> (US-093, HTTP 504) con semántica distinta; el timeout de provider usa `AiProviderTimeoutError` (503),
> consistente con el path AI de US-097.

## Notas de alineación con el puerto (US-117 Opción B)

El puerto operativo es `generate({ feature, input, languageCode, preferMock? }) → LlmGenerationResult`
y **no** transporta `AIContext`. Consecuencias (documentadas, no bloqueantes):

- **Timeout:** usa `AI_TIMEOUT_MS` (no `ctx.timeoutMs`, ausente en la firma).
- **promptVersionId:** el adapter lo genera (`openai:<model>`), como hace `MockAIProvider`; no llega
  desde el contexto.
- **correlationId:** no está disponible en la frontera del puerto, por eso no aparece en los logs del
  adapter. Se propagará cuando el puerto transporte `AIContext` (integración PB-P0-010/observability).

## Non-goals (US-118)

No implementa: `MockAIProvider`/`AnthropicProvider`, selector runtime completo, `PromptRegistry`/
`PromptBuilder`, fallback/retry (fallback pertenece a PB-P0-011, `fallbackUsed` siempre `false`),
persistencia de `AIRecommendation`, endpoints, UI, streaming/RAG/tool calling. No hace DB writes ni
decide autorización/ownership/rate limit.

## Nota de selector `anthropic` (DOC-002, no bloqueante)

`docs/9-Functional-Requirements-Document.md` (FR-AI-016) lista `LLM_PROVIDER` como `openai | mock`,
mientras PB-P0-009 y ADR-AI-001 incluyen `anthropic` como stub. US-118 sólo implementa `openai`; el
factory rutea `anthropic → AnthropicProvider` stub explícito (US-120). No se modifica el FRD ni se
implementa Anthropic funcional aquí.
