# User Story: US-117 - Definir puerto LLMProvider

## Metadata

| Field | Value |
| --- | --- |
| ID | US-117 |
| Epic | EPIC-AI-001 |
| Feature | LLMProvider port |
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
**I want** definir el puerto `LLMProvider` con un contrato tipado, estable y backend-only  
**So that** los use cases de IA puedan invocar proveedores intercambiables sin acoplarse a SDKs concretos y con soporte para `OpenAIProvider`, `MockAIProvider` y `AnthropicProvider` stub en historias separadas.

---

## Business Context

### Context Summary

EventFlow necesita capacidades IA reproducibles, auditables y desacopladas de vendors externos. El puerto `LLMProvider` es la única superficie permitida para que la capa Application invoque generación IA. Esta historia establece el contrato común que luego implementan:

- US-118: `OpenAIProvider`.
- US-119: `MockAIProvider`.
- US-120: `AnthropicProvider` stub.

Sin este puerto, los use cases quedarían acoplados a SDKs externos, la demo dependería de OpenAI y los tests automáticos no serían determinísticos.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| --- | --- |
| Provider abstraction | Usar un puerto unificado `LLMProvider` como única interfaz desde Application hacia providers LLM. |
| Provider set | El contrato debe soportar `openai`, `mock` y `anthropic`; las implementaciones se hacen en US-118, US-119 y US-120. |
| MVP Anthropic scope | `AnthropicProvider` es stub no funcional en MVP; US-117 sólo garantiza que el contrato permita sustituibilidad. |
| Backend-only | El frontend nunca llama providers LLM ni importa SDKs/keys de proveedores. |
| Deterministic testing | El contrato debe permitir `MockAIProvider` determinista para CI, demo y fallback controlado. |
| Streaming | Streaming queda fuera del MVP; el contrato no debe requerir streaming. |

### Related Domain Concepts

- `LLMProvider` port.
- `AIContext`.
- `AIResult<TOutput>`.
- `LanguageCode`: `es-LATAM`, `es-ES`, `pt`, `en`.
- `PromptVersionId`.
- `correlationId`.
- `timeoutMs` default de 60_000 ms.
- Typed AI errors: `AITimeoutError`, `AIInvalidOutputError`, `AIProviderUnavailableError`, `AIProviderNotConfiguredError`.
- Providers permitidos: `openai`, `mock`, `anthropic`.

### Assumptions

- El módulo backend `ai-assistance` existe o será creado como parte del AI foundation.
- Los DTOs de input/output por feature IA existen o pueden declararse como contratos compartidos sin implementar use cases en esta historia.
- La validación estricta de output con Zod, prompt registry, persistencia de `AIRecommendation`, fallback service y adapters concretos se implementan en historias posteriores del mismo backlog o backlog dependiente.
- Cualquier cambio mayor al contrato `LLMProvider` después de aprobarse requiere revisión técnica y, si altera ADR-AI-001, nuevo ADR o decisión PO.

### Dependencies

- PB-P0-002: Backend Modular Monolith Bootstrap.
- ADR-AI-001: Use `LLMProvider` Abstraction.
- ADR-AI-002: Use `OpenAIProvider` as Primary MVP Provider.
- ADR-AI-003: Use `MockAIProvider` for Demo, Testing, and Controlled Fallback.
- ADR-AI-004: Keep `AnthropicProvider` as Stub for MVP.

---

## Traceability

