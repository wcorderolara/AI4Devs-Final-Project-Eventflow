# User Story: US-118 - Implementar OpenAIProvider

## Metadata

| Field | Value |
| --- | --- |
| ID | US-118 |
| Epic | EPIC-AI-001 |
| Feature | OpenAIProvider adapter |
| Module / Domain | AI Assistance / Platform |
| User Role | System |
| Priority | Must Have (P0) |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Approved By | Product Owner / Business Analyst Review |
| Approval Date | 2026-06-16 |
| Ready for Development Tasks | Yes |
| Sprint / Milestone | MVP Foundation |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-16 |

---

## User Story

**As the** EventFlow backend platform  
**I want** implementar `OpenAIProvider` como adapter principal MVP que cumple el contrato `LLMProvider`  
**So that** las features IA puedan invocar OpenAI desde backend de forma tipada, configurable, segura y desacoplada de los use cases.

---

## Business Context

### Context Summary

EventFlow requiere un provider IA funcional para las features MVP. ADR-AI-002 define `OpenAIProvider` como proveedor principal del MVP, mientras ADR-AI-001 exige que los use cases dependan del puerto `LLMProvider` y no del SDK de OpenAI. Esta historia implementa el adapter OpenAI dentro de Infrastructure, con configuración segura, timeout, errores tipados y salida compatible con `AIResult<TOutput>`.

Esta historia depende del contrato `LLMProvider` de US-117. `MockAIProvider` y `AnthropicProvider` quedan en US-119 y US-120. Persistencia de `AIRecommendation`, prompt registry, fallback y validación/retry avanzada quedan en PB-P0-010/PB-P0-011.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| --- | --- |
| Primary provider | `OpenAIProvider` es el provider funcional principal del MVP cuando `LLM_PROVIDER=openai`. |
| Adapter boundary | `OpenAIProvider` implementa `LLMProvider` y vive en Infrastructure; Application/use cases no importan SDK OpenAI. |
| Configuration | API key, model, base URL opcional y timeout se configuran por env vars backend-only. |
| Structured output | El adapter debe solicitar JSON estructurado o equivalente compatible con los schemas de salida definidos para cada feature. |
| Error mapping | Errores de transporte, timeout, provider unavailable, configuración ausente y output inválido se traducen a errores tipados del contrato. |
| No fallback ownership | `OpenAIProvider` no ejecuta fallback a mock por sí mismo; fallback pertenece a PB-P0-011. |
| No persistence | `OpenAIProvider` no persiste `AIRecommendation`, no escribe DB y no materializa cambios de dominio. |

### Related Domain Concepts

- `LLMProvider`.
- `OpenAIProvider`.
- `AIContext`.
- `AIResult<TOutput>`.
- `PromptBuilder` / prompt payload.
- `PromptVersionId`.
- Structured JSON output.
- `AITimeoutError`.
- `AIInvalidOutputError`.
- `AIProviderUnavailableError`.
- `AIProviderNotConfiguredError`.
- `correlationId`.
- `rawOutputHash`.

### Assumptions

- US-117 define y aprueba el contrato `LLMProvider`.
- `OpenAIProvider` puede usar el SDK oficial o un cliente HTTP encapsulado dentro de Infrastructure.
- `OPENAI_API_KEY` es secreto backend-only y no se expone a frontend ni logs.
- Los prompts/versiones y schemas finales de salida se proveen por componentes de PromptOps o contratos compartidos; US-118 no crea prompt registry.
- Tests automáticos no llaman OpenAI real; usan mocks del SDK/HTTP client.

### Dependencies

- PB-P0-002: Backend Modular Monolith Bootstrap.
- PB-P0-009: US-117 `LLMProvider` port.
- ADR-AI-001: Use `LLMProvider` Abstraction.
- ADR-AI-002: Use `OpenAIProvider` as Primary MVP Provider.
- ADR-AI-003: Use `MockAIProvider` for Demo, Testing, and Controlled Fallback.
- ADR-TEST-003: Use `MockAIProvider` / deterministic mocks for automated tests.

---

## Traceability

