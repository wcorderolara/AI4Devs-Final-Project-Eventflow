# Technical Specification — US-018: Generar checklist IA con fechas relativas (AI-002)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-018 |
| Source User Story | `management/user-stories/US-018-generate-ai-checklist.md` |
| Decision Resolution Artifact | No aplica (decisiones PO ya formalizadas: 8.1 #9, #15) |
| Priority | P1 |
| Backlog ID | PB-P1-012 |
| Backlog Title | Generar checklist IA con fechas relativas T-x |
| Backlog Execution Order | 30 (P0: 18 + posición 12 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-018 |
| Epic | EPIC-AIP-001 — AI-Assisted Event Planning |
| Backlog Item Dependencies | PB-P1-011, PB-P1-015, PB-P0-009, PB-P0-010, PB-P0-011, PB-P0-007, PB-P0-014 |
| Feature | AI-002 — Checklist IA |
| Module / Domain | AI / Tasks |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-012 — Generar checklist IA con fechas relativas T-x. Depende de PB-P1-011 (plan IA y fundación AI-001), PB-P1-015 (catálogo de categorías de tarea), PB-P0-009..011 (fundación IA), PB-P0-007 (rate limit IA) y PB-P0-014 (observabilidad IA). La confirmación bulk y materialización de `EventTask` se cubren en US-031 / PB-P1-017.

### Execution Order Rationale

Se ejecuta inmediatamente después de US-017 (AI-001), reutilizando toda la fundación IA y agregando un segundo prompt (`ChecklistPrompt v1`). Habilita US-031 (bulk confirm) y, por extensión, US-028/029 (gestión de tareas) sobre tareas materializadas.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-018 | Generación inicial del checklist IA con HITL pending | 1 |

---

## 3. Executive Technical Summary

Implementar `POST /api/v1/events/:eventId/ai/checklist` que orquesta `GenerateChecklistUseCase`: valida ownership y `event_date`, invoca `LLMProvider` (`OpenAIProvider` en prod, `MockAIProvider` en demo/tests) con `ChecklistPrompt v1`, valida el output con Zod (1 reintento), filtra tareas cuyas `due_relative_days` excedan los días disponibles hasta el evento y persiste un `AIRecommendation { type='checklist', status='pending', edited=false }` con el JSON filtrado. **No** crea `EventTask` (esa materialización vive en US-031). Aplica rate limit IA `SEC-POL-AI-007` (20/usuario/hora). Fallback determinista en modo demo. Toda invocación —exitosa o no— persiste `AIRecommendation` con `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms` y `correlation_id`. El frontend implementa `/[locale]/organizer/events/:id/ai/checklist` con `AIChecklistGenerator` y `AIChecklistViewer` (lista agrupada por fase T-x), badge "Sugerido por IA", manejo de estados (loading prolongado, error, rate limit), i18n y a11y. Reusa el `AIBadge` introducido en US-017.

---

## 4. Scope Boundary

### In Scope

* `POST /api/v1/events/:eventId/ai/checklist` con ownership + rate limit.
* `GenerateChecklistUseCase` orquestando `LLMProvider` + validación Zod + retry + filtro T-x + persistencia.
* Registro de `ChecklistPrompt v1` en `ai_prompt_versions` y catálogo de código.
* Extensión del `MockAIProvider` con respuesta determinista por idioma para `checklist`.
* Persistencia transaccional de `AIRecommendation` (éxito y falla).
* Logging estructurado `ai.checklist.*` con `correlation_id` y métricas.
* Página `/[locale]/organizer/events/:id/ai/checklist` con `AIChecklistGenerator`, `AIChecklistViewer` y badge reusado.
* i18n para 4 locales.
* Suite de pruebas funcional, IA, autorización, rate limit, filtrado T-x y accesibilidad.

### Out of Scope

* Confirmación bulk y materialización de `EventTask` (US-031 / PB-P1-017).
* Edición/eliminación individual de tareas (US-028, US-029).
* Conversión T-x → fecha absoluta (ocurre al aceptar en US-031).
* Regeneración con feedback dedicado (US-026).
* Chatbot conversacional, RAG, vector DB, generación de imágenes IA.
* `AnthropicProvider` operativo (solo stub).

### Explicit Non-Goals

* No introducir nuevas tablas ni migraciones.
* No tocar `event_tasks` en esta US.
* No introducir nuevos enums (`type='checklist'` ya existe en `ai_recommendation_type`).
* No introducir nuevos middlewares de rate limit (reutiliza el de PB-P0-007).

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Interface: `AIChecklistController.generate`.
* Capa Application: `GenerateChecklistUseCase`, `ChecklistOutputValidator` (Zod), `ChecklistTRangeFilter`, `ChecklistAssembler`.
* Capa Domain: `Event` (read), `AIRecommendation` (creación), `AIPromptVersion` (lookup), `LLMProvider` port.
* Capa Infrastructure: `OpenAIProvider`, `MockAIProvider` (extensión `checklist`), `AIRecommendationPrismaRepository`, `AIPromptVersionPrismaRepository`, `EventPrismaRepository.findOwnedById` (reusado de US-017).
* Cross-cutting: `requireAuth`, `requireRole('organizer')`, ownership guard, `aiRateLimitMiddleware` (`SEC-POL-AI-007`), `withCorrelationId`, error mapper unificado.
* Transacción: insert de `AIRecommendation` dentro de `prisma.$transaction` (sin tocar `event_tasks`).

### Frontend Architecture

* Next.js App Router; client component para `AIChecklistGenerator`.
* `useGenerateAIChecklist` (TanStack `useMutation`).
* Reusa `AIBadge` de US-017; nuevo `AIChecklistViewer` con grupos por fase.
* `next-intl` para 4 locales.

### Database Architecture

* Tablas afectadas (sin cambios estructurales):
  * `ai_recommendations` (insert, `type='checklist'`).
  * `ai_prompt_versions` (read; semilla de `ChecklistPrompt v1`).
  * `events` (read con ownership).
  * `event_tasks` **no** se modifica.
* Reutiliza enums (`ai_recommendation_status`, `ai_recommendation_type`) y FKs existentes.
* Reutiliza índices entregados por PB-P0-001 / US-101.

### API Architecture

* REST JSON `/api/v1` (`ADR-API-001`).
* `POST /api/v1/events/:eventId/ai/checklist`.
* Respuestas: `200`, `400`, `401`, `403`, `404`, `409`, `429`, `5xx` con envelope `{ error: { code, message, details? }, correlationId }`.

### AI / PromptOps Architecture

* Prompt: `ChecklistPrompt v1` en `prompts/ChecklistPrompt/v1.yaml` y registro en `ai_prompt_versions`.
* Reuso del port `LLMProvider` y de `MockAIProvider` (con un fixture nuevo para `checklist`).
* Selección de provider por env (`LLM_PROVIDER`, `AI_DEMO_MODE`), idéntica a US-017.
* Reintento de validación: 1 sola vez si Zod falla.
* Persistencia siempre (éxito y falla), dentro de transacción.

### Security Architecture

* Backend como source of truth; cookies HTTP-Only signed (`ADR-SEC-002`).
* RBAC `requireRole('organizer')` + ownership guard sobre `Event`.
* Rate limit `SEC-POL-AI-007` (20/usuario/hora) compartido con el resto de endpoints IA.
* `OPENAI_API_KEY` solo en backend vía Secrets Manager (PB-P1-029/030).
* Redacción de PII en logs.

### Testing Architecture

* Unit: use case + assembler + validator + filtro T-x + provider mocks.
* Integration: endpoint contra BD test + `MockAIProvider` (TS-01..04, AI-TS-01).
* AI tests: timeout, JSON inválido con retry, fallback Mock, rate limit (AI-TS-02..07).
* Autorización: AUTH-TS-01..05 y matriz NT.
* E2E Playwright con seed (TS-05).
* A11y con axe.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Generación exitosa con HITL pending | Pipeline: ownership → estado válido → lookup prompt → `LLMProvider.generateStructured` → Zod → filtro T-x → persistir `AIRecommendation(pending)` → `200`. **No tocar `event_tasks`**. | Backend, DB, API, Frontend |
| AC-02: Idioma respetado | Payload del prompt incluye `language_code`; `MockAIProvider` produce contenido por idioma; persistir `language_code`. | Backend, AI, DB |
| AC-03: Trazabilidad completa | Insert con `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`. | Backend, DB, OBS |
| AC-04: Estructura del checklist | `EventChecklistSchema` valida `tasks[]` con `phase ∈ {T-180..T-1}` consistente con `due_relative_days`; el cliente agrupa por fase. | Backend, Frontend |
| EC-01: Evento próximo (filtrado T-x) | `ChecklistTRangeFilter` filtra `due_relative_days > daysToEvent` antes de persistir. | Backend |
| EC-02..04: Timeout / JSON / Provider error | Idénticas políticas a US-017 (con `AI_DEMO_MODE` para fallback). | Backend, AI |
| EC-05: Rate limit | `aiRateLimitMiddleware` → `429 RATE_LIMITED` con `Retry-After`. | Backend, Security |
| VR-01..06 | Validación Zod en params/state del evento; filtro T-x descarta tareas con `due_relative_days < 0`. | Backend, API |
| SEC-01..06 | Middlewares + Secrets Manager + redacción PII. | Backend, Security, OPS |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/ai/checklist/` (feature-first):
  * `interface/AIChecklistController.ts`
  * `application/GenerateChecklistUseCase.ts`
  * `application/ChecklistOutputValidator.ts`
  * `application/ChecklistTRangeFilter.ts`
  * `application/ChecklistAssembler.ts`
  * `infrastructure/prompts/checklist.v1.yaml`
* Reutiliza `modules/ai/llm-provider/` (US-017), `modules/ai/prompt-registry/` (US-121) y `modules/ai/recommendations/` (repositorio de `AIRecommendation`).
* Reutiliza `EventPrismaRepository.findOwnedById` (US-017).

### Use Cases / Application Services

* `GenerateChecklistUseCase.execute({ eventId, actor, correlationId }): Promise<EventChecklistResponseDTO>`
  * Pasos:
    1. `EventRepository.findOwnedById(eventId, actor.id)`.
    2. Validar estado (`draft|active`) → `ConflictError(VR-05)` si no.
    3. Validar `event_date` presente y `language_code` válido → `400` si no.
    4. `AIPromptVersionRepository.findActiveByPromptKey('ChecklistPrompt')`.
    5. `LLMProvider.generateStructured(prompt, payload, EventChecklistSchema, { timeoutMs: 60_000 })`.
    6. Retry una vez si `ZodError`; sino persistir `failed` y lanzar `AI_INVALID_OUTPUT`.
    7. Fallback Mock en demo ante timeout/provider error; en prod, persistir `failed` y lanzar el error.
    8. Calcular `daysToEvent = floor((event_date - now()) / 1 day)`.
    9. `ChecklistTRangeFilter.filter(tasks, daysToEvent)` (mantiene solo `due_relative_days <= daysToEvent` y `>= 0`).
    10. Insert `AIRecommendation { type='checklist', status='pending', ... }` dentro de `prisma.$transaction`.
    11. Retornar `EventChecklistResponseDTO`.

* `ChecklistOutputValidator`: encapsula `EventChecklistSchema` (Zod) y el retry.
* `ChecklistTRangeFilter.filter(tasks, daysToEvent)`: helper puro.
* `ChecklistAssembler`: mapea a `EventChecklistResponseDTO`.

### Controllers / Routes

* `AIChecklistController.generate`: stack `requireAuth`, `requireRole('organizer')`, `validateParams`, `aiRateLimitMiddleware`, `withCorrelationId`; mapea errores al envelope unificado.

### DTOs / Schemas

* `eventChecklistParamsSchema`: `{ eventId: z.string().uuid() }`.
* `EventChecklistInputSchema` (payload del prompt):
  ```ts
  z.object({
    event_type_code: z.string(),
    event_date: z.string().date(),
    guest_count: z.number().int().positive(),
    language_code: z.enum(['es','en','pt','fr'])
  }).strict()
  ```
* `EventChecklistSchema` (output IA):
  ```ts
  z.object({
    tasks: z.array(z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      category: z.string().min(1),
      due_relative_days: z.number().int().min(0),
      phase: z.enum(['T-180','T-90','T-30','T-7','T-1']),
      priority: z.enum(['low','medium','high'])
    })).min(1)
  }).strict()
  ```
  Validación cruzada `phase ↔ due_relative_days` aplicada en el validator (consistencia básica).
* `EventChecklistResponseDTO`: `{ recommendation: { id, type, status, edited, created_at, prompt_version_id, llm_provider, language_code, latency_ms, fallback_used, timeout_ms }, checklist: { tasks: [...] } }`.

### Repository / Persistence

* `EventPrismaRepository.findOwnedById` (reuso US-017).
* `AIRecommendationPrismaRepository.create` (compartido).
* `AIPromptVersionPrismaRepository.findActiveByPromptKey` (compartido).

### Validation Rules

* VR-01..06 mapeados como `400`/`409`/filtrado interno.

### Error Handling

* Mismo set que US-017 + `AI_INVALID_OUTPUT` y `AI_TIMEOUT` específicos para checklist.

### Transactions

* `prisma.$transaction` solo envuelve el insert de `AIRecommendation`. La llamada al LLM ocurre fuera de la transacción.

### Observability

* Logs: `ai.checklist.requested|generated|failed|fallback`.
* Métricas: contadores por `provider`, `fallback_used`, `result`; histograma de latencia.

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events/[id]/ai/checklist/page.tsx` (client component).
* Grupo de rutas: `app/[locale]/organizer/` ya provisto por PB-P1-014.

