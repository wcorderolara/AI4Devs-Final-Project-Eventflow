# Technical Specification — US-118: Implementar OpenAIProvider

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-118 |
| Source User Story | `management/user-stories/US-118-openai-provider-adapter.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usa `PO/BA Decisions Applied` de la User Story aprobada |
| Priority | P0 |
| Backlog ID | PB-P0-009 |
| Backlog Title | LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub) |
| Backlog Execution Order | 9 |
| User Story Position in Backlog Item | 2 of 4 |
| Related User Stories in Backlog Item | US-117, US-118, US-119, US-120 |
| Epic | EPIC-AI-001 |
| Backlog Item Dependencies | PB-P0-002 |
| Feature | OpenAIProvider adapter |
| Module / Domain | AI Assistance / Platform |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-16 |
| Last Updated | 2026-06-16 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-009 implementa la foundation de provider IA: contrato `LLMProvider`, adapter principal `OpenAIProvider`, adapter determinista `MockAIProvider`, stub `AnthropicProvider` y selección por configuración backend. US-118 cubre sólo el adapter funcional principal para OpenAI.

### Execution Order Rationale

US-118 debe ejecutarse después de US-117 porque depende del contrato `LLMProvider`, `AIContext`, `AIResult<TOutput>`, `ProviderId`, `LanguageCode` y errores tipados definidos por el puerto. Debe ejecutarse antes o en paralelo controlado con US-119/US-120 sólo si el contrato ya está estable.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-117 | Define el puerto `LLMProvider` y tipos/errores compartidos | 1 |
| US-118 | Implementa `OpenAIProvider` funcional principal contra el puerto | 2 |
| US-119 | Implementa `MockAIProvider` determinista para CI/demo/testing | 3 |
| US-120 | Implementa `AnthropicProvider` stub no funcional | 4 |

---

## 3. Executive Technical Summary

Implementar `OpenAIProvider` como adapter Infrastructure que satisface `LLMProvider` sin exponer SDK OpenAI fuera de Infrastructure. El adapter debe leer configuración backend-only, construir requests usando prompt/input/context provistos por capas superiores, solicitar salida estructurada compatible con los schemas de salida, aplicar timeout por llamada, mapear respuestas exitosas a `AIResult<TOutput>` y traducir fallas a errores tipados del contrato.

La implementación no crea endpoints, no persiste `AIRecommendation`, no implementa fallback a mock, no implementa retry avanzado, no define PromptRegistry y no materializa entidades de dominio. Los tests automatizados deben usar mocked SDK/client o fake transport y nunca llamar OpenAI real en CI.

---

## 4. Scope Boundary

### In Scope

- Crear `OpenAIProvider` en Infrastructure.
- Implementar todos los métodos requeridos por `LLMProvider` para features IA MVP cubiertas por US-117.
- Encapsular SDK oficial OpenAI o cliente HTTP equivalente dentro del adapter.
- Leer/validar configuración backend-only: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL?`, `AI_TIMEOUT_MS`.
- Aplicar `ctx.timeoutMs` o default aprobado de 60_000 ms.
- Solicitar JSON structured output o mecanismo equivalente compatible con schemas/DTOs.
- Mapear respuesta exitosa a `AIResult<TOutput>` con `provider='openai'` y `fallbackUsed=false`.
- Mapear errores de config, auth, transport, quota/rate, timeout, 5xx y output inválido a errores tipados.
- Emitir logs seguros y trazables.
- Agregar tests con mocked SDK/client o fake transport.

### Out of Scope

- Definir o modificar `LLMProvider`; cubierto por US-117.
- Implementar `MockAIProvider`; cubierto por US-119.
- Implementar `AnthropicProvider`; cubierto por US-120.
- Implementar selector/composition root completo por `LLM_PROVIDER`.
- Implementar `PromptRegistry`, `PromptBuilder` completo, prompt lifecycle o versionado de prompts.
- Persistir `AIRecommendation`.
- Implementar fallback service, retry avanzado o degradación automática a mock.
- Crear endpoints REST IA.
- Crear UI o API client frontend.
- Crear migrations, modelos Prisma o seed.
- Ejecutar OpenAI real en CI.

### Explicit Non-Goals

