# `AnthropicProvider` — stub no funcional (US-120 / PB-P0-009)

Adapter **Infrastructure** que implementa el puerto `LLMProvider` (US-117) **sólo como stub**. Existe
para demostrar la **sustituibilidad** del puerto (cumple el contrato como `OpenAIProvider` y
`MockAIProvider`), pero **no es funcional**: toda invocación falla explícitamente. Preserva ADR-AI-004.

## Comportamiento

- `generate(...)` **siempre rechaza** con `AIProviderNotConfiguredError` (`code = AI_PROVIDER_NOT_CONFIGURED`),
  metadata segura `provider='anthropic'`, `causeCode='ANTHROPIC_STUB_NOT_IMPLEMENTED_MVP'` y mensaje
  claro: *Anthropic es un stub no funcional en el MVP*. Nunca retorna un `AIResult` exitoso (AC-02).
- El error handler mapea `AIProviderNotConfiguredError` → HTTP **503** (US-117).
- Emite `logger.warn('ai.provider.not_implemented', { provider, featureType, errorCode })` ante
  activación accidental (AC-06). **No** loguea input, prompts, payloads ni secrets.

## Garantías (non-goals estrictos)

- **Sin SDK Anthropic** (`@anthropic-ai/sdk` no se importa ni se declara como dependencia).
- **Sin `ANTHROPIC_API_KEY`** ni secret alguno (no existe en el env schema).
- **Sin red externa** (no `fetch`/HTTP).
- **Sin prompts, sin output IA real, sin persistencia, sin endpoints, sin UI.**
- **Sin fallback:** Anthropic **nunca** es fallback target. El fallback controlado usa `MockAIProvider`
  (PB-P0-011). No hay failover OpenAI → Anthropic.

Guardrails verificados por tests: `tests/unit/us120-anthropic-provider.spec.ts` (contract + failure +
selector + safe logs) y `tests/unit/us120-anthropic-no-sdk.guard.spec.ts` (no SDK/secret/red/dependency).

## Selector (AC-04)

El factory `selectProvider(providerId, demoMode)` (`llm-provider.factory.ts`) resuelve
`anthropic → AnthropicProvider` **explícitamente**; nunca cae en silencio a `openai` ni `mock`. Con
`LLM_PROVIDER=anthropic` el backend resuelve sólo al stub que falla claramente. `demoMode`/`mock`
siguen resolviendo a `MockAIProvider` (offline/CI/demo).

## Documentation alignment (DOC-002, no bloqueante)

`docs/9-Functional-Requirements-Document.md` (FR-AI-016) lista el selector como `openai | mock`,
mientras PB-P0-009 y ADR-AI-001/004 incluyen `anthropic` como **stub**. **Anthropic funcional es
Future**: requiere un nuevo backlog item y, si altera decisiones MVP, revisión PO/ADR. No hay UI
selector ni comparación de providers en el MVP.