### Components

* `AIChecklistGenerator`: contenedor + CTA.
* `AIChecklistViewer`: grupos por fase con headings; `role="region"`.
* `AIBadge`: reusado de US-017.
* `RateLimitBanner` y `ErrorBanner` (reusados del proyecto si existen, si no se crean en US-017).

### Forms

No aplica (sin selección/confirmación en esta US).

### State Management

* `useGenerateAIChecklist(eventId)` (TanStack `useMutation`).
* `queryKey: ['ai','event', eventId, 'checklist']`.

### Data Fetching

* `aiApi.generateChecklist(eventId)` consumiendo el endpoint con cookie auth.

### Loading / Empty / Error / Success States

* Empty: CTA "Generar checklist IA".
* Loading: skeleton + mensaje "Puede tomar hasta 60 segundos." con `aria-live="polite"`.
* Error: banner por `error.code` (`AI_TIMEOUT`, `AI_INVALID_OUTPUT`, `AI_PROVIDER_ERROR`, `RATE_LIMITED`, `VALIDATION`, `CONFLICT`).
* Success: lista agrupada por fase + badge.

### Accessibility

* Grupos `role="region"` con `aria-labelledby` por fase.
* `aria-live="polite"` para anuncios de generación.
* Foco al primer item tras éxito.