- No implementar streaming.
- No implementar RAG, vector database, agents o tool calling.
- No implementar failover a Anthropic.
- No exponer provider selector en UI.
- No almacenar raw prompts/outputs sensibles desde el adapter.
- No tomar decisiones de autorización, ownership o rate limit dentro del provider.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. `OpenAIProvider` vive en Infrastructure y depende del puerto definido por US-117. Application/use cases dependen de `LLMProvider`, no de `OpenAIProvider` ni del SDK. El adapter puede usar un wrapper interno para SDK/HTTP y configuración, pero no debe filtrar tipos SDK al dominio.

### Frontend Architecture

No aplica. No hay cambios frontend. El frontend nunca llama OpenAI ni recibe API keys.

### Database Architecture

No aplica. No hay migrations, Prisma models ni writes. Persistencia de `AIRecommendation` pertenece a PB-P0-010.

### API Architecture

No aplica. No se crean endpoints. Futuros controllers invocarán use cases que dependan de `LLMProvider`.

### AI / PromptOps Architecture

Aplica. El adapter implementa el provider principal MVP:

- Respeta `AIContext`.
- Solicita structured output.
- Retorna `AIResult<TOutput>`.
- Usa errores tipados del contrato.
- No construye prompts completos si PromptBuilder/PromptRegistry aún no existen; consume el payload aprobado por el caller.
- No implementa retry/fallback/persistence.

### Security Architecture

Aplica. `OPENAI_API_KEY` se lee sólo desde configuración backend/secrets y no desde request/frontend. Logs y errores deben excluir secrets, tokens, cookies, prompts completos, raw request body sensible y raw outputs completos.

### Testing Architecture

Aplica. Unit/integration tests de provider deben usar fake transport o mocked client. Las pruebas con OpenAI real son manuales/opcionales, excluidas de CI y no bloquean PR.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 OpenAIProvider implements LLMProvider | Clase/module en Infrastructure implementa todos los métodos del puerto y compila contra US-117. | Backend, AI |
| AC-02 Backend-only configuration is validated | Config parser/validator exige API key/model cuando `LLM_PROVIDER=openai`; errores no revelan secretos. | Backend, Security, DevOps |
| AC-03 OpenAI requests use structured output | Adapter configura request con JSON schema/structured output o equivalente y payload aprobado por caller. | Backend, AI |
| AC-04 Successful response maps to AIResult | Response válida se convierte a `AIResult<TOutput>` con metadata obligatoria y sin DB writes. | Backend, AI, Observability |
| AC-05 Timeout is enforced | Usar `AbortController`, SDK timeout o wrapper equivalente; lanzar `AITimeoutError`; sin fallback. | Backend, AI, Reliability |
| AC-06 Provider errors are mapped to typed errors | Normalizar auth/quota/network/5xx/config/invalid output a errores del contrato. | Backend, AI, Error Handling |
| AC-07 Logs are safe and traceable | Logs estructurados con metadata segura y sin secrets/raw payload sensible. | Backend, Observability, Security |
| AC-08 Automated tests do not call real OpenAI | Tests con mocked SDK/client o fake transport; CI sin `OPENAI_API_KEY`. | QA, CI, Security |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo principal:

- `ai-assistance`

Folders probables, ajustables a la estructura real:

- `src/modules/ai-assistance/infrastructure/providers/openai/openai-provider.ts`
- `src/modules/ai-assistance/infrastructure/providers/openai/openai-config.ts`
- `src/modules/ai-assistance/infrastructure/providers/openai/openai-client.ts`
- `src/modules/ai-assistance/infrastructure/providers/openai/openai-error-mapper.ts`
- `src/modules/ai-assistance/infrastructure/providers/openai/__tests__/openai-provider.spec.ts`

El SDK OpenAI, si se usa, debe importarse sólo dentro de esta carpeta o wrapper Infrastructure equivalente.

### Use Cases / Application Services

No se crean use cases. `OpenAIProvider` será inyectado como implementación de `LLMProvider` por composition root en historia/integración correspondiente. Use cases consumidores permanecen desacoplados.

### Controllers / Routes

No aplica. No se crean routes/controllers.

### DTOs / Schemas

El adapter consume los tipos de US-117:

- `LLMProvider`
- `AIContext`
- `AIResult<TOutput>`
- `LanguageCode`
- `ProviderId`
- errores tipados

Para input/output por feature:

- Usar DTOs/schemas existentes si ya fueron definidos por US-117 o contratos compartidos.
- No inventar PromptRegistry ni prompt content dentro del adapter.
- Si el contrato usa `outputSchema`, el adapter puede validar/parsear el output inmediatamente contra ese schema o devolver el raw parsed output para validación en capa aprobada, según decisión de US-117.

### Repository / Persistence

No aplica. El adapter no usa Prisma ni repositories.

### Validation Rules

- Si `LLM_PROVIDER=openai`, `OPENAI_API_KEY` y `OPENAI_MODEL` son obligatorios.
- `OPENAI_BASE_URL` es opcional.
- `AI_TIMEOUT_MS` debe ser entero positivo si se usa como fallback de config.
- `ctx.timeoutMs` prevalece para la llamada cuando esté presente y válido.
- `provider` del resultado debe ser `openai`.
- `fallbackUsed` en respuesta directa debe ser `false`.
- No se deben aceptar prompts/output schemas sin el contexto requerido por `LLMProvider`.
- SDK/client OpenAI no puede importarse desde Application/use cases.

### Error Handling

Mapeo requerido:

- Config ausente o inválida -> `AIProviderNotConfiguredError`.
- Timeout / abort -> `AITimeoutError`.
- Auth/quota/rate/5xx/provider unavailable/network -> `AIProviderUnavailableError` con metadata segura.
- JSON inválido, schema incompatible o output incompleto -> `AIInvalidOutputError`.

Los errores no deben incluir:

- `OPENAI_API_KEY`.
- Raw request/response completo.
- Prompts completos.
- Tokens, cookies o session data.
- Stack trace expuesto a callers públicos.

### Transactions

No aplica. No hay DB writes.

### Observability

Logs estructurados recomendados:

- `ai.request.started`
- `ai.request.success`
- `ai.request.failed`

Campos permitidos:

- `feature_type`
- `provider=openai`
- `model`
- `prompt_version_id`
- `language_code`
- `correlation_id`
- `latency_ms`
- `status/error_code`

Campos prohibidos:

- API keys.
- Cookies/tokens.
- Prompts completos.
- Raw payload sensible.
- Raw output completo.

---

## 8. Frontend Technical Design

No aplica.

### Routes / Pages

No aplica.

### Components

No aplica.

### Forms

No aplica.

### State Management

No aplica.

### Data Fetching

No aplica.

### Loading / Empty / Error / Success States

No aplica.

### Accessibility

No aplica.

### i18n

No aplica para UI. El adapter debe preservar `languageCode` desde `AIContext` en `AIResult`.

---

## 9. API Contract Design

No aplica.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| N/A | N/A | US-118 no crea endpoint REST | N/A | N/A | N/A | N/A |

---

## 10. Database / Prisma Design

No aplica.

### Models Impacted

No aplica.

### Fields / Columns

No aplica.

### Relations

No aplica.

### Indexes

No aplica.

### Constraints

No aplica.

### Migrations Impact

No aplica.

### Seed Impact

No aplica.

---

## 11. AI / PromptOps Design

### AI Feature

Provider infrastructure. No implementa una feature de usuario final.

### Provider

`OpenAIProvider` es el provider funcional principal para MVP cuando la configuración selecciona OpenAI.

### Prompt Version

El adapter debe propagar `promptVersionId` recibido en `AIContext` hacia metadata del resultado y logs. No define versiones ni registry.

### Input Schema

El adapter recibe input DTO y contexto ya aprobados por el caller. No debe enriquecer con datos sensibles fuera del payload aprobado. Si necesita construir request OpenAI, debe hacerlo a partir de:

- Prompt/payload ya construido por PromptBuilder/caller.
- `AIContext.language`.
- `AIContext.timeoutMs`.
- Output schema o instrucciones estructuradas aprobadas.

### Output Schema

Debe solicitar JSON structured output o equivalente. La respuesta exitosa debe ser compatible con `TOutput` y retornar `AIResult<TOutput>`.

### Human-in-the-loop

No aplica dentro del adapter. Downstream use cases mantienen HITL y persistencia en estado `pending`.

### Fallback

No implementa fallback. `fallbackUsed=false` en respuestas directas. El fallback a `MockAIProvider` pertenece a PB-P0-011.

### Persistence

No aplica. No crea `AIRecommendation`.

### Safety Rules