| Source | Reference |
| --- | --- |
| Product Backlog Item | PB-P0-009 - LLMProvider Port + Adapters |
| Epic | EPIC-AI-001 - LLMProvider & PromptOps |
| FRD Requirement(s) | FR-AI-* transversal; FR-AI-014 determinismo con MockAIProvider; FR-AI-017 propagación de idioma |
| Use Case(s) | UC-AI-001..009 como consumidores futuros del puerto; esta historia no implementa un UC funcional directo |
| Business Rule(s) | BR-AI-005 provider abstraction; BR-AI-006 backend-only; BR-AI-009 timeout 60s; BR-AI-015 demo/test determinístico |
| Permission Rule(s) | Backend-only; autorización se evalúa antes de invocar `LLMProvider` en use cases/endpoints consumidores |
| Data Entity / Entities | No crea entidades; habilita futura persistencia de `AIRecommendation` |
| API Endpoint(s) | No crea endpoints; futuros endpoints `/api/v1/.../ai/*` consumirán el puerto desde backend |
| NFR Reference(s) | NFR-AI-*; NFR-SEC-*; NFR-OBS-*; determinismo CI/demo |
| Related ADR(s) | ADR-AI-001, ADR-AI-002, ADR-AI-003, ADR-AI-004, ADR-TEST-003 |
| Related Document(s) | `management/artifacts/4-Product-Backlog-Prioritized.md`; `docs/7-AI-Features-Specification.md`; `docs/14-Backend-Technical-Design.md`; `docs/17-AI-Architecture-and-PromptOps-Design.md`; `docs/20-Testing-Strategy.md`; `docs/22-Architecture-Decision-Records.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope.
- MVP Relevance: Must Have (P0).
- Delivery Value: desbloquea adapters, prompt registry, AI use cases, tests determinísticos y demo offline.

### In Scope

- Definir el contrato TypeScript del puerto `LLMProvider`.
- Definir tipos compartidos mínimos: `AIContext`, `AIResult<TOutput>`, provider id, language code y errores tipados.
- Definir métodos del puerto por feature IA MVP aprobada.
- Garantizar que el contrato no expone SDKs de OpenAI, Anthropic ni detalles de transporte al dominio/application layer.
- Definir tests de contrato con fake/stub provider para probar tipado, metadata y errores.
- Documentar el contrato para que US-118, US-119 y US-120 implementen adapters compatibles.

### Explicitly Out of Scope

- Implementar `OpenAIProvider`; cubierto por US-118.
- Implementar `MockAIProvider`; cubierto por US-119.
- Implementar `AnthropicProvider` stub; cubierto por US-120.
- Implementar selector runtime por `LLM_PROVIDER`; se integra al completar los adapters de PB-P0-009.
- Implementar `PromptRegistry`, `PromptBuilder`, `FallbackService`, retries o validación de output; cubiertos por PB-P0-010/PB-P0-011.
- Persistir `AIRecommendation`.
- Crear endpoints IA.
- Llamar proveedores reales desde tests o CI.
- Streaming, function calling avanzado, RAG, vector database o decisiones IA autónomas.
- Exponer provider keys o SDKs al frontend.

### Scope Notes

US-117 es una historia de arquitectura/contrato. Debe ser suficientemente concreta para que los adapters posteriores puedan compilar contra el puerto, pero no debe adelantar implementación de providers ni comportamiento de fallback.

---

## Acceptance Criteria

### AC-01: LLMProvider interface is defined

**Given** el módulo backend `ai-assistance`  
**When** se define el puerto `LLMProvider`  
**Then** existe una interfaz TypeScript exportable desde la capa Ports/Application boundary  
**And** los use cases pueden depender de esa interfaz sin importar SDKs concretos.

### AC-02: Feature-specific methods are typed

**Given** las features IA MVP aprobadas  
**When** se revisa el contrato `LLMProvider`  
**Then** expone métodos tipados por feature, al menos para event plan, checklist, budget suggestion, vendor categories, quote brief, quote comparison y task prioritization  
**And** cualquier método de feature future queda fuera o marcado como contrato no usado en MVP si aún no está aprobado.

### AC-03: AIContext includes required metadata

**Given** una llamada a cualquier método del puerto  
**When** el caller construye `AIContext`  
**Then** debe incluir `language`, `userId`, `promptVersionId`, `correlationId` y `timeoutMs`  
**And** puede incluir `eventId`, `vendorProfileId`, `currency` y `preferMock` donde aplique  
**And** `currency` no implica conversión automática.

### AC-04: AIResult returns auditable provider metadata

**Given** una implementación del puerto retorna resultado  
**When** el caller recibe `AIResult<TOutput>`  
**Then** el resultado incluye `output`, `provider`, `promptVersionId`, `languageCode`, `latencyMs` y `fallbackUsed`  
**And** puede incluir `rawOutputHash` para auditoría sin almacenar texto crudo.

### AC-05: Typed provider errors are part of the contract

**Given** un provider falla por timeout, output inválido, indisponibilidad o falta de configuración  
**When** el adapter implemente el contrato  
**Then** debe lanzar errores tipados compatibles con `AITimeoutError`, `AIInvalidOutputError`, `AIProviderUnavailableError` o `AIProviderNotConfiguredError`  
**And** el puerto no decide el HTTP status ni persiste errores.

### AC-06: Provider IDs are constrained

**Given** los providers aprobados para MVP  
**When** se revisan tipos del contrato  
**Then** `provider` sólo permite `openai`, `mock` o `anthropic`  
**And** no se agregan providers futuros sin ADR/decisión PO.

### AC-07: Backend-only boundary is enforced by design

**Given** el contrato `LLMProvider`  
**When** se revisan imports y ubicación del puerto  
**Then** no hay dependencia hacia frontend, SDK OpenAI, SDK Anthropic, browser APIs ni variables públicas  
**And** los SDKs concretos sólo pueden vivir en Infrastructure adapters.

### AC-08: Contract tests validate substitutability

**Given** un fake/stub provider de prueba que implementa `LLMProvider`  
**When** se ejecutan tests unitarios del contrato  
**Then** se verifica que el contrato puede ser implementado sin SDK externo  
**And** metadata, errores tipados y métodos mínimos compilan y se comportan de forma determinística.

---

## Edge Cases

### EC-01: Feature future no implementada en MVP

**Given** una feature IA documentada como future o optional  
**When** se define el contrato del puerto  
**Then** no debe obligar a implementar provider funcional para esa feature en el MVP.

#### Handling

Mantener el método fuera del contrato MVP o documentarlo como no usado hasta que una historia lo promueva explícitamente.

### EC-02: Provider intenta retornar metadata incompleta

**Given** un adapter implementa `LLMProvider`  
**When** retorna `AIResult` sin `provider`, `promptVersionId`, `languageCode`, `latencyMs` o `fallbackUsed`  
**Then** TypeScript y tests de contrato deben fallar.

#### Handling

Usar tipos obligatorios y tests de fake provider.

### EC-03: Contrato filtra SDK externo

**Given** el puerto `LLMProvider`  
**When** se revisan imports del archivo de contrato  
**Then** no debe importar `openai`, `@anthropic-ai/sdk` ni tipos de SDK externo.

#### Handling

Validar por review, lint/import rules si existen, y tests estáticos simples si el repo lo permite.

### EC-04: `preferMock` usado fuera de demo/test

**Given** `AIContext.preferMock`  
**When** se define el contrato  
**Then** debe quedar documentado que sólo puede ser honrado por composition/fallback logic bajo flags permitidos, no por el puerto en sí.

#### Handling

Documentar que el puerto transporta contexto, pero no decide selección dinámica ni fallback.

---

## Validation Rules

| ID | Rule | Message / Behavior |
| --- | --- | --- |
| VR-01 | `LanguageCode` sólo permite `es-LATAM`, `es-ES`, `pt`, `en` | Otros idiomas requieren decisión futura |
| VR-02 | `ProviderId` sólo permite `openai`, `mock`, `anthropic` | Provider futuro requiere ADR/PO |
| VR-03 | `timeoutMs` debe existir en `AIContext` | Default operativo 60_000 se aplica fuera del puerto |
| VR-04 | `correlationId` debe existir en `AIContext` | Trazabilidad obligatoria |
| VR-05 | `fallbackUsed` debe existir en `AIResult` | Auditoría y demo readiness |
| VR-06 | El puerto no puede importar SDKs concretos | Mantener Clean/Hexagonal Architecture |

---

## Authorization & Security Rules

| ID | Rule |
| --- | --- |
| SEC-01 | `LLMProvider` es backend-only; ningún frontend puede invocarlo directamente. |
| SEC-02 | El puerto no recibe ni expone API keys, secrets, cookies o tokens. |
| SEC-03 | Autorización, ownership y rate limiting se ejecutan antes de invocar `LLMProvider`; esta historia no implementa esos controles. |
| SEC-04 | `rawOutputHash` puede usarse para auditoría; no se requiere almacenar texto crudo del provider en esta historia. |
| SEC-05 | SDKs concretos quedan restringidos a Infrastructure adapters, nunca al puerto ni a Application use cases. |

### Negative Authorization Scenarios

No aplica como endpoint runtime. Esta historia no crea API ni autoriza usuarios directamente.

### Security Negative Scenarios

- El puerto importa un SDK concreto → falla revisión/test estático.
- El contrato expone API key o secret → falla revisión de seguridad.
- Un use case intenta importar `OpenAIProvider` directamente en vez de `LLMProvider` → debe fallar revisión/lint si existe regla.

---

## AI Behavior

US-117 define infraestructura IA, pero no invoca un provider real ni genera contenido.

### AI Involvement

| Field | Value |
| --- | --- |
| AI Feature | AI platform foundation |
| Provider Layer | `LLMProvider` port only |
| Human Validation Required | No aplica en esta historia; las features consumidoras mantienen HITL |
| Persist AIRecommendation | No |
| Fallback Required | No en esta historia |

### AI Input

El puerto define tipos de input por feature IA, pero US-117 no construye prompts ni ejecuta generación.

### AI Output

El puerto define `AIResult<TOutput>` y tipos de output por feature, pero US-117 no produce salidas IA reales.

### Human-in-the-loop Rules

No se modifica HITL. Las historias que usan el puerto deben persistir recomendaciones en estado pendiente y requerir aceptación humana antes de materializar cambios.

### AI Error / Fallback Behavior

El puerto define errores tipados. El use case y servicios posteriores decidirán traducción HTTP, retry, fallback y persistencia.

---

## UX / UI Notes

| Area | Notes |
| --- | --- |
| Screen / Route | N/A - backend platform contract |
| Main UI Pattern | N/A |
| Primary Action | N/A |
| Secondary Actions | N/A |
| Empty State | N/A |
| Loading State | N/A |
| Error State | N/A |
| Success State | N/A |
| Accessibility Notes | No aplica; no introduce UI |
| Responsive Notes | No aplica |
| i18n Notes | El contrato transporta `language`; no renderiza UI |
| Currency Notes | `currency` puede viajar en `AIContext`, sin conversión automática |

---

## Technical Notes

### Frontend

- No requiere cambios frontend.
- No se exponen API keys, SDKs ni provider selection en UI.
- El frontend consumirá endpoints IA futuros, no el puerto.

### Backend

- Crear o actualizar módulo `ai-assistance` siguiendo Clean/Hexagonal Architecture.
- Ubicar el puerto en capa Ports/Application boundary, por ejemplo `src/modules/ai-assistance/ports/llm-provider.ts`.
- Definir tipos compartidos sin dependencia a providers concretos.
- Definir errores tipados reutilizables por adapters.
- Composition root y adapters concretos quedan para historias posteriores de PB-P0-009.

### Database

- No requiere tablas, migrations ni cambios Prisma.
- No persiste `AIRecommendation`.

### API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| — | — | No crea endpoints |

### Observability / Audit

- `AIContext.correlationId` es obligatorio.
- `AIResult` debe incluir `latencyMs`, `provider`, `promptVersionId` y `fallbackUsed`.
- No crea `AdminAction`.
- No persiste `AIRecommendation`.
- No loggea payloads ni secrets.

---

## Test Scenarios

### Functional Tests

| ID | Scenario | Type |
| --- | --- | --- |
| TS-01 | Fake provider implementa `LLMProvider` y compila sin SDK externo | Unit/Type |
| TS-02 | Métodos mínimos por feature aceptan input tipado y `AIContext` | Unit/Type |
| TS-03 | `AIResult<TOutput>` requiere metadata obligatoria | Unit/Type |
| TS-04 | Errores tipados pueden lanzarse y capturarse sin HTTP dependency | Unit |

### Negative Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| NT-01 | El puerto intenta importar SDK OpenAI/Anthropic | Falla lint/review/test estático si existe |
| NT-02 | Provider id distinto de `openai`, `mock`, `anthropic` | Falla TypeScript |
| NT-03 | `AIContext` sin `correlationId` o `timeoutMs` | Falla TypeScript |
| NT-04 | `AIResult` sin `fallbackUsed` o `latencyMs` | Falla TypeScript |

### AI Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AI-TS-01 | Fake provider determinista retorna `AIResult` válido | OK |
| AI-TS-02 | Fake provider lanza `AITimeoutError` | Error tipado capturable |
| AI-TS-03 | Fake provider lanza `AIProviderNotConfiguredError` | Error tipado capturable |

### Authorization Tests

No aplica — esta historia no crea endpoints ni ejecuta autorización runtime.

### Security Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| SEC-TS-01 | Puerto no expone secrets ni API keys | Pass |
| SEC-TS-02 | Puerto no importa SDKs concretos | Pass |

### Accessibility Tests

No aplica — no hay UI.

### Seed / Demo Tests

No requiere seed. El contrato habilita futura demo determinística con `MockAIProvider`.

---

## Business Impact

| Field | Value |
| --- | --- |
| KPI Affected | Demo readiness, estabilidad de IA, test determinism, vendor independence |
| Expected Impact | Habilita AI foundation sin acoplar dominio a proveedores externos |
| Success Criteria | Puerto tipado, documentado, testeado y listo para adapters US-118/119/120 |
| Academic Demo Value | Evidencia arquitectura hexagonal, sustituibilidad y CI determinístico |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

- No aplica.

### Potential Backend Tasks

- Crear tipos `LanguageCode`, `ProviderId`, `AIContext`, `AIResult<TOutput>`.
- Crear interfaz `LLMProvider`.
- Crear errores tipados del provider.
- Agregar tests de contrato con fake provider.
- Agregar documentación breve del contrato y restricciones.

### Potential Database Tasks

- No aplica.

### Potential AI / PromptOps Tasks

- Definir métodos por feature IA MVP.
- Alinear contrato con `PromptRegistry`, `AIRecommendation` y adapters futuros sin implementarlos.

### Potential QA Tasks

- Unit/type tests del contrato.
- Tests negativos de provider id y metadata requerida.
- Test/guard de no import de SDK concreto si el tooling lo permite.

### Potential DevOps / Config Tasks

- No requiere secrets ni env vars funcionales en US-117.
- `LLM_PROVIDER` selector se validará al integrar adapters de PB-P0-009.

---

## Definition of Ready

- [x] Backlog item identificado: PB-P0-009.
- [x] Epic identificado: EPIC-AI-001.
- [x] Scope limitado al puerto `LLMProvider`.
- [x] Separación clara frente a US-118, US-119 y US-120.
- [x] Acceptance Criteria claros y testeables.
- [x] Dependencias identificadas.
- [x] Seguridad backend-only explícita.
- [x] AI behavior y HITL aclarados.
- [x] Sin impacto DB/API/UI directo.
- [x] Out of scope explícito.

## Definition of Done

- [ ] `LLMProvider` interface existe en la capa correcta del backend.
- [ ] Tipos `AIContext`, `AIResult<TOutput>`, `LanguageCode` y `ProviderId` están definidos y exportados.
- [ ] Errores tipados del provider están definidos sin dependencia HTTP.
- [ ] El contrato incluye métodos por feature IA MVP aprobada.
- [ ] El puerto no importa SDKs concretos ni secrets.
- [ ] Tests de contrato con fake provider pasan en CI.
- [ ] Documentación del contrato indica qué implementan US-118, US-119 y US-120.
- [ ] No se crean endpoints, adapters funcionales, migrations, prompts ni persistencia `AIRecommendation`.