### i18n

* Claves `ai.checklist.*` para 4 locales (textos UI; el contenido IA ya viene en el idioma del evento).

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:eventId/ai/checklist` | Generar checklist IA del evento | Yes — Organizer dueño | Path: `eventId: uuid`. Headers: cookie de sesión, opcional `x-correlation-id`. Body: vacío. | `200 OK` con `EventChecklistResponseDTO`. Header `x-correlation-id`. | `400 VALIDATION`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 EVENT_NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED` (con `Retry-After`), `5xx AI_TIMEOUT` / `AI_INVALID_OUTPUT` / `AI_PROVIDER_ERROR`. |

Documentation Alignment Required: regenerar snapshot OpenAPI vía US-098.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (read).
* `AIRecommendation` (insert).
* `AIPromptVersion` (read; semilla del prompt activo).

### Fields / Columns

* `ai_recommendations`: `type='checklist'`, demás metadata canónica (`prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`).

### Relations

* `ai_recommendations.event_id → events.id`.
* `ai_recommendations.prompt_version_id → ai_prompt_versions.id`.

### Indexes

* Reusar índices existentes; sin nuevos.

### Constraints

* Enum `ai_recommendation_status` ya incluye los valores requeridos; enum `ai_recommendation_type` ya incluye `'checklist'`.