- No enviar datos no aprobados por el caller.
- No loggear prompts completos por defecto.
- No exponer API keys.
- No usar Anthropic ni otro provider.
- No materializar cambios de dominio.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente. El adapter no autentica usuarios.

### Authorization

No aplica directamente. Authorization, ownership y rate limit ocurren antes de invocar `LLMProvider`.

### Ownership Rules

No aplica. El adapter no evalúa ownership.

### Role Rules

No aplica. El adapter no evalúa roles.

### Negative Authorization Scenarios

- Si un endpoint futuro invoca IA antes de auth/ownership/rate limit, el bug pertenece al use case/controller, no al provider.
- Si Application importa `OpenAIProvider` directamente, viola la arquitectura y debe fallar review/lint.

### Audit Requirements

El adapter debe producir metadata suficiente para auditoría posterior:

- `provider='openai'`
- `promptVersionId`
- `languageCode`
- `latencyMs`
- `fallbackUsed=false`
- `rawOutputHash?`
- `correlationId` en logs/contexto

No crea `AdminAction`.

### Sensitive Data Handling

- `OPENAI_API_KEY` sólo desde backend config/secrets.
- No exponer secrets en logs, errors, response payloads o tests.
- No leer API key desde request.
- No usar variables públicas frontend.
- No commitear keys ni fixtures con datos reales.

---

## 13. Testing Strategy

### Unit Tests

- `OpenAIProvider` implementa `LLMProvider`.
- Config válida crea provider/client wrapper.
- Config sin `OPENAI_API_KEY` falla con `AIProviderNotConfiguredError`.
- Config sin `OPENAI_MODEL` falla con error de config.
- Success mocked retorna `AIResult<TOutput>` con `provider='openai'`, `fallbackUsed=false`, `languageCode`, `promptVersionId`, `latencyMs`.
- Structured output/equivalente se incluye en request mockeado.
- Timeout mockeado lanza `AITimeoutError`.
- Output inválido lanza `AIInvalidOutputError`.
- Network/auth/quota/5xx mockeado mapea a errores tipados.

### Integration Tests

- Opcional con fake transport dentro del backend test harness para validar wiring Infrastructure sin red real.
- No incluir DB writes ni endpoints.

### API Tests

No aplica.

### E2E Tests

No aplica.

### Security Tests

- Logs no contienen `OPENAI_API_KEY`.
- Logs no contienen prompts completos ni raw output completo.
- Static/import check: SDK OpenAI sólo bajo Infrastructure provider.
- CI no requiere `OPENAI_API_KEY`.

### Accessibility Tests

No aplica.

### AI Tests

- Cada método MVP puede delegar al client mockeado y preservar metadata de `AIContext`.
- `languageCode` y `promptVersionId` se preservan.
- `fallbackUsed=false` en respuestas directas.
- No OpenAI real en pruebas automáticas.

### Seed / Demo Tests

No requiere seed. Smoke manual con OpenAI real puede existir como `@manual`/`@real-provider`, excluido de CI.

### CI Checks

- Type check.
- Unit tests.
- Security/import boundary checks si el tooling lo soporta.
- Tests no deben depender de secretos reales ni red externa.

---

## 14. Observability & Audit

### Logs

Emitir logs estructurados para inicio, éxito y falla de request IA cuando el logging facility exista. Si aún no existe AIAuditLogger, usar logger compartido con campos seguros.

### Correlation ID

Propagar `ctx.correlationId` a logs y error metadata segura.

### AdminAction

No aplica.

### Error Tracking

Errores tipados deben permitir que capas superiores clasifiquen:

- timeout.
- provider unavailable.
- not configured.
- invalid output.

### Metrics

No es obligatorio crear métricas en US-118, pero el diseño debe permitir:

- `ai_request_total{provider=openai}`
- `ai_request_latency_ms{provider=openai}`
- `ai_provider_error_total{provider=openai,error_code}`
- `ai_timeout_total{provider=openai}`

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No aplica.

### Demo Scenario Supported

Permite demo con OpenAI real cuando `LLM_PROVIDER=openai` y secrets estén configurados en entorno controlado. Demo offline y fallback pertenecen a `MockAIProvider`/PB-P0-011.

### Reset / Isolation Notes