| Source | Reference |
| --- | --- |
| Product Backlog Item | PB-P0-009 - LLMProvider Port + Adapters |
| Epic | EPIC-AI-001 - LLMProvider & PromptOps |
| FRD Requirement(s) | FR-AI-* transversal; FR-AI-014 deterministic testing through mock provider; FR-AI-017 language propagation |
| Use Case(s) | UC-AI-001..009 as future consumers through `LLMProvider`; this story implements provider infrastructure only |
| Business Rule(s) | BR-AI-005 provider abstraction; BR-AI-006 backend-only provider access; BR-AI-007 structured output validation boundary; BR-AI-009 timeout 60s |
| Permission Rule(s) | Auth/ownership/rate limit must happen before AI invocation in consuming endpoints; not implemented here |
| Data Entity / Entities | No direct entity change; future `AIRecommendation` persistence is PB-P0-010 |
| API Endpoint(s) | No endpoints created; future `/api/v1/.../ai/*` endpoints call use cases that depend on `LLMProvider` |
| NFR Reference(s) | NFR-AI-*; NFR-SEC-*; NFR-OBS-* |
| Related ADR(s) | ADR-AI-001, ADR-AI-002, ADR-AI-003, ADR-AI-004, ADR-TEST-003 |
| Related Document(s) | `management/artifacts/4-Product-Backlog-Prioritized.md`; `docs/7-AI-Features-Specification.md`; `docs/14-Backend-Technical-Design.md`; `docs/17-AI-Architecture-and-PromptOps-Design.md`; `docs/20-Testing-Strategy.md`; `docs/22-Architecture-Decision-Records.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope.
- MVP Relevance: Must Have (P0).
- Delivery Value: provider IA funcional principal para el MVP, sin acoplar Application a OpenAI.

### In Scope

- Implementar `OpenAIProvider` como adapter Infrastructure que cumple `LLMProvider`.
- Leer configuración backend-only: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` opcional y `AI_TIMEOUT_MS`.
- Fail-fast o error controlado si `LLM_PROVIDER=openai` y falta configuración requerida.
- Aplicar timeout por llamada usando `ctx.timeoutMs` o configuración aprobada.
- Enviar prompts/payloads al API OpenAI usando JSON structured output o equivalente.
- Mapear respuestas exitosas a `AIResult<TOutput>` con metadata requerida.
- Mapear errores OpenAI/transporte/config/timeout/output inválido a errores tipados del contrato.
- Tests unitarios/integration con mocked OpenAI client; sin red real en CI.
- Redacción de logs para no exponer prompts completos, API keys, tokens, raw payloads sensibles ni outputs crudos.

### Explicitly Out of Scope

- Definir el puerto `LLMProvider`; cubierto por US-117.
- Implementar `MockAIProvider`; cubierto por US-119.
- Implementar `AnthropicProvider` stub; cubierto por US-120.
- Implementar `PromptRegistry`, `PromptBuilder` completo o versionado de prompts; cubierto por PB-P0-010.
- Persistir `AIRecommendation`; cubierto por PB-P0-010.
- Implementar fallback automático a mock, retry de JSON inválido o fallback service; cubierto por PB-P0-011.
- Crear endpoints IA.
- Implementar UI, streaming, RAG, tool calling, function calling avanzado o decisiones IA autónomas.
- Llamar OpenAI real desde CI.

### Scope Notes

US-118 debe probar que el adapter es funcional y sustituible a nivel de contrato, pero sin convertirlo en owner de orchestration, fallback, persistence, PromptOps ni UX.

---

## Acceptance Criteria

### AC-01: OpenAIProvider implements LLMProvider

**Given** el contrato `LLMProvider` aprobado en US-117  
**When** se implementa `OpenAIProvider`  
**Then** el adapter implementa todos los métodos requeridos por el puerto para las features IA MVP  
**And** los use cases pueden depender sólo de `LLMProvider`, no de `OpenAIProvider` ni SDK OpenAI.

### AC-02: Backend-only configuration is validated

**Given** `LLM_PROVIDER=openai`  
**When** el backend inicia o resuelve el provider  
**Then** `OPENAI_API_KEY` y `OPENAI_MODEL` son requeridos  
**And** `OPENAI_BASE_URL` es opcional  
**And** configuración inválida falla de forma segura sin imprimir secretos.

### AC-03: OpenAI requests use structured output

**Given** una llamada IA con input y `AIContext` válidos  
**When** `OpenAIProvider` invoca OpenAI  
**Then** solicita salida JSON estructurada o mecanismo equivalente compatible con el output DTO/schema de la feature  
**And** no envía datos fuera del prompt/input/context aprobado por el caller.

### AC-04: Successful response maps to AIResult