### Migrations Impact

* Sin migraciones nuevas.
* Semilla del prompt vía mecanismo de registry (US-121).

### Seed Impact

* Sembrar `ChecklistPrompt v1` y asegurar al menos un evento por idioma con `event_date` lejana y otro próximo (para EC-01).

---

## 11. AI / PromptOps Design

### AI Feature

AI-002 — Checklist IA.

### Provider

* `OpenAIProvider` (prod), `MockAIProvider` (demo/tests/fallback), `AnthropicProvider` stub.
* Selección por env `LLM_PROVIDER` y `AI_DEMO_MODE`.

### Prompt Version

* Key: `ChecklistPrompt`.
* Versión: `v1`.
* Almacenamiento: archivo (`prompts/ChecklistPrompt/v1.yaml`) + registro en `ai_prompt_versions`.

### Input Schema

`EventChecklistInputSchema` (§7).

### Output Schema

`EventChecklistSchema` (§7).

### Human-in-the-loop

* `AIRecommendation.status='pending'` y `edited=false` al crearse.
* Materialización de `EventTask` ocurre solo al aceptar (US-031).

### Fallback

* Demo: timeout/provider error → `MockAIProvider`, `fallback_used=true`.
* Prod: error explícito.

### Persistence

* Siempre persistir `AIRecommendation` con metadata, incluso en falla.