No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `docs/9-Functional-Requirements-Document.md` FR-AI-016 | Lista `LLM_PROVIDER` con valores `openai | mock`, mientras PB-P0-009 y ADR-AI-001 incluyen `anthropic` como stub. | US-118 sólo implementa `OpenAIProvider`; no depende de resolver la lista completa del selector. | Mantener US-118 limitado a `openai`; resolver detalle de selector en historias de composition root/PB-P0-009 o US-120. | No |
| `docs/17-AI-Architecture-and-PromptOps-Design.md` | Incluye fallback, retry y persistencia en flujos completos. | US-118 no implementa fallback, retry avanzado ni `AIRecommendation`; sólo lanza errores tipados y retorna `AIResult`. | No trasladar responsabilidades de PB-P0-010/PB-P0-011 al adapter. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| SDK OpenAI filtrado a Application/use cases | Rompe ADR-AI-001 y dificulta sustituibilidad | Import boundary check y adapter exclusivo en Infrastructure |
| Tests llaman OpenAI real | CI inestable, costos y dependencia de secretos | Mocked client/fake transport obligatorio; tests reales manuales excluidos |
| Logs exponen secrets o prompts | Riesgo de seguridad/privacidad | Redacción estricta; tests de logs; `AI_LOG_PAYLOADS=false` fuera de local |
| Adapter implementa fallback | Duplica responsabilidad y complica trazabilidad | `fallbackUsed=false`; fallback queda en PB-P0-011 |
| Output inválido tratado como éxito | Downstream persiste recomendaciones incorrectas | Validación/mapping a `AIInvalidOutputError`; tests negativos |
| Timeout no aborta llamada | Latencia excesiva y mala UX | `AbortController`/timeout SDK/fake timers; tests de timeout |
| Config faltante falla tarde o filtra detalle | Errores inseguros en runtime | Config validator backend-only y error tipado seguro |

---

## 18. Implementation Guidance for Coding Agents

- Revisar primero los tipos creados por US-117.
- Implementar `OpenAIProvider` sólo en Infrastructure.
- Crear un wrapper de OpenAI client si facilita testing y evita acoplar tests al SDK.
- Usar dependency injection para pasar fake client/transport en tests.
- Aplicar timeout por llamada con `ctx.timeoutMs` o config default aprobada.
- Mapear errores en una función/clase dedicada para mantener legible el provider.
- Calcular `latencyMs` de forma testeable, idealmente con clock injectable o fake timers.
- Calcular `rawOutputHash` sólo si el contrato lo define y sin persistir raw output.
- No crear endpoints, DB writes, PromptRegistry, fallback service ni selectors UI.
- No implementar Anthropic ni Mock en este archivo.
- No usar OpenAI real en tests automatizados.
- Preservar decisiones de ADR-AI-001, ADR-AI-002 y ADR-AI-003.

---

## 19. Task Generation Notes

Suggested task groups:

- Backend provider implementation:
  - Crear config parser/validator de OpenAI.
  - Crear OpenAI client wrapper/factory.
  - Implementar `OpenAIProvider` contra `LLMProvider`.
  - Implementar timeout y error mapping.
  - Implementar response mapping a `AIResult<TOutput>`.

- QA:
  - Unit tests success/config/timeout/error mapping.
  - Tests de structured output request.
  - Tests de no DB/fallback.
  - Tests de no red real.

- Security:
  - Tests/review de logs sin secrets.
  - Import boundary check para SDK OpenAI.
  - CI sin `OPENAI_API_KEY`.

- DevOps/config:
  - Documentar env vars backend-only necesarias.
  - Asegurar defaults seguros y que CI no requiera OpenAI secrets.

Required seed/demo tasks:

- No requiere seed.
- Real-provider smoke manual opcional, no bloqueante y excluido de CI.

Dependencies between tasks:

- US-117 contract antes de provider.
- Config parser antes de provider initialization tests.
- Fake client/wrapper antes de tests de success/error mapping.
- Error mapper antes de tests negativos.

Parent backlog consolidated tasks:

- Sí. PB-P0-009 debería consolidar US-117..US-120 para integración final de provider selection.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | N/A |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-118 está aprobada, mapeada a PB-P0-009 y técnicamente lista para desglose. La implementación debe concentrarse en `OpenAIProvider` como adapter Infrastructure, con configuración segura, timeout, structured output, error mapping, safe logging y tests determinísticos sin red real.