**Given** OpenAI responde exitosamente con output válido  
**When** el adapter procesa la respuesta  
**Then** retorna `AIResult<TOutput>` con `provider='openai'`, `promptVersionId`, `languageCode`, `latencyMs`, `fallbackUsed=false` y `rawOutputHash` cuando aplique  
**And** no persiste nada en DB.

### AC-05: Timeout is enforced

**Given** `ctx.timeoutMs` o `AI_TIMEOUT_MS=60000`  
**When** la llamada excede el timeout  
**Then** `OpenAIProvider` aborta o marca timeout de forma controlada  
**And** lanza `AITimeoutError` o error tipado equivalente  
**And** no ejecuta fallback por sí mismo.

### AC-06: Provider errors are mapped to typed errors

**Given** OpenAI responde con error de red, auth, quota/rate provider, 5xx, output inválido o configuración faltante  
**When** el adapter captura la falla  
**Then** traduce a `AIProviderUnavailableError`, `AIProviderNotConfiguredError`, `AIInvalidOutputError`, `AITimeoutError` o equivalente del contrato  
**And** no expone API keys, raw provider response sensible ni stack interno al caller público.

### AC-07: Logs are safe and traceable

**Given** una llamada OpenAI exitosa o fallida  
**When** se emiten logs técnicos  
**Then** incluyen metadata segura como `correlationId`, provider, model, promptVersionId, latency, status/error code  
**And** no incluyen `OPENAI_API_KEY`, cookies, tokens, prompts completos, raw request body sensible ni raw output completo.

### AC-08: Automated tests do not call real OpenAI

**Given** la suite automatizada local/CI  
**When** se prueban success, timeout y error mapping de `OpenAIProvider`  
**Then** se usa mock del SDK/HTTP client o fake transport  
**And** no se requiere `OPENAI_API_KEY` real  
**And** los tests son determinísticos.

---

## Edge Cases

### EC-01: `OPENAI_API_KEY` ausente

**Given** `LLM_PROVIDER=openai` y `OPENAI_API_KEY` vacío  
**When** el provider se inicializa o se invoca  
**Then** falla con `AIProviderNotConfiguredError` o fail-fast seguro.

#### Handling

No loggear el valor de la key ni sugerir valores reales.

### EC-02: OpenAI retorna JSON inválido o incompleto

**Given** OpenAI responde con payload que no cumple el output esperado  
**When** el adapter intenta mapear la respuesta  
**Then** lanza `AIInvalidOutputError`.

#### Handling

El retry/fallback posterior queda fuera de US-118 y pertenece a PB-P0-011.

### EC-03: OpenAI timeout

**Given** OpenAI tarda más que `timeoutMs`  
**When** se excede la ventana permitida  
**Then** la llamada se aborta o se marca como timeout y se lanza `AITimeoutError`.

#### Handling

No fallback directo en el adapter.

### EC-04: Rate/quota del provider

**Given** OpenAI responde con rate/quota/provider unavailable  
**When** el adapter captura el error  
**Then** lo normaliza como error tipado de provider unavailable sin filtrar detalles sensibles.

#### Handling

El rate limit de EventFlow propio es US-110; esto sólo mapea errores del provider externo.

### EC-05: Tests con red accidental

**Given** ejecución CI  
**When** un test intenta llamar OpenAI real  
**Then** debe fallar por configuración de test o por mock obligatorio.

#### Handling

Usar fake transport y no cargar secretos reales en CI.

---

## Validation Rules

| ID | Rule | Message / Behavior |
| --- | --- | --- |
| VR-01 | `OPENAI_API_KEY` requerido cuando `LLM_PROVIDER=openai` | `AIProviderNotConfiguredError` o fail-fast seguro |
| VR-02 | `OPENAI_MODEL` requerido cuando `LLM_PROVIDER=openai` | Config inválida |
| VR-03 | `AI_TIMEOUT_MS` / `ctx.timeoutMs` debe ser entero positivo | Config inválida o fallback a default aprobado |
| VR-04 | `provider` en `AIResult` debe ser `openai` | Resultado auditable |
| VR-05 | `fallbackUsed` debe ser `false` en respuestas directas de OpenAIProvider | Fallback no ocurre en el adapter |
| VR-06 | OpenAI SDK/client sólo puede importarse en Infrastructure adapter | Clean/Hexagonal boundary |
| VR-07 | CI no usa red real ni secretos reales de OpenAI | Tests determinísticos |