### Safety Rules

* Sin decisiones autónomas.
* Sin moderación automática.
* Sin RAG.
* Redacción de PII en logs.

---

## 12. Security & Authorization Design

### Authentication

Cookie HTTP-Only signed (`ADR-SEC-002`). Falta de sesión → `401`.

### Authorization

`requireRole('organizer')` + ownership guard sobre `Event`.

### Ownership Rules

`event.owner_user_id === actor.id`.

### Role Rules

* Organizer dueño → `200`.
* Otros → `403`/`401`.

### Negative Authorization Scenarios

* Organizer no dueño → `403`/`404`.
* Vendor → `403`.
* Admin → `403`.
* Anónimo → `401`.
* Exceso de rate → `429`.

### Audit Requirements

* No `AdminAction`.
* `AIRecommendation` actúa como audit trail.

### Sensitive Data Handling

* PII redactada en logs.
* Secretos solo en backend.

---

## 13. Testing Strategy

### Unit Tests

* `GenerateChecklistUseCase` con repos y provider mockeados:
  * Happy (Mock).
  * Timeout prod → `failed`; demo → fallback Mock + `fallback_used=true`.
  * JSON inválido + retry exitoso; en retry → `failed`.
  * Provider error prod → `failed`.
  * Evento ajeno → `Forbidden`.
  * Evento `cancelled` → `Conflict`.
* `ChecklistOutputValidator`: schema y consistencia `phase ↔ days`.
* `ChecklistTRangeFilter`: días disponibles → filtrado correcto.
* `ChecklistAssembler`: forma del DTO.

