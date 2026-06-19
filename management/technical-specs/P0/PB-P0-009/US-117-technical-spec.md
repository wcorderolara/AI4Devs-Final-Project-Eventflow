# Technical Specification — US-117: Definir puerto LLMProvider

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-117 |
| Source User Story | `management/user-stories/US-117-llm-provider-port.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usa `PO/BA Decisions Applied` de la User Story aprobada |
| Priority | P0 |
| Backlog ID | PB-P0-009 |
| Backlog Title | LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub) |
| Backlog Execution Order | 9 |
| User Story Position in Backlog Item | 1 of 4 |
| Related User Stories in Backlog Item | US-117, US-118, US-119, US-120 |
| Epic | EPIC-AI-001 |
| Backlog Item Dependencies | PB-P0-002 |
| Feature | LLMProvider port |
| Module / Domain | AI Assistance / Platform |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-16 |
| Last Updated | 2026-06-16 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-009 implementa la base de proveedores IA: el puerto `LLMProvider`, `OpenAIProvider` como adapter funcional principal, `MockAIProvider` determinista para CI/demo/testing y `AnthropicProvider` como stub no funcional. La meta del backlog item es demostrar independencia de provider, tests deterministas, demo robusta y boundary backend-only.

US-117 cubre únicamente el primer componente: el contrato TypeScript común que los adapters posteriores deben implementar.

### Execution Order Rationale

PB-P0-009 se ejecuta después de la foundation backend/auth/security porque las features IA futuras necesitan:

- Modular monolith y configuración base de PB-P0-002.
- Seguridad backend-only y middleware order ya definidos.
- Contratos compartidos antes de adapters concretos.

Dentro de PB-P0-009, US-117 debe ejecutarse primero porque US-118, US-119 y US-120 compilan contra el puerto y los tipos compartidos definidos aquí.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-117 | Definir `LLMProvider`, `AIContext`, `AIResult`, provider ids y errores tipados | 1 |
| US-118 | Implementar `OpenAIProvider` funcional principal contra el contrato | 2 |
| US-119 | Implementar `MockAIProvider` determinista contra el contrato | 3 |
| US-120 | Implementar `AnthropicProvider` stub no funcional contra el contrato | 4 |

---

## 3. Executive Technical Summary

Implementar el puerto `LLMProvider` como contrato TypeScript backend-only dentro del módulo `ai-assistance`, siguiendo Clean/Hexagonal Architecture. El contrato debe permitir que Application/use cases dependan de una interfaz estable sin importar SDKs de OpenAI, Anthropic, HTTP clients ni detalles de transporte.

La implementación debe definir:

- `LLMProvider` con métodos tipados para las features IA MVP aprobadas.
- Tipos compartidos mínimos: `AIContext`, `AIResult<TOutput>`, `ProviderId`, `LanguageCode`, `PromptVersionId`.
- Errores tipados de provider sin dependencia HTTP.
- Tests de contrato usando fake/stub provider sin red ni SDK externo.
- Reglas de import/boundary para impedir acoplamiento a SDKs desde Domain/Application.

No se implementan adapters concretos, selector runtime, PromptRegistry, persistencia de `AIRecommendation`, endpoints, fallback service ni generación real de contenido IA.

---

## 4. Scope Boundary

### In Scope

- Crear el contrato `LLMProvider` en la capa Ports/Application boundary del backend.
- Definir métodos por feature IA MVP aprobada.
- Definir tipos compartidos para contexto, resultado, provider id, idioma, prompt version y errores.
- Garantizar que `ProviderId` permita `openai`, `mock` y `anthropic`.
- Garantizar que `LanguageCode` permita `es-LATAM`, `es-ES`, `pt` y `en`.
- Definir metadata obligatoria de auditoría en `AIContext` y `AIResult<TOutput>`.
- Definir errores tipados para timeout, output inválido, provider unavailable y provider not configured.
- Agregar tests unitarios/type-level de contrato con fake provider.
- Documentar boundaries para que adapters posteriores implementen el puerto sin reabrir decisiones.

### Out of Scope

- Implementar `OpenAIProvider`.
- Implementar `MockAIProvider`.
- Implementar `AnthropicProvider` stub.
- Implementar selector runtime por `LLM_PROVIDER`.
- Implementar `PromptRegistry`, `PromptBuilder`, `OutputValidator`, retry, fallback service o prompt lifecycle.
- Persistir `AIRecommendation`.
- Crear endpoints REST IA.
- Agregar UI, API client frontend o selector de proveedor.
- Llamar proveedores reales desde tests o CI.
- Crear migrations, seed o modelos Prisma.

### Explicit Non-Goals

- No implementar streaming.
- No implementar function calling avanzado o tool calling.
- No implementar RAG ni vector database.
- No implementar decisiones IA autónomas.
- No agregar providers fuera de `openai`, `mock` y `anthropic`.
- No mover autorización, ownership o rate limit al puerto; esos controles ocurren antes de invocar IA.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. El puerto debe ubicarse en el módulo `ai-assistance`, en capa Ports/Application boundary. Los use cases de IA dependen de `LLMProvider`; los adapters concretos viven luego en Infrastructure. Esto preserva Modular Monolith + Clean/Hexagonal Architecture.

### Frontend Architecture

No aplica. No hay rutas, componentes, estado cliente, formularios, TanStack Query, MSW ni UI. El frontend no debe conocer `LLMProvider` ni provider SDKs.

### Database Architecture

No aplica. US-117 no crea modelos, migrations, relaciones, índices ni seed. `AIRecommendation` se habilita en historias posteriores.

### API Architecture

No aplica. No se crean endpoints REST. Futuros endpoints `/api/v1/.../ai/*` invocarán use cases que dependan del puerto.

### AI / PromptOps Architecture

Aplica. US-117 define la boundary principal de IA:

- `LLMProvider` como único punto de contacto desde Application.
- `AIContext` como transporte de idioma, prompt version, correlation id y timeout.
- `AIResult<TOutput>` como resultado auditable de provider.
- Errores tipados para que capas superiores implementen HTTP mapping, retry, fallback y persistencia.

Prompt content, prompt registry y output validation estricta quedan fuera de esta historia.

### Security Architecture

Aplica. El puerto debe ser backend-only y no debe recibir ni exponer secrets, cookies, JWTs, API keys o SDK-specific config. Authorization, ownership y rate limiting ocurren antes de invocar `LLMProvider`.

### Testing Architecture

Aplica. Deben agregarse tests unit/type con Vitest o tooling equivalente para comprobar:

- Implementabilidad del contrato sin SDK externo.
- Metadata requerida.
- Provider ids y language codes restringidos.
- Errores tipados independientes de HTTP.
- Ausencia de imports SDK en el puerto.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 `LLMProvider` interface is defined | Crear interfaz exportable desde ports/application boundary; use cases pueden inyectarla sin conocer adapters. | Backend, AI |
| AC-02 Feature-specific methods are typed | Declarar métodos para features IA MVP aprobadas y excluir future no promovidas. | Backend, AI, Types |
| AC-03 `AIContext` includes required metadata | Definir `AIContext` con `language`, `userId`, `promptVersionId`, `correlationId`, `timeoutMs` y campos opcionales aprobados. | Backend, AI, Observability |
| AC-04 `AIResult` returns auditable provider metadata | Definir `AIResult<TOutput>` con `output`, `provider`, `promptVersionId`, `languageCode`, `latencyMs`, `fallbackUsed` y `rawOutputHash?`. | Backend, AI, Observability |
| AC-05 Typed provider errors are part of the contract | Crear errores tipados sin HTTP dependency para timeout, invalid output, unavailable y not configured. | Backend, AI, Error Handling |
| AC-06 Provider IDs are constrained | Definir union type o enum restringido a `openai`, `mock`, `anthropic`. | Backend, AI, Types |
| AC-07 Backend-only boundary is enforced by design | Evitar imports de SDKs, browser APIs, env públicas o frontend; documentar boundary. | Backend, Security |
| AC-08 Contract tests validate substitutability | Crear fake provider de prueba y tests de compile/runtime mínimo para metadata, errores y métodos. | Backend, QA, CI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo principal:

- `ai-assistance`

Folders probables, ajustables a la estructura real del backend:

- `src/modules/ai-assistance/ports/llm-provider.ts`
- `src/modules/ai-assistance/ports/index.ts`
- `src/modules/ai-assistance/application/dto/ai-context.ts`
- `src/modules/ai-assistance/application/dto/ai-result.ts`
- `src/modules/ai-assistance/application/errors/ai-provider-errors.ts`
- `src/modules/ai-assistance/application/contracts/*`
- `src/modules/ai-assistance/application/__tests__/llm-provider.contract.spec.ts`

Si el repo usa otra convención, mantener el principio: contrato en Application/Ports, adapters concretos en Infrastructure.

### Use Cases / Application Services

No se implementan use cases nuevos. La spec debe habilitar que futuros use cases como `GenerateEventPlanUseCase`, `GenerateChecklistUseCase`, `GenerateBudgetSuggestionUseCase`, `RecommendVendorCategoriesUseCase`, `GenerateQuoteBriefUseCase`, `CompareQuotesUseCase` y `PrioritizeTasksUseCase` dependan de `LLMProvider`.

### Controllers / Routes

No aplica. No se crean ni modifican controllers/routes en US-117.

### DTOs / Schemas

Definir tipos base:

- `LanguageCode = 'es-LATAM' | 'es-ES' | 'pt' | 'en'`
- `ProviderId = 'openai' | 'mock' | 'anthropic'`
- `PromptVersionId = string`
- `AIContext`
- `AIResult<TOutput>`

Campos mínimos de `AIContext`:

- `language: LanguageCode`
- `userId: string`
- `promptVersionId: PromptVersionId`
- `correlationId: string`
- `timeoutMs: number`
- `eventId?: string`
- `vendorProfileId?: string`
- `currency?: string`
- `preferMock?: boolean`

Campos mínimos de `AIResult<TOutput>`:

- `output: TOutput`
- `provider: ProviderId`
- `promptVersionId: PromptVersionId`
- `languageCode: LanguageCode`
- `latencyMs: number`
- `fallbackUsed: boolean`
- `rawOutputHash?: string`

Métodos mínimos de `LLMProvider`:

- `generateEventPlan(input, ctx)`
- `generateChecklist(input, ctx)`
- `suggestBudget(input, ctx)`
- `recommendVendorCategories(input, ctx)`
- `generateQuoteBrief(input, ctx)`
- `compareQuotes(input, ctx)`
- `prioritizeTasks(input, ctx)`

`generateVendorBio` debe manejarse con cuidado: si el backlog/product docs lo consideran Could Have MVP, puede declararse como contrato MVP sólo si está aprobado por el alcance vigente del módulo AI. Si el equipo lo mantiene como future/no implementado en esta fase, no debe obligar a adapters funcionales en US-118/119/120.

### Repository / Persistence

No aplica. El puerto no usa Prisma ni repositorios. Persistencia de `AIRecommendation` pertenece a PB-P0-010.

### Validation Rules

- `timeoutMs` debe ser entero positivo cuando el caller construye `AIContext`.
- `correlationId` debe ser obligatorio.
- `language` debe restringirse a los idiomas aprobados.
- `provider` debe restringirse a `openai`, `mock`, `anthropic`.
- `fallbackUsed` debe ser obligatorio en `AIResult<TOutput>`.
- `currency` viaja como metadata/contexto y no autoriza conversión automática.
- El contrato no debe importar SDKs concretos.

La validación runtime con Zod para outputs de provider puede quedar para adapters/OutputValidator; US-117 define tipos y boundaries.

### Error Handling

Crear errores tipados del dominio de provider sin dependencia Express/HTTP:

- `AITimeoutError`
- `AIInvalidOutputError`
- `AIProviderUnavailableError`
- `AIProviderNotConfiguredError`

Cada error debe permitir metadata segura opcional:

- `provider?: ProviderId`
- `correlationId?: string`
- `promptVersionId?: string`
- `causeCode?: string`

No incluir secrets, prompts completos, raw provider payloads, cookies, tokens ni stack traces como parte del payload público del error.

### Transactions

No aplica. El puerto no ejecuta DB writes ni transacciones.

### Observability

US-117 no implementa logging runtime obligatorio, pero el contrato debe transportar:

- `correlationId` en `AIContext`.
- `latencyMs`, `provider`, `promptVersionId`, `languageCode`, `fallbackUsed` en `AIResult<TOutput>`.

Estos campos serán consumidos por adapters, use cases y auditoría en historias posteriores.

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

No aplica para UI. El contrato sí transporta `AIContext.language` para que proveedores y PromptOps respeten idioma en historias posteriores.

---

## 9. API Contract Design

No aplica.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| N/A | N/A | US-117 no crea endpoint REST | N/A | N/A | N/A | N/A |

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

AI platform foundation. US-117 no genera contenido IA; define el contrato que consumen las features IA MVP.

### Provider

El contrato debe admitir:

- `openai`
- `mock`
- `anthropic`

No implementa ningún provider concreto.

### Prompt Version

`AIContext.promptVersionId` es obligatorio. US-117 no define PromptRegistry ni versiones reales; sólo exige que cualquier invocación transporte el identificador.

### Input Schema

El puerto debe usar tipos de input por feature. Si aún no existen DTOs definitivos, crear contratos mínimos compartidos o placeholders tipados dentro del módulo, sin introducir prompts ni comportamiento de use cases.

### Output Schema

El puerto debe retornar `AIResult<TOutput>`. `TOutput` debe ser genérico para permitir que cada feature use su output DTO/schema. La validación concreta de output queda para adapters/OutputValidator posteriores.

### Human-in-the-loop

No se implementa HITL en US-117. El contrato debe permitir que downstream use cases persistan sugerencias como `AIRecommendation.pending` y exijan aceptación humana antes de aplicar cambios.

### Fallback

US-117 no implementa fallback. Sólo incluye `fallbackUsed` en `AIResult<TOutput>` para trazabilidad. El fallback controlado a `MockAIProvider` pertenece a PB-P0-011.

### Persistence

No aplica. No se persiste `AIRecommendation` en US-117.

### Safety Rules

- No exponer SDKs ni provider keys.
- No permitir providers futuros sin ADR/PO.
- No generar decisiones autónomas.
- No transportar raw prompts o secretos como parte del contrato público del puerto.
- No hacer conversión automática de moneda.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente. Esta historia no crea endpoints ni autentica usuarios.

### Authorization

No aplica directamente. Los use cases consumidores deben ejecutar auth, ownership, role checks y rate limiting antes de invocar `LLMProvider`.

### Ownership Rules

No aplica directamente. El puerto puede recibir `eventId` o `vendorProfileId` como metadata contextual, pero no decide ownership.

### Role Rules

No aplica directamente. Los roles se validan antes de la llamada IA.

### Negative Authorization Scenarios

- Un endpoint futuro intenta invocar `LLMProvider` antes de authorization: debe fallar revisión/test del endpoint, no resolverse en el puerto.
- Un use case importa `OpenAIProvider` directamente: debe fallar revisión/lint si existe regla.

### Audit Requirements

El contrato debe transportar metadata suficiente para auditoría posterior:

- `correlationId`
- `promptVersionId`
- `provider`
- `languageCode`
- `latencyMs`
- `fallbackUsed`
- `rawOutputHash?`

No crea `AdminAction`.

### Sensitive Data Handling

- El puerto no debe recibir ni exponer API keys, cookies, JWTs, session tokens ni secrets.
- Errores tipados no deben incluir raw prompt, raw output sensible o stack trace público.
- SDK-specific config queda fuera del puerto.

---

## 13. Testing Strategy

### Unit Tests

- Fake provider implementa `LLMProvider` sin SDK externo.
- `AIResult<TOutput>` exige metadata obligatoria.
- Errores tipados pueden construirse, lanzarse y capturarse sin HTTP dependency.
- `ProviderId` no acepta valores fuera de `openai`, `mock`, `anthropic`.
- `LanguageCode` no acepta idiomas fuera de `es-LATAM`, `es-ES`, `pt`, `en`.

### Integration Tests

No aplica para US-117. La integración con adapters ocurre en US-118, US-119 y US-120.

### API Tests

No aplica.

### E2E Tests

No aplica.

### Security Tests

- Test o static check que el archivo del puerto no importe `openai`, `@anthropic-ai/sdk`, browser APIs ni módulos frontend.
- Test/review de que el contrato no expone API keys o secrets.

### Accessibility Tests

No aplica.

### AI Tests

- Contract test con fake provider determinista que retorna `AIResult<TOutput>`.
- Contract test de fake provider lanzando `AITimeoutError`.
- Contract test de fake provider lanzando `AIProviderNotConfiguredError`.

### Seed / Demo Tests

No requiere seed. US-117 habilita futuros tests deterministas con `MockAIProvider`.

### CI Checks

- Type check.
- Unit tests.
- Contract tests.
- Lint/import boundary check si el repo ya lo soporta.

---

## 14. Observability & Audit

### Logs

No se implementan logs runtime en US-117. El contrato debe proveer metadata para que adapters/use cases logueen de forma segura.

### Correlation ID

`AIContext.correlationId` es obligatorio.

### AdminAction

No aplica.

### Error Tracking

Errores tipados deben permitir clasificación segura por código/tipo en capas superiores.

### Metrics

No se emiten métricas en US-117. `latencyMs`, `provider` y error types habilitan métricas posteriores como `ai_request_latency_ms`, `ai_provider_error_total` y `ai_timeout_total`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No aplica.

### Demo Scenario Supported

US-117 habilita indirectamente demo offline y deterministic testing porque permite que `MockAIProvider` sustituya a OpenAI en historias posteriores.

### Reset / Isolation Notes

No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `docs/7-AI-Features-Specification.md` y docs posteriores | Algunos documentos listan `generateVendorBio` como feature AI; la User Story US-117 exige al menos las features MVP principales y permite excluir future/no aprobadas. | No obligar métodos future si no están promovidos para este backlog slice. Incluir sólo lo aprobado para MVP execution o marcar explícitamente como no usado. | Mantener el contrato alineado con el alcance vigente al momento de desarrollo; si Product decide incluir `generateVendorBio`, debe quedar cubierto por adapters posteriores. | No |
| `docs/17-AI-Architecture-and-PromptOps-Design.md` | Documenta selector runtime y fallback, pero US-117 sólo define puerto. | Selector y fallback quedan fuera de US-117 y pertenecen a historias posteriores de PB-P0-009/PB-P0-011. | No implementar selector/fallback en esta spec. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Contrato demasiado acoplado a OpenAI | Dificulta sustituir providers y viola ADR-AI-001 | Prohibir imports SDK; usar tipos genéricos y adapters en Infrastructure |
| Contrato demasiado amplio para US-117 | Arrastra PromptOps, fallback o persistence antes de tiempo | Mantener US-117 sólo como puerto/tipos/errores/tests de contrato |
| Métodos por feature no alineados con alcance MVP | Adapters posteriores podrían quedar obligados a implementar features future | Revisar docs y backlog; marcar future como no usado o excluirlo |
| Falta de metadata en `AIResult` | Auditoría y persistencia futura incompletas | Hacer `provider`, `promptVersionId`, `languageCode`, `latencyMs`, `fallbackUsed` obligatorios |
| Errores acoplados a HTTP/Express | Application queda mezclada con interfaz API | Definir errores de provider sin status HTTP; mapping queda en capa API/use case |
| `preferMock` malinterpretado como selector | Podría saltar configuración permitida | Documentar que es sólo contexto; composition/fallback decide bajo flags autorizados |
| Tests sólo runtime y no type-level | Regresiones de contrato podrían pasar inadvertidas | Agregar type check y fake provider contract tests |

---

## 18. Implementation Guidance for Coding Agents

- Revisar la estructura real del backend antes de crear paths.
- Ubicar el puerto en `ai-assistance` bajo Ports/Application boundary, no en Infrastructure.
- Crear tipos compartidos en archivos pequeños y exportarlos desde un barrel interno si el repo ya usa ese patrón.
- Implementar errores tipados en Application/shared domain de AI sin dependencia de Express, HTTP status o SDKs.
- Crear fake provider de test que implemente todos los métodos requeridos.
- Mantener nombres de métodos alineados con docs y User Story: event plan, checklist, budget suggestion, vendor categories, quote brief, quote comparison y task prioritization.
- No implementar `OpenAIProvider`, `MockAIProvider` ni `AnthropicProvider`.
- No implementar `LLM_PROVIDER` selector.
- No crear endpoints, controllers, Prisma models, migrations ni seeds.
- No introducir imports de `openai`, `@anthropic-ai/sdk`, browser APIs o frontend code.
- Preservar decisiones de ADR-AI-001, ADR-AI-002, ADR-AI-003 y ADR-AI-004.

---

## 19. Task Generation Notes

Suggested task groups:

- Backend contract:
  - Crear `ProviderId`, `LanguageCode`, `PromptVersionId`.
  - Crear `AIContext`.
  - Crear `AIResult<TOutput>`.
  - Crear interfaz `LLMProvider`.
  - Crear errores tipados de provider.

- QA / contract tests:
  - Fake provider implementa el contrato.
  - Tests de metadata requerida.
  - Tests de errores tipados.
  - Tests/type checks de provider ids y language codes.
  - Guard de no SDK import si el tooling lo permite.

- Documentation:
  - Documentar boundary y responsabilidades de US-118/US-119/US-120.
  - Registrar explicitamente que selector, fallback, PromptRegistry y `AIRecommendation` quedan fuera.

Required security tasks:

- Verificar que el puerto no expone secrets.
- Verificar que SDKs no se importen fuera de Infrastructure.

Required seed/demo tasks:

- No requiere seed en US-117.

Dependencies between tasks:

- Tipos base antes de interfaz.
- Interfaz antes de fake provider tests.
- Errores tipados antes de tests negativos.
- Documentation después de estabilizar nombres del contrato.

Parent backlog consolidated tasks:

- Sí. PB-P0-009 debería tener luego una vista consolidada de tareas porque US-117, US-118, US-119 y US-120 comparten paquete/módulo y orden de integración.

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

US-117 está aprobada, correctamente mapeada a PB-P0-009 y suficientemente acotada para generar Development Tasks. La implementación técnica debe concentrarse en el contrato `LLMProvider`, tipos compartidos, errores tipados y tests de contrato, sin adelantar adapters ni servicios posteriores.