---

## Authorization & Security Rules

| ID | Rule |
| --- | --- |
| SEC-01 | `OpenAIProvider` es backend-only. |
| SEC-02 | API key sólo se lee desde configuración/secrets backend; nunca desde request ni frontend. |
| SEC-03 | El adapter no decide authorization, ownership ni rate limit; esos controles deben ocurrir antes de invocarlo. |
| SEC-04 | Logs no incluyen API keys, tokens, cookies, prompts completos, raw payload sensible ni raw output completo. |
| SEC-05 | SDK OpenAI no se importa fuera de Infrastructure provider. |
| SEC-06 | Errores públicos se construyen fuera del adapter; el adapter sólo lanza errores tipados seguros. |

### Negative Authorization Scenarios

No aplica como endpoint runtime. Esta historia no crea API ni autoriza usuarios directamente.

### Security Negative Scenarios

- `OPENAI_API_KEY` aparece en logs → fallo de seguridad.
- SDK OpenAI importado desde Application/use case → fallo arquitectónico.
- Tests CI requieren secreto real → fallo de QA/security.
- Adapter persiste payload/output crudo sin pasar por gobernanza de `AIRecommendation` → fuera de scope.

---

## AI Behavior

US-118 implementa un provider IA real, pero no implementa una feature de usuario final por sí misma.

### AI Involvement

| Field | Value |
| --- | --- |
| AI Feature | AI provider infrastructure |
| Provider Layer | `OpenAIProvider` implementing `LLMProvider` |
| Human Validation Required | No aplica en esta historia; aplica en use cases consumidores |
| Persist AIRecommendation | No |
| Fallback Required | No en esta historia |

### AI Input

El adapter recibe input DTO y `AIContext` definidos por `LLMProvider`. Prompt content y prompt version provienen del caller/PromptOps; US-118 no define contenido de prompts.

### AI Output

El adapter retorna `AIResult<TOutput>` con output tipado y metadata. No materializa cambios de dominio.

### Human-in-the-loop Rules

No se modifica HITL. Los endpoints/use cases consumidores deben persistir sugerencias como `AIRecommendation.pending` y requerir aceptación humana antes de aplicar cambios.

### AI Error / Fallback Behavior

El adapter lanza errores tipados. Retry, fallback a `MockAIProvider`, persistencia de fallas y traducción HTTP corresponden a capas superiores/backlogs posteriores.

---

## UX / UI Notes

| Area | Notes |
| --- | --- |
| Screen / Route | N/A - backend provider adapter |
| Main UI Pattern | N/A |
| Primary Action | N/A |
| Secondary Actions | N/A |
| Empty State | N/A |
| Loading State | N/A |
| Error State | N/A |
| Success State | N/A |
| Accessibility Notes | No aplica; no introduce UI |
| Responsive Notes | No aplica |
| i18n Notes | El adapter respeta `AIContext.language`; no renderiza UI |
| Currency Notes | Respeta `AIContext.currency`; no convierte moneda |

---

## Technical Notes

### Frontend

- No requiere cambios frontend.
- El frontend nunca accede a OpenAI ni a provider keys.
- No se agregan route guards, UI o API client behavior.

### Backend

- Implementar en Infrastructure, por ejemplo `src/modules/ai-assistance/infrastructure/providers/openai/`.
- Implementa `LLMProvider` de US-117.
- Usa configuración backend-only.
- Traduce request/response OpenAI al contrato EventFlow.
- Usa timeout por llamada.
- Lanza errores tipados.
- No persiste DB ni ejecuta fallback.

### Database

- No requiere schema, migrations ni writes.
- No crea `AIRecommendation`.

### API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| — | — | No crea endpoints |

### Observability / Audit

- Logs técnicos seguros con `correlationId`, `provider=openai`, model, promptVersionId, latency, status/error code.
- No `AdminAction`.
- No `AIRecommendation` en esta historia.
- `rawOutputHash` puede calcularse para auditoría, pero persistencia queda fuera.

---

## Test Scenarios

### Functional Tests

| ID | Scenario | Type |
| --- | --- | --- |
| TS-01 | `OpenAIProvider` implementa `LLMProvider` y compila contra el contrato | Unit/Type |
| TS-02 | Success response mocked retorna `AIResult` con `provider=openai` y metadata obligatoria | Unit |
| TS-03 | Request usa model/config esperados y structured output/equivalente | Unit |
| TS-04 | Adapter no persiste DB ni llama fallback | Unit/Integration |