### Integration Tests

* TS-01: happy + persistencia con metadata canónica.
* TS-02: verificación de campos persistidos.
* TS-03: `language_code='pt'` → contenido pt.
* TS-04: evento próximo (3 días) → filtrado T-x aplicado y persistido.

### API Tests

* NT-01..07: matriz negativa.
* AUTH-TS-01..05.

### E2E Tests

* TS-05: organizer genera checklist y lo ve en pending (Playwright + seed + Mock).

### Security Tests

* AI-TS-07: rate limit → `429` con `Retry-After`.

### Accessibility Tests

* axe en la página del checklist.

### AI Tests

* AI-TS-01..06.

### Seed / Demo Tests

* Verificar `ChecklistPrompt v1` y eventos por idioma + uno con fecha próxima.

### CI Checks

* Quality gates de PB-P1-024 / US-132.

---

## 14. Observability & Audit

### Logs

* `ai.checklist.requested|generated|failed|fallback` con campos canónicos.

### Correlation ID

* Propagación al log y al `AIRecommendation`.

### AdminAction

No aplica.

### Error Tracking

* Errores no controlados al pipeline estándar (PB-P0-014).

### Metrics

* Contadores y latencia (NFR-OBS-001 / PB-P0-014).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* `ChecklistPrompt v1` activo.
* Eventos por idioma con datos completos.
* Al menos un evento con `event_date - now() < 7 días` para EC-01.

### Demo Scenario Supported

* "Organizer genera checklist IA" mostrando agrupación por fase, fallback transparente en demo y badge "Sugerido por IA".

### Reset / Isolation Notes

* `ai_recommendations` se truncate en reset demo (PB-P1-036).
* `ai_prompt_versions` se conserva (catálogo).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/16-API-Design-Specification.md` | Confirmar snapshot OpenAPI con `429` y `5xx`. | Endpoint canónico ya documentado. | Regenerar snapshot vía US-098. | No |
| `/docs/8-Use-Cases-Specification.md` | `UC-AI-002` describe "revisar plan IA"; `/docs/9` lo mapea a checklist. | Mantener el mapeo del FRD para esta US. | Aclaración liviana en `/docs/8`. | No |
| `/docs/10-Non-Functional-Requirements.md` | Wording de `NFR-AI-005` (1 reintento). | Implementación lo respeta. | Verificar wording. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LLM devuelve `phase` inconsistente con `due_relative_days` | Datos confusos para la UI. | Validación cruzada en `ChecklistOutputValidator`; tests dedicados. |
| Eventos muy próximos con pocas tareas restantes | UX pobre. | Filtro T-x explícito y mensaje de "pocas tareas" en UI. |
| Sobrecarga del LLM con prompts largos | Mayor latencia y costo. | Bounding del prompt + `MockAIProvider` en demos. |
| Confusión con US-017 (mismo flujo IA) | Mayor superficie de regresión. | Reuso de componentes (`AIBadge`, error mapper); sufijos `checklist` en logs/módulos. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/modules/ai/checklist/interface/AIChecklistController.ts`
  * `apps/api/src/modules/ai/checklist/application/GenerateChecklistUseCase.ts`
  * `apps/api/src/modules/ai/checklist/application/ChecklistOutputValidator.ts`
  * `apps/api/src/modules/ai/checklist/application/ChecklistTRangeFilter.ts`
  * `apps/api/src/modules/ai/checklist/application/ChecklistAssembler.ts`
  * `apps/api/src/modules/ai/checklist/infrastructure/prompts/checklist.v1.yaml`
  * `apps/api/src/modules/ai/llm-provider/MockAIProvider.checklist.ts` (extensión)
  * `apps/api/src/routes/events/ai.routes.ts` (alta de la ruta + middleware)
