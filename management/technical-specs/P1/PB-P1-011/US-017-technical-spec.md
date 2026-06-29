# Technical Specification — US-017: Generar plan IA de mi evento (AI-001)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-017 |
| Source User Story | `management/user-stories/US-017-generate-ai-event-plan.md` |
| Decision Resolution Artifact | No aplica (decisiones PO ya formalizadas: 8.1 #9, #15) |
| Priority | P1 |
| Backlog ID | PB-P1-011 |
| Backlog Title | Generar plan IA del evento (timeline + categorías) |
| Backlog Execution Order | 29 (P0: 18 + posición 11 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-017 |
| Epic | EPIC-AIP-001 — AI-Assisted Event Planning |
| Backlog Item Dependencies | PB-P0-009, PB-P0-010, PB-P0-011, PB-P1-006, PB-P0-007, PB-P0-014 |
| Feature | AI-001 — Generación de plan IA |
| Module / Domain | AI / Events |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-011 — Generar plan IA del evento. Inaugura el flujo IA-001 sobre la fundación IA (PB-P0-009..011: `LLMProvider`, `MockAIProvider`, prompt registry y `AIRecommendation`). Depende además de PB-P1-006 (creación de evento con datos completos), PB-P0-007 (rate limit IA `SEC-POL-AI-007`) y PB-P0-014 (observabilidad IA: métricas, logs estructurados, correlation_id). La UI superficial completa se entrega en PB-P1-044.

### Execution Order Rationale

Se ejecuta después de toda la fundación IA y de la creación de eventos. Es la primera US del flujo IA-001 visible al organizador y prerrequisito de US-025 (aceptar/editar/descartar), US-026 (regeneración con feedback) y US-018 (checklist IA dependiente del plan). No bloquea otras US no IA, pero habilita el resto del epic AIP.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-017 | Generación inicial del plan IA con HITL pending | 1 |

---

## 3. Executive Technical Summary

Implementar `POST /api/v1/events/:eventId/ai/event-plan` que orquesta `GenerateEventPlanUseCase`: valida ownership y datos del evento, invoca al `LLMProvider` (`OpenAIProvider` en producción, `MockAIProvider` en demo/tests) con `EventPlanPrompt v1` (registrado en `ai_prompt_versions`), aplica timeout de 60 s con fallback determinista a `MockAIProvider` en modo demo, valida el output con Zod (1 reintento permitido), persiste un `AIRecommendation { type='event_plan', status='pending', edited=false }` y devuelve el plan. Toda invocación —exitosa o no— se persiste con `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms` y `correlation_id`. El endpoint queda bajo el rate limit IA `SEC-POL-AI-007` (20/usuario/hora). El frontend implementa `/[locale]/organizer/events/:id/ai/plan` con `AIPlanGenerator`, soporte para loading prolongado, `aria-live` y manejo de los códigos 401/403/404/409/429/5xx mediante envelope unificado. Sin RAG, sin decisiones autónomas, sin `AnthropicProvider` operativo.

---

## 4. Scope Boundary

### In Scope

* `POST /api/v1/events/:eventId/ai/event-plan` con ownership + rate limit.
* `GenerateEventPlanUseCase` orquestando `LLMProvider` + validación Zod + retry + persistencia.
* Registro de `EventPlanPrompt v1` en `ai_prompt_versions` (semilla / migración de datos vía mecanismo existente de PB-P0-011) y en el catálogo de código.
* `MockAIProvider` determinista para `event_plan` (extensión del provider existente).
* Persistencia transaccional de `AIRecommendation` (en éxito y en falla con `status='failed'`).
* Logging estructurado `ai.event-plan.*` con `correlation_id` y métricas mínimas (NFR-OBS-001 / PB-P0-014).
* Página `/[locale]/organizer/events/:id/ai/plan` con `AIPlanGenerator`, `AISuggestionViewer`, `AIBadge` y manejo de estados (loading prolongado, error, fallback transparente).
* i18n para 4 locales.
* Suite de pruebas funcional, IA, autorización, rate limit y accesibilidad.

### Out of Scope

* Aceptación/edición/descarte del plan (US-025).
* Regeneración con feedback (US-026).
* Checklist IA (US-018) y resto del epic AIP.
* Chatbot conversacional, RAG, vector DB, generación IA de imágenes.
* `AnthropicProvider` operativo (solo stub).
* Cap por evento de regeneraciones (delegado a US-026; el cap operativo aquí es el rate limit global).
* Modificación de tareas, presupuesto, reservas o reseñas a partir del plan.

### Explicit Non-Goals

* No introducir nuevas tablas ni migraciones de esquema (la estructura de `ai_recommendations`, `ai_prompt_versions` y enums llega por PB-P0-001/PB-P0-011).
* No introducir nuevos enums (`type='event_plan'` ya está en el dominio según `/docs/6`).
* No introducir nuevos middlewares de rate limit (se reutiliza el de PB-P0-007).
* No introducir IA en otros endpoints del módulo `events`.

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Interface: `AIEventPlanController.generate`.
* Capa Application: `GenerateEventPlanUseCase`, `EventPlanOutputValidator` (Zod), `EventPlanAssembler`.
* Capa Domain: `Event` (read), `AIRecommendation` (creación), `AIPromptVersion` (lookup), `LLMProvider` port.
* Capa Infrastructure: `OpenAIProvider`, `MockAIProvider`, `AIRecommendationPrismaRepository`, `AIPromptVersionPrismaRepository`, `EventPrismaRepository.findOwnedById`.
* Cross-cutting: `requireAuth`, `requireRole('organizer')`, ownership guard, `aiRateLimitMiddleware` (SEC-POL-AI-007), `withCorrelationId`, error mapper unificado.
* Transacción: `prisma.$transaction` para la persistencia del `AIRecommendation` y de la lectura/lookup del `ai_prompt_versions.id` activo.

### Frontend Architecture

* Next.js App Router; client component para `AIPlanGenerator`.
* `useGenerateAIPlan` (TanStack Query mutation) con `timeout` cliente (mayor que 60 s) y reintentos manuales.
* `next-intl` para los 4 locales.
* Componentes con design tokens; sin nuevos componentes fuera de los enumerados.

### Database Architecture

* Tablas afectadas (sin cambios estructurales):
  * `ai_recommendations` (insert) — enum canónico `(pending, accepted, rejected, discarded, failed, expired)`.
  * `ai_prompt_versions` (read; seeding de `EventPlanPrompt v1`).
  * `events` (read con ownership).
* Reutilizar índices provistos por PB-P0-001/PB-P0-011 (por ejemplo `ai_recommendations(event_id, type, status, created_at)`).
* `event_id`, `prompt_version_id` con FK obligatoria.
* No se introducen migraciones nuevas. La semilla del prompt v1 se realiza con el mecanismo de prompt registry (US-121).

### API Architecture

* REST JSON `/api/v1` (`ADR-API-001`).
* `POST /api/v1/events/:eventId/ai/event-plan`.
* Respuestas: `200`, `400`, `401`, `403`, `404`, `409`, `429`, `5xx` con envelope `{ error: { code, message, details? }, correlationId }`.
* Headers: `x-correlation-id` (entrante y saliente); `Retry-After` en 429.

### AI / PromptOps Architecture

* Prompt: `EventPlanPrompt v1` en `prompts/EventPlanPrompt/v1.yaml` (o ruta equivalente del registry de US-121).
* Provider abstraction: `LLMProvider` con métodos `generateStructured<T>(prompt, input, schema, options): Promise<{ data: T, meta: { latency_ms, provider, fallback_used, timeout_ms } }>`.
* `OpenAIProvider`: SDK oficial con timeout 60 s; mapea errores a `AI_TIMEOUT`, `AI_PROVIDER_ERROR`, `AI_INVALID_OUTPUT`.
* `MockAIProvider`: respuesta determinista por idioma; cuando se invoca como fallback, marca `fallback_used=true`.
* Selección de provider: env `LLM_PROVIDER` (`openai|mock`) y `AI_DEMO_MODE` (boolean) — `AI_DEMO_MODE=true` activa fallback transparente a `MockAIProvider` ante timeout/provider error.
* Reintento de validación: 1 sola vez si Zod falla; el segundo prompt incluye `"return strictly JSON conforming to the schema"`.
* Persistencia siempre antes de devolver respuesta (éxito o falla), dentro de la transacción.

### Security Architecture

* Backend como source of truth: el frontend nunca llama al LLM.
* Cookies HTTP-Only signed (`ADR-SEC-002`) para sesión.
* Middleware RBAC `requireRole('organizer')` + ownership guard sobre `Event`.
* Rate limit `SEC-POL-AI-007` (20/usuario/hora) compartido con el resto de endpoints IA.
* `OPENAI_API_KEY` y otros secretos solo en backend vía Secrets Manager (PB-P1-029/030).
* Redacción de PII en logs estructurados (sin email, teléfono o dirección).

### Testing Architecture

* Unit: use case + assembler + validator + provider mocks.
* Integration: endpoint contra BD test + `MockAIProvider` determinista (TS-01..04, AI-TS-01).
* AI tests específicos: timeout, JSON inválido con retry, fallback Mock, rate limit (AI-TS-02..07).
* Autorización: AUTH-TS-01..05 y matriz NT.
* E2E Playwright con seed (TS-03).
* A11y con axe (sugerencia `role=region`, `aria-live`).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Generación exitosa | Pipeline completo: validar input → resolver prompt activo → invocar `LLMProvider.generateStructured` → validar Zod → persistir `AIRecommendation(status='pending')` → `200` con plan + metadata. | Backend, DB, API, Frontend |
| AC-02: Idioma respetado | El payload de prompt incluye `language_code`; `MockAIProvider` produce contenido por idioma; persistir `language_code` en `ai_recommendations`. | Backend, AI, DB |
| AC-03: Trazabilidad completa | El insert de `ai_recommendations` incluye `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`. | Backend, DB, Observability |
| AC-04: HITL pending inicial | El controlador retorna el `AIRecommendation` con `status='pending'` y `edited=false`; sin efectos colaterales sobre tareas/presupuesto. | Backend, Frontend |
| EC-01: Timeout 60s | `OpenAIProvider` aplica timeout 60 s; en `AI_DEMO_MODE=true`, el use case cae a `MockAIProvider` y marca `fallback_used=true`; en prod, `5xx AI_TIMEOUT` y `AIRecommendation { status='failed' }`. | Backend, AI |
| EC-02: JSON inválido | `EventPlanOutputValidator` detecta `ZodError`; se reintenta una vez; si vuelve a fallar, `5xx AI_INVALID_OUTPUT` y `AIRecommendation { status='failed' }`. | Backend, AI |
| EC-03: Provider error | `OpenAIProvider` mapea error a `AI_PROVIDER_ERROR`; fallback Mock solo en demo. | Backend, AI |
| EC-04: Rate limit | `aiRateLimitMiddleware` (20/usuario/hora) responde `429 RATE_LIMITED` con `Retry-After`; no se persiste `AIRecommendation`. | Backend, Security |
| VR-01..05 | Validación Zod en path/body/state del evento; mapping a `400` / `409`. | Backend, API |
| SEC-01..06 | Middlewares + Secrets Manager + redacción PII. | Backend, Security, OPS |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/ai/event-plan/` (feature-first):
  * `interface/AIEventPlanController.ts`
  * `application/GenerateEventPlanUseCase.ts`
  * `application/EventPlanOutputValidator.ts`
  * `application/EventPlanAssembler.ts`
  * `infrastructure/AIRecommendationPrismaRepository.ts` (compartido con otros AI flows)
* Reutiliza `modules/ai/llm-provider/` (PB-P0-009..010) y `modules/ai/prompt-registry/` (US-121).
* Reutiliza `modules/events/domain/Event` (ownership read).

### Use Cases / Application Services

* `GenerateEventPlanUseCase.execute({ eventId, actor, correlationId }): Promise<EventPlanResponseDTO>`
  * Pasos:
    1. `EventRepository.findOwnedById(eventId, actor.id)` → `Event | null`.
    2. Si `null` → `NotFoundError` (o `ForbiddenError`).
    3. Validar estado editable (`draft|active`) → si no, `ConflictError(VR-05)`.
    4. `AIPromptVersionRepository.findActiveByPromptKey('EventPlanPrompt')` → `AIPromptVersion`.
    5. Construir payload `{ event, language_code }`.
    6. `LLMProvider.generateStructured(prompt, payload, EventPlanSchema, { timeoutMs: 60_000 })`.
    7. Si `ZodError` y `retries < 1`, repetir paso 6 con prompt reforzado; si vuelve a fallar, persistir `failed` y lanzar `AI_INVALID_OUTPUT`.
    8. Si timeout/provider error y `AI_DEMO_MODE=true`, caer a `MockAIProvider` y marcar `fallback_used=true`; en prod, persistir `failed` y lanzar el error correspondiente.
    9. `prisma.$transaction([ AIRecommendation.create(...) ])`.
    10. Retornar `EventPlanResponseDTO`.

* `EventPlanOutputValidator`: encapsula `EventPlanSchema` (Zod) y la lógica del retry.
* `EventPlanAssembler`: mapea `(AIRecommendation, plan)` a `EventPlanResponseDTO`.

### Controllers / Routes

* `AIEventPlanController.generate(req, res)`:
  * Pila: `requireAuth`, `requireRole('organizer')`, `validateParams({ eventId: uuid })`, `aiRateLimitMiddleware`, `withCorrelationId`.
  * Invoca el use case; mapea respuesta `200` o errores al envelope unificado.

### DTOs / Schemas

* `eventPlanParamsSchema`: `{ eventId: z.string().uuid() }`.
* `EventPlanSchema` (Zod, ya definido en `docs/7-AI-Features-Specification.md` § salida AI-001):
  ```ts
  z.object({
    timeline: z.array(z.object({ phase: z.enum(['T-180','T-90','T-30','T-7','T-1']), milestones: z.array(z.string()).min(1) })).min(1),
    suggested_categories: z.array(z.string()).min(1),
    general_recommendations: z.array(z.string()).min(1)
  }).strict()
  ```
* `EventPlanResponseDTO`: `{ recommendation: { id, status, edited, created_at, prompt_version_id, llm_provider, language_code, latency_ms, fallback_used, timeout_ms }, plan: EventPlan }`.

### Repository / Persistence

* `EventPrismaRepository.findOwnedById(eventId, ownerUserId)` (reutilizar si existe; si no, agregar variante read).
* `AIRecommendationPrismaRepository.create(input)`.
* `AIPromptVersionPrismaRepository.findActiveByPromptKey(key)`.

### Validation Rules

* VR-01: `eventId` UUID v4 (`400 VALIDATION`).
* VR-02: ownership (`403 FORBIDDEN` o `404 NOT_FOUND` según política).
* VR-03: datos completos del evento; faltantes → `400 VALIDATION` con `details` por campo (validación al construir el payload del prompt).
* VR-04: `language_code ∈ {es,en,pt,fr}` (`400 VALIDATION`).
* VR-05: evento no debe estar en `cancelled|completed|deleted` (`409 CONFLICT`).

### Error Handling

* `NotFoundError` → `404 EVENT_NOT_FOUND`.
* `ForbiddenError` → `403 FORBIDDEN`.
* `ConflictError` → `409 CONFLICT` (estado del evento).
* `ZodError` → `400 VALIDATION`.
* `AIRateLimitError` → `429 RATE_LIMITED` con `Retry-After`.
* `AITimeoutError` → `5xx AI_TIMEOUT`.
* `AIInvalidOutputError` → `5xx AI_INVALID_OUTPUT`.
* `AIProviderError` → `5xx AI_PROVIDER_ERROR`.
* Todos llevan `correlationId` en el envelope.

### Transactions

* `prisma.$transaction` envolviendo la inserción de `AIRecommendation` (siempre se persiste, tanto en éxito como en falla).
* La transacción no incluye la llamada al LLM (no es transaccional). El insert se ejecuta al final con todos los metadatos disponibles.

### Observability

* Log eventos: `ai.event-plan.requested`, `ai.event-plan.generated`, `ai.event-plan.failed`, `ai.event-plan.fallback`.
* Campos comunes: `actor_user_id`, `event_id`, `correlation_id`, `llm_provider`, `prompt_version_id`, `language_code`, `latency_ms`, `fallback_used`, `result`, `error_code` (cuando aplica).
* Métricas (NFR-OBS-001 / PB-P0-014): contadores por `provider`, `fallback_used`, `result`; histograma `ai_event_plan_latency_ms`.

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events/[id]/ai/plan/page.tsx` (client component).
* Grupo de rutas: `app/[locale]/organizer/` ya provisto por PB-P1-014 / US-105.

### Components

* `AIPlanGenerator`: pantalla principal, dispara `useGenerateAIPlan`.
* `AISuggestionViewer`: renderiza `timeline`, `suggested_categories`, `general_recommendations`.
* `AIBadge`: badge "Sugerido por IA" con `aria-label`.
* Sub-componentes existentes de design system (banners, skeletons).

### Forms

No aplica (sin formularios de entrada).

### State Management

* `useGenerateAIPlan(eventId)` con TanStack `useMutation`:
  * `mutationFn: aiApi.generateEventPlan(eventId)`.
  * Manejo de error mapeado por `error.code`.
  * `onSuccess` actualiza la cache `['ai', 'event', eventId, 'plan']`.

### Data Fetching

* `aiApi.generateEventPlan(eventId)` consume `POST /api/v1/events/:eventId/ai/event-plan`.
* Cliente con `fetch` autenticado por cookie; sin abort por timeout corto (la latencia puede acercarse a 60 s).

### Loading / Empty / Error / Success States

* Empty: CTA "Generar plan IA".
* Loading: skeleton + mensaje "Esto puede tomar hasta 60 segundos." con `aria-live="polite"`.
* Error: banner con `error.code` traducido (`AI_TIMEOUT`, `AI_INVALID_OUTPUT`, `AI_PROVIDER_ERROR`, `RATE_LIMITED`, `VALIDATION`).
* Fallback transparente en demo: badge adicional "Sugerencia base" cuando `fallback_used=true`.
* Success: vista con badge "Sugerido por IA" y acciones HITL (delegadas a US-025/US-026).

### Accessibility

* `AISuggestionViewer` con `role="region"` y `aria-labelledby`.
* Banner de estado con `role="status"` y `aria-live="polite"`.
* Foco en el primer milestone tras generación exitosa.
* Contraste WCAG AA.

### i18n

* Claves `ai.eventPlan.*` para los 4 locales (es/en/pt/fr).
* Mapping de `error.code` a mensajes localizados.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:eventId/ai/event-plan` | Generar plan IA del evento | Yes — Organizer dueño | Path: `eventId: uuid`. Headers: cookie de sesión, opcional `x-correlation-id`. Body: vacío. | `200 OK` con `EventPlanResponseDTO`. Header `x-correlation-id`. | `400 VALIDATION`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 EVENT_NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED` (con `Retry-After`), `5xx AI_TIMEOUT` / `AI_INVALID_OUTPUT` / `AI_PROVIDER_ERROR`. |

Documentation Alignment Required: regenerar snapshot OpenAPI vía US-098 con todos los códigos arriba.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (read con ownership).
* `AIRecommendation` (insert).
* `AIPromptVersion` (read; semilla del prompt activo).

### Fields / Columns

* `ai_recommendations`: `type='event_plan'`, `status` (enum), `edited=false`, `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`, `event_id`, `created_at`.
* `ai_prompt_versions`: registro de `EventPlanPrompt v1` (template hash, idioma soportado, autor, etc.).

### Relations

* `ai_recommendations.event_id → events.id`.
* `ai_recommendations.prompt_version_id → ai_prompt_versions.id`.

### Indexes

* Reutilizar índices entregados por PB-P0-001 / US-101.
* No crear índices nuevos.

### Constraints

* CHECK del enum `ai_recommendation_status` (incluye `pending|accepted|rejected|discarded|failed|expired`).
* `ai_recommendations.event_id NOT NULL`.

### Migrations Impact

* Sin migraciones nuevas en esta US.
* Si `ai_prompt_versions` requiere semilla, hacerlo con el mecanismo del prompt registry (US-121) o con migración de datos controlada (no incluida en esta US).

### Seed Impact

* Sembrar `EventPlanPrompt v1` en seed/demo (US-085..088 ya cubre seed estructural; US-121 cubre el catálogo en código).
* Para tests, `MockAIProvider` provee respuestas deterministas (no requiere fixtures adicionales en BD).

---

## 11. AI / PromptOps Design

### AI Feature

AI-001 — Generación de plan IA.

### Provider

* `OpenAIProvider` (producción).
* `MockAIProvider` (demo, tests, fallback).
* `AnthropicProvider`: solo stub (Decisión PO 8.1 #15).
* Selección por env `LLM_PROVIDER` y `AI_DEMO_MODE`.

### Prompt Version

* Key: `EventPlanPrompt`.
* Versión: `v1`.
* Almacenamiento: archivo versionado (`/prompts/EventPlanPrompt/v1.yaml`) + registro en `ai_prompt_versions`.

### Input Schema

```ts
z.object({
  event_type_code: z.string(),
  event_date: z.string().date(),
  guest_count: z.number().int().positive(),
  budget_estimated: z.number().nonnegative(),
  currency_code: z.string().length(3),
  city: z.string().min(1),
  language_code: z.enum(['es','en','pt','fr'])
}).strict()
```

### Output Schema

`EventPlanSchema` (ver §7 DTOs / Schemas).

### Human-in-the-loop

* `AIRecommendation.status='pending'` y `edited=false` al crearse.
* Acciones (`accept`, `edit`, `discard`) son responsabilidad de US-025.
* La regeneración (US-026) crea un nuevo `AIRecommendation`.

### Fallback

* Demo: timeout/provider error → `MockAIProvider`, marca `fallback_used=true`.
* Producción: sin fallback; error explícito.

### Persistence

* Siempre persistir `AIRecommendation` con metadata, incluso en falla (`status='failed'`).

### Safety Rules

* Sin decisiones autónomas (BR-AI-004 / NFR-AI-002).
* Sin moderación automática.
* Sin RAG.
* Redacción de PII en logs.
* No exponer claves de proveedor.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-Only signed (`ADR-SEC-002`). Falta de sesión → `401`.

### Authorization

* `requireRole('organizer')` + ownership guard sobre `Event`.
* Cualquier otro rol → `403`.

### Ownership Rules

* `event.owner_user_id === actor.id`.
* Si no se cumple, `403 FORBIDDEN` (o `404 NOT_FOUND` según política consensuada del proyecto).

### Role Rules

* Organizer dueño → `200`.
* Otros (organizer no dueño, vendor, admin, anónimo) → `403`/`401`.

### Negative Authorization Scenarios

* Organizer no dueño → `403`/`404`.
* Vendor → `403`.
* Admin → `403`.
* Anónimo → `401`.
* Exceso de rate → `429`.

### Audit Requirements

* No requiere `AdminAction`.
* `AIRecommendation` actúa como audit trail de cada invocación.

### Sensitive Data Handling

* Sin PII en logs (email/teléfono/dirección).
* Secretos de proveedor solo en backend vía Secrets Manager (PB-P1-029/030).

---

## 13. Testing Strategy

### Unit Tests

* `GenerateEventPlanUseCase` con provider y repos mockeados:
  * Happy path (Mock).
  * Timeout en prod → `failed`.
  * Timeout en demo → fallback Mock, `fallback_used=true`.
  * JSON inválido + retry exitoso.
  * JSON inválido en retry → `failed`.
  * Provider error en prod → `failed`.
  * Evento ajeno → `Forbidden`.
  * Evento en `cancelled` → `Conflict`.
* `EventPlanOutputValidator`: cobertura de schema.
* `EventPlanAssembler`: forma del DTO.

### Integration Tests

* TS-01: happy path con `MockAIProvider`, valida persistencia.
* TS-02: persistencia con metadata completa (`prompt_version_id`, `llm_provider`, `language_code`, etc.).
* TS-04: `language_code='pt'` → contenido pt y persistencia.

### API Tests

* NT-01..07: matriz negativa.
* AUTH-TS-01..05: matriz de autorización.

### E2E Tests

* TS-03: organizador genera plan y lo ve en pending (Playwright + seed + Mock).

### Security Tests

* AI-TS-07: rate limit excedido → `429` con `Retry-After`.
* Verificación de no exposición de claves en respuestas/logs.

### Accessibility Tests

* axe en `/[locale]/organizer/events/:id/ai/plan` (sugerencia con `role=region`, `aria-live` anuncios).

### AI Tests

* AI-TS-01..06: provider behaviors, retry, fallback.

### Seed / Demo Tests

* Verificar seed `EventPlanPrompt v1` y al menos un evento `draft|active` con datos completos.

### CI Checks

* Suites existentes (vitest, supertest, playwright, axe) extendidas con los nuevos tests; quality gates de PB-P1-024 / US-132 aplican sin cambios.

---

## 14. Observability & Audit

### Logs

* `ai.event-plan.requested|generated|failed|fallback` con campos canónicos.

### Correlation ID

* Lectura/generación por `withCorrelationId`; se propaga al log y al `AIRecommendation`.

### AdminAction

No aplica.

### Error Tracking

* Errores no controlados al pipeline estándar (PB-P0-014).

### Metrics

* Contadores y latencia (NFR-OBS-001).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Sembrar `EventPlanPrompt v1` en `ai_prompt_versions` (via prompt registry US-121) y en el catálogo de código.
* Al menos un evento `draft|active` por idioma para demo determinista.

### Demo Scenario Supported

* "Organizador genera plan IA": end-to-end con `MockAIProvider`, mostrando timeline en idioma del evento.

### Reset / Isolation Notes

* `ai_recommendations` se truncate en reset demo (PB-P1-036).
* `ai_prompt_versions` se conserva (catálogo).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/16-API-Design-Specification.md` | Confirmar snapshot OpenAPI actualizado con códigos `429` y `5xx`. | Endpoint canónico ya en `/docs/16`. | Regenerar snapshot vía US-098. | No |
| `/docs/7-AI-Features-Specification.md` | Pregunta abierta sobre cap por evento de regeneraciones (impacto bajo). | Cap MVP = rate limit global `SEC-POL-AI-007`; regeneración con feedback en US-026. | Documentar en `/docs/7` que el cap MVP es el global. | No |
| `/docs/10-Non-Functional-Requirements.md` | `NFR-AI-005` retry para validación JSON debe quedar explícito (1 reintento). | Implementación lo respeta. | Verificar wording. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Latencia variable del `OpenAIProvider` cercana al timeout 60 s | UX degradada o timeouts frecuentes. | Mensaje claro en loading; en demo, `MockAIProvider` determinista; métricas para alertar p95/p99. |
| JSON inconsistente del LLM en producción | `5xx AI_INVALID_OUTPUT` recurrentes. | Validador estricto + 1 retry; tests AI-TS-04/05; instrumentación de fallos. |
| Fugas de PII en logs | Riesgo de cumplimiento. | Redactor centralizado; pruebas que verifican ausencia de patrones PII. |
| Saturación de rate limit por demo | Demos bloqueadas. | `MockAIProvider` no consume cuota; en demo se prefiere Mock. |
| `OPENAI_API_KEY` mal configurada en prod | Caída del flujo IA. | Healthcheck con ping a provider; alerta si la clave falla; fallback explícito a Mock solo en demo. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/modules/ai/event-plan/interface/AIEventPlanController.ts`
  * `apps/api/src/modules/ai/event-plan/application/GenerateEventPlanUseCase.ts`
  * `apps/api/src/modules/ai/event-plan/application/EventPlanOutputValidator.ts`
  * `apps/api/src/modules/ai/event-plan/application/EventPlanAssembler.ts`
  * `apps/api/src/modules/ai/event-plan/infrastructure/prompts/event-plan.v1.yaml`
  * `apps/api/src/modules/ai/llm-provider/MockAIProvider.eventPlan.ts` (extensión)
  * `apps/api/src/routes/events/ai.routes.ts` (registro de la ruta + middleware rate limit)
* Frontend:
  * `apps/web/src/app/[locale]/organizer/events/[id]/ai/plan/page.tsx`
  * `apps/web/src/features/ai/event-plan/components/AIPlanGenerator.tsx`
  * `apps/web/src/features/ai/event-plan/components/AISuggestionViewer.tsx`
  * `apps/web/src/features/ai/event-plan/components/AIBadge.tsx`
  * `apps/web/src/features/ai/event-plan/hooks/useGenerateAIPlan.ts`
  * `apps/web/src/features/ai/event-plan/api/aiApi.generateEventPlan.ts`
  * `apps/web/src/i18n/messages/{es,en,pt,fr}/ai.event-plan.json`

(Rutas exactas según la convención feature-first ya consolidada.)

### Recommended order of implementation

1. Verificar fundación IA (PB-P0-009..011) y confirmar `ai_prompt_versions` operativo.
2. Registrar `EventPlanPrompt v1` (registry + tabla).
3. Extender `MockAIProvider` con respuesta determinista por idioma para `event_plan`.
4. Implementar repositorios y use case con validador/assembler.
5. Implementar controlador + middlewares + rate limit + error mapping.
6. Tests unitarios y de integración.
7. Implementar cliente y hook frontend.
8. Implementar página y componentes UI.
9. Agregar i18n y a11y.
10. E2E con seed; verificación de rate limit y fallback en demo.

### Decisions that must not be reopened

* Timeout 60 s (Decisión PO 8.1 #9).
* `AnthropicProvider` solo stub (Decisión PO 8.1 #15).
* HITL obligatorio (`status='pending'` inicial; sin efectos colaterales).
* Endpoint canónico `POST /api/v1/events/:eventId/ai/event-plan`.
* Status enum canónico de `AIRecommendation`.
* Rate limit `SEC-POL-AI-007` (20/usuario/hora).
* Frontend nunca llama directo al LLM.

### What must not be implemented

* Aceptación/edición/descarte del plan (US-025).
* Regeneración con feedback (US-026).
* Checklist IA (US-018).
* RAG, vector DB, chatbot conversacional, generación de imágenes IA.
* `AnthropicProvider` operativo.
* Cap por evento de regeneraciones distinto al global.

### Assumptions to preserve

* `Event.owner_user_id` y `Event.currency_code` son inmutables.
* `ai_recommendations` admite múltiples registros por `(event_id, type)` (regeneraciones).
* `MockAIProvider` siempre disponible para tests/demo.
* Seed provee al menos un evento por idioma.

---

## 19. Task Generation Notes

### Suggested task groups

* AI: registro de prompt, extensión Mock, integración OpenAI, validador, fallback.
* BE: use case, controller, repos, middlewares.
* API: schema Zod, contrato y mapping de errores.
* SEC: rate limit aplicado y verificado; Secrets Manager.
* FE: página, componentes, hook, cliente, i18n, a11y.
* OBS: logs estructurados, métricas, correlation id.
* QA: unit, integration, AI tests, autorización, E2E, a11y.
* SEED: verificación de prompt y eventos demo por idioma.
* DOC: snapshot OpenAPI (US-098) y aclaración en `/docs/7`.

### Required QA tasks

* Suite IA con `MockAIProvider`.
* Tests de timeout (con `Clock` injectable o mock de `Promise.race`).
* Tests de retry de validación JSON.
* Tests de rate limit.
* E2E + a11y.

### Required security tasks

* Verificación de rate limit (`SEC-POL-AI-007`).
* No exposición de claves; redacción de PII.

### Required seed/demo tasks

* Verificación de `EventPlanPrompt v1` y eventos por idioma.

### Required documentation tasks

* Coordinar con US-098 para snapshot OpenAPI.
* Aclaración en `/docs/7` sobre cap MVP.

### Dependencies between tasks

* FE depende de BE/API (MSW desbloquea FE en local).
* QA E2E depende de FE + seed + Mock.
* SEC depende de BE-controller + middleware aplicado.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

* PB-P1-011 tiene una sola US; no se requiere `tasks.md` consolidado.

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

**Ready for Task Breakdown.** US aprobada, mapeo a PB-P1-011 confirmado, decisiones formalizadas (PO 8.1 #9, #15; HITL BR-AI-001..006; rate limit SEC-POL-AI-007; endpoint canónico; status enum). Arquitectura cubierta por fundación IA existente sin migraciones nuevas. Las alineaciones documentales (OpenAPI vía US-098 y aclaración en `/docs/7`) se atienden como tareas ligeras posteriores y no bloquean el breakdown.