### Negative Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| NT-01 | `OPENAI_API_KEY` ausente con `LLM_PROVIDER=openai` | `AIProviderNotConfiguredError` o fail-fast seguro |
| NT-02 | `OPENAI_MODEL` ausente | Config inválida |
| NT-03 | Timeout del cliente mockeado | `AITimeoutError` |
| NT-04 | Provider/network error mockeado | `AIProviderUnavailableError` o equivalente |
| NT-05 | Output inválido/mock response incompleta | `AIInvalidOutputError` |
| NT-06 | Test intenta red real en CI | Falla configuración de test |

### AI Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AI-TS-01 | Cada método MVP del puerto puede delegar al cliente OpenAI mockeado | OK |
| AI-TS-02 | `fallbackUsed=false` en respuestas directas OpenAI | OK |
| AI-TS-03 | `languageCode` y `promptVersionId` se preservan desde context | OK |

### Authorization Tests

No aplica — no crea endpoints ni autorización runtime.

### Security Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| SEC-TS-01 | Logs no contienen `OPENAI_API_KEY` ni prompts completos | Pass |
| SEC-TS-02 | SDK OpenAI no se importa fuera de Infrastructure adapter | Pass |
| SEC-TS-03 | CI no requiere secreto real | Pass |

### Accessibility Tests

No aplica — no hay UI.

### Seed / Demo Tests

No requiere seed. Demo real depende de configuración `LLM_PROVIDER=openai`, pero smoke manual con OpenAI real no es requerido por CI.

---

## Business Impact

| Field | Value |
| --- | --- |
| KPI Affected | AI readiness, provider reliability, demo robustness, architecture quality |
| Expected Impact | Habilita generación IA real vía provider principal sin acoplar dominio a OpenAI |
| Success Criteria | Adapter compila contra `LLMProvider`, maneja config/timeout/errores y pasa tests mockeados |
| Academic Demo Value | Demuestra integración provider real controlada y sustituible |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

- No aplica.

### Potential Backend Tasks

- Crear `OpenAIProvider` en Infrastructure.
- Configurar env parsing/validation para OpenAI.
- Implementar client wrapper/adapter methods.
- Implementar timeout/error mapping.
- Implementar safe logging.

### Potential Database Tasks

- No aplica.

### Potential AI / PromptOps Tasks

- Mapear input/context al request OpenAI usando prompt payload aprobado.
- Solicitar structured output/equivalente.
- Preservar `languageCode`, `promptVersionId`, `latencyMs`, `fallbackUsed=false`.

### Potential QA Tasks

- Unit tests con mocked OpenAI client.
- Negative tests de config, timeout, network/provider error y invalid output.
- Security tests de no secrets/logs y no SDK import fuera de Infrastructure.

### Potential DevOps / Config Tasks

- Agregar env vars backend-only a templates: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, `AI_TIMEOUT_MS`.
- Asegurar que CI no requiere `OPENAI_API_KEY`.

---

## Definition of Ready

- [x] Backlog item identificado: PB-P0-009.
- [x] Epic identificado: EPIC-AI-001.
- [x] Alcance limitado a `OpenAIProvider`.
- [x] Dependencia con US-117 clara.
- [x] Separación clara frente a US-119, US-120, PB-P0-010 y PB-P0-011.
- [x] Acceptance Criteria claros y testeables.
- [x] Seguridad backend-only explícita.
- [x] AI behavior y HITL aclarados.
- [x] Sin impacto DB/API/UI directo.
- [x] Out of scope explícito.

## Definition of Done

- [ ] `OpenAIProvider` implementa `LLMProvider`.
- [ ] Config OpenAI backend-only validada.
- [ ] Timeout por llamada implementado y testeado.
- [ ] Respuestas exitosas se mapean a `AIResult<TOutput>`.
- [ ] Errores OpenAI/config/timeout/output inválido se mapean a errores tipados.
- [ ] Logs no exponen secrets, prompts completos ni raw outputs sensibles.
- [ ] Tests automatizados usan mocks/fake transport y no llaman OpenAI real.
- [ ] SDK OpenAI no se importa fuera de Infrastructure provider.
- [ ] No se crean endpoints, migrations, fallback service, prompts, `AIRecommendation` ni UI.