* Frontend:
  * `apps/web/src/app/[locale]/organizer/events/[id]/ai/checklist/page.tsx`
  * `apps/web/src/features/ai/checklist/components/AIChecklistGenerator.tsx`
  * `apps/web/src/features/ai/checklist/components/AIChecklistViewer.tsx`
  * `apps/web/src/features/ai/checklist/hooks/useGenerateAIChecklist.ts`
  * `apps/web/src/features/ai/checklist/api/aiApi.generateChecklist.ts`
  * `apps/web/src/i18n/messages/{es,en,pt,fr}/ai.checklist.json`

(Rutas exactas según convención feature-first ya consolidada.)

### Recommended order of implementation

1. Verificar fundación IA (PB-P0-009..011) y rate limit (PB-P0-007).
2. Registrar `ChecklistPrompt v1` (registry + tabla).
3. Extender `MockAIProvider` con fixture determinista por idioma.
4. Implementar validator, filtro T-x y assembler.
5. Implementar use case con timeout/retry/fallback.
6. Implementar controlador + middlewares + rate limit + error mapping.
7. Tests unitarios y de integración.
8. Implementar cliente, hook, página y componentes UI.
9. Agregar i18n y a11y.
10. E2E con seed.

### Decisions that must not be reopened

* Timeout 60 s (PO 8.1 #9).
* `AnthropicProvider` solo stub (PO 8.1 #15).
* HITL: la generación crea solo `AIRecommendation`; `EventTask` se materializan al aceptar (US-031).
* Endpoint canónico `POST /api/v1/events/:eventId/ai/checklist`.
* `type='checklist'` y status enum canónico.
* Rate limit `SEC-POL-AI-007`.

### What must not be implemented

* Confirmación bulk y materialización de `EventTask` (US-031).
* Edición/eliminación individual (US-028/US-029).
* Conversión T-x → fecha absoluta.
* RAG, vector DB, chatbot, generación de imágenes.
* `AnthropicProvider` operativo.

### Assumptions to preserve

* `Event.owner_user_id` y `Event.currency_code` son inmutables.
* `MockAIProvider` siempre disponible para tests/demo.
* Seed provee al menos un evento por idioma y uno próximo.

---

## 19. Task Generation Notes

### Suggested task groups

* AI: registro de prompt, extensión Mock, validator (incluye consistencia phase ↔ days), filtro T-x.
* BE: use case, controller, repos.
* API: schemas Zod y envelope.
* SEC: rate limit aplicado; Secrets/PII.
* FE: página, componentes, hook, cliente, i18n, a11y.
* OBS: logs, métricas, correlation ID.
* QA: unit, integration, AI behaviors, autorización/rate limit, E2E, a11y.
* SEED: prompt y eventos por idioma + uno próximo.
* DOC: snapshot OpenAPI (US-098) y aclaración en `/docs/8`.

### Required QA tasks

* Suite IA con `MockAIProvider`.
* Tests de timeout con clock injectable.
* Tests de retry de validación JSON.
* Tests de filtrado T-x.
* Tests de rate limit.
* E2E + a11y.

### Required security tasks

* Verificación de rate limit.
* No exposición de claves; redacción de PII.

### Required seed/demo tasks

* Verificación de `ChecklistPrompt v1` y eventos próximos en seed.

### Required documentation tasks

* Coordinar con US-098 y aclarar `/docs/8`.

### Dependencies between tasks

* FE depende de BE/API (MSW desbloquea FE en local).
* QA E2E depende de FE + seed + Mock.
* SEC depende de BE-controller + middleware.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

* PB-P1-012 tiene una sola US; no se requiere `tasks.md` consolidado.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.** US aprobada, mapeo a PB-P1-012 confirmado, decisiones formalizadas, arquitectura cubierta por la fundación IA sin migraciones nuevas, scope acotado a generación (sin materialización de `EventTask`). Alineaciones documentales (`/docs/16` y `/docs/8`) se atienden como tareas ligeras y no bloquean el breakdown.
