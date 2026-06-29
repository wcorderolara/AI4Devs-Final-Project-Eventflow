# Technical Specification — US-020: Categorías IA priorizadas (AI-004)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-020 |
| Source User Story | `management/user-stories/US-020-ai-recommended-categories.md` |
| Decision Resolution Artifact | No aplica (decisiones PO ya formalizadas: 8.1 #9, #15) |
| Priority | P1 |
| Backlog ID | PB-P1-014 |
| Backlog Title | AI Categorías priorizadas (AI-004) |
| Backlog Execution Order | 32 (P0: 18 + posición 14 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-020 |
| Epic | EPIC-AIP-001 — AI-Assisted Event Planning |
| Backlog Item Dependencies | PB-P1-011, PB-P1-006, PB-P0-009, PB-P0-010, PB-P0-011, PB-P0-007, PB-P0-014, PB-P1-019 |
| Feature | AI-004 — Categorías priorizadas |
| Module / Domain | AI / Vendors |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-014 — AI Categorías priorizadas. Habilita el flujo informativo IA-004 que recomienda `ServiceCategory.code` priorizados para iniciar la búsqueda de vendors. Depende de la fundación IA (PB-P0-009..011 + PB-P1-011) y del catálogo activo (PB-P1-019). Conecta con el directorio de vendors (US-045) vía click-through.

### Execution Order Rationale

Se ejecuta tras US-017/018/019 reutilizando toda la fundación IA. No bloquea otras US y aporta tracción a US-045 (directorio) y al embudo de `QuoteRequest`.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-020 | Generación informativa de categorías priorizadas con HITL | 1 |

---

## 3. Executive Technical Summary

Implementar `POST /api/v1/events/:eventId/ai/vendor-categories` que orquesta `GenerateVendorCategoriesUseCase`: valida ownership y estado del evento, obtiene `ServiceCategory.is_active=true` (`code`), invoca `LLMProvider` con `VendorCategoriesPrompt v1`, valida el JSON con Zod (`priority_score ∈ [0,1]`, `reason ≤ 240` caracteres) con 1 reintento, **filtra** la salida contra los códigos activos (omitiendo desconocidos/inactivos y logueando), persiste `AIRecommendation { type='vendor_categories', status='pending' }` con el JSON filtrado y devuelve `200` con `categories[]` ordenado por `priority_score` desc. **No** crea entidades downstream (`FR-AI-012`). Aplica rate limit `SEC-POL-AI-007`. Fallback determinista en demo. Toda invocación —exitosa o no— persiste `AIRecommendation` con metadata canónica. El frontend implementa la sección "Recomendado para ti" embebida en el dashboard `/[locale]/organizer/events/:id`, con `AIRecommendedCategories` (lista accesible), badge "Sugerido por IA" reusado y click-through a `/[locale]/organizer/vendors?category=<code>&city=<city>` (alineado con US-045) + telemetría `ai.vendor-categories.clicked`.

---

## 4. Scope Boundary

### In Scope

* `POST /api/v1/events/:eventId/ai/vendor-categories` con ownership + rate limit.
* `GenerateVendorCategoriesUseCase` (validación Zod + filtro contra catálogo activo + retry + persistencia).
* Registro de `VendorCategoriesPrompt v1` en `ai_prompt_versions` + catálogo de código.
* Extensión de `MockAIProvider` con respuesta determinista por idioma para `vendor_categories`, anclada a `service_categories_active`.
* Persistencia transaccional de `AIRecommendation` (éxito y falla).
* Logging estructurado `ai.vendor-categories.*` (incluye `unknown_category` para enriquecimiento offline) con `correlation_id` y métricas.
* Sección embebida `AIRecommendedCategories` en dashboard `/[locale]/organizer/events/:id` con click-through canónico + telemetría.
* i18n para 4 locales.
* Suite de pruebas funcional, IA, autorización, rate limit, filtrado y a11y.

### Out of Scope

* Recomendación de proveedores específicos o creación de `QuoteRequest` (US-045/US-049 y siguientes).
* Persistencia de feedback "no relevante" por categoría.
* Enriquecimiento automático del catálogo `ServiceCategory` desde IA.
* `AnthropicProvider` operativo.
* Regeneración con feedback dedicado (US-026).

### Explicit Non-Goals

* No tocar `service_categories` (escritura) ni `quote_requests`.
* No introducir migraciones nuevas.
* No introducir nuevos enums (`type='vendor_categories'` ya existe).
* No introducir nuevos middlewares de rate limit (reutiliza el de PB-P0-007).

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Interface: `AIVendorCategoriesController.generate`.
* Capa Application: `GenerateVendorCategoriesUseCase`, `VendorCategoriesOutputValidator` (Zod), `VendorCategoriesFilter` (filtro contra catálogo activo), `VendorCategoriesAssembler`.
* Capa Domain: `Event` (read), `AIRecommendation` (creación), `AIPromptVersion` (lookup), `ServiceCategory` (lookup activos), `LLMProvider` port.
* Capa Infrastructure: `OpenAIProvider`, `MockAIProvider` (extensión `vendor_categories`), `AIRecommendationPrismaRepository`, `AIPromptVersionPrismaRepository`, `ServiceCategoryPrismaRepository.listActive` (reuso de US-019), `EventPrismaRepository.findOwnedById` (reuso de US-017).
* Cross-cutting: `requireAuth`, `requireRole('organizer')`, ownership guard, `aiRateLimitMiddleware`, `withCorrelationId`, error mapper unificado.
* Transacción: insert de `AIRecommendation` dentro de `prisma.$transaction` (sin tocar otras entidades).

### Frontend Architecture

* Next.js App Router; client component para la sección `AIRecommendedCategories` embebida en el dashboard.
* `useGenerateAIVendorCategories` (TanStack `useMutation`).
* Reuso de `AIBadge` (US-017); nuevo `AICategoryCard` con link al directorio.
* `next-intl` para 4 locales.

### Database Architecture

* Tablas afectadas (sin cambios estructurales):
  * `ai_recommendations` (insert, `type='vendor_categories'`).
  * `ai_prompt_versions` (read; semilla de `VendorCategoriesPrompt v1`).
  * `events` (read).
  * `service_categories` (read; `is_active=true`).
* Reutiliza enums (`ai_recommendation_status`, `ai_recommendation_type`).
* Reutiliza índices entregados por PB-P0-001 / US-101.

### API Architecture

* REST JSON `/api/v1` (`ADR-API-001`).
* `POST /api/v1/events/:eventId/ai/vendor-categories`.
* Respuestas: `200`, `400`, `401`, `403`, `404`, `409`, `429`, `5xx` con envelope unificado.

### AI / PromptOps Architecture

* Prompt: `VendorCategoriesPrompt v1` en `prompts/VendorCategoriesPrompt/v1.yaml` + registro en `ai_prompt_versions`.
* Reuso del port `LLMProvider`.
* Selección de provider por env (`LLM_PROVIDER`, `AI_DEMO_MODE`).
* Reintento de validación: 1 sola vez si falla Zod o si la lista queda vacía tras filtro.
* Persistencia siempre (éxito y falla), dentro de transacción.

### Security Architecture

* Backend como source of truth; cookies HTTP-Only signed (`ADR-SEC-002`).
* RBAC `requireRole('organizer')` + ownership guard.
* Rate limit `SEC-POL-AI-007` (20/usuario/hora).
* `OPENAI_API_KEY` solo en backend vía Secrets Manager.
* Redacción de PII en logs.

### Testing Architecture

* Unit: use case + validator + filtro + assembler + providers.
* Integration: endpoint contra BD test + `MockAIProvider`.
* AI tests: timeout, retry, fallback, rate limit, lista vacía tras filtro.
* Autorización: AUTH-TS-01..05 + matriz NT.
* E2E Playwright con seed (incluye click-through al directorio).
* A11y con axe sobre la sección embebida.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Lista con HITL pending | Pipeline: ownership → estado → lookup prompt + categorías activas → LLM → validar → filtrar → persistir `AIRecommendation(pending)` → `200` ordenado por `priority_score` desc. | Backend, DB, API, Frontend |
| AC-02: Idioma respetado | Payload incluye `language_code`; `MockAIProvider` por idioma; persistir `language_code`. | Backend, AI, DB |
| AC-03: Trazabilidad | Insert con metadata canónica completa. | Backend, DB, OBS |
| AC-04: Click-through canónico + telemetría | Componente navega a `/[locale]/organizer/vendors?category=<code>&city=<city>`; cliente emite log `ai.vendor-categories.clicked` con `service_category_code` y `correlation_id`. | Frontend, OBS |
| EC-01: Categoría desconocida → omitir + log | `VendorCategoriesFilter` omite y emite `ai.vendor-categories.unknown_category`. | Backend, OBS |
| EC-02: Lista vacía tras filtro | Retry; si persiste, `AI_INVALID_OUTPUT` + `failed`. | Backend |
| EC-03: Timeout | Prod vs demo (fallback Mock + `fallback_used=true`). | Backend, AI |
| EC-04: Provider error | Fallback demo / error prod. | Backend, AI |
| EC-05: Rate limit | Middleware → `429` + `Retry-After`. | Backend, Security |
| VR-01..06 | Validación Zod + invariantes + chequeo de estado. | Backend, API |
| SEC-01..06 | Middlewares + Secrets Manager + redacción PII. | Backend, Security, OPS |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/ai/vendor-categories/`:
  * `interface/AIVendorCategoriesController.ts`
  * `application/GenerateVendorCategoriesUseCase.ts`
  * `application/VendorCategoriesOutputValidator.ts`
  * `application/VendorCategoriesFilter.ts`
  * `application/VendorCategoriesAssembler.ts`
  * `infrastructure/prompts/vendor-categories.v1.yaml`
* Reuso de `modules/ai/llm-provider/`, `modules/ai/prompt-registry/`, `modules/ai/recommendations/` (US-017).
* Reuso de `EventPrismaRepository.findOwnedById` (US-017) y `ServiceCategoryPrismaRepository.listActive` (US-019).

### Use Cases / Application Services

* `GenerateVendorCategoriesUseCase.execute({ eventId, actor, correlationId })`:
  1. `EventRepository.findOwnedById(eventId, actor.id)` → `Event | null`.
  2. Validar estado (`draft|active`) → `409 CONFLICT` si no.
  3. `ServiceCategoryRepository.listActive()` → `string[]` (códigos activos).
  4. `AIPromptVersionRepository.findActiveByPromptKey('VendorCategoriesPrompt')`.
  5. `LLMProvider.generateStructured(prompt, payload, VendorCategoriesSchema, { timeoutMs: 60_000 })`.
  6. Retry una vez si falla Zod o si la lista filtrada queda vacía.
  7. `VendorCategoriesFilter.filter(categories, activeCodes)` → omite desconocidos/inactivos; emite `ai.vendor-categories.unknown_category` por cada omisión.
  8. Si tras filtro la lista queda vacía y ya se reintentó → `AI_INVALID_OUTPUT` + `failed`.
  9. Fallback Mock en demo ante timeout/provider error.
  10. Ordenar por `priority_score` desc.
  11. Insert `AIRecommendation { type='vendor_categories', status='pending', ... }` dentro de `prisma.$transaction`.
  12. Retornar `VendorCategoriesResponseDTO`.

* `VendorCategoriesOutputValidator`: Zod + `superRefine` (rango y longitud).
* `VendorCategoriesFilter.filter(rawCategories, activeCodes): { kept: Category[], unknown: string[] }`: puro y testeable.
* `VendorCategoriesAssembler`: mapeo a `VendorCategoriesResponseDTO`.

### Controllers / Routes

* `AIVendorCategoriesController.generate`: stack `requireAuth`, `requireRole('organizer')`, `validateParams`, `aiRateLimitMiddleware`, `withCorrelationId`; mapping de errores.

### DTOs / Schemas

* `eventVendorCategoriesParamsSchema`: `{ eventId: z.string().uuid() }`.
* `VendorCategoriesInputSchema` (payload del prompt):
  ```ts
  z.object({
    event_type_code: z.string(),
    guest_count: z.number().int().positive(),
    budget_estimated: z.number().nonnegative(),
    currency_code: z.string().length(3),
    city: z.string().min(1),
    language_code: z.enum(['es','en','pt','fr']),
    service_categories_active: z.array(z.string()).min(1)
  }).strict()
  ```
* `VendorCategoriesSchema` (output IA):
  ```ts
  z.object({
    categories: z.array(z.object({
      service_category_code: z.string().min(1),
      name: z.string().min(1),
      priority_score: z.number().min(0).max(1),
      reason: z.string().min(1).max(240)
    })).min(1)
  }).strict()
  ```
  Validación cruzada con `service_categories_active` aplicada en el filtro (`VendorCategoriesFilter`).
* `VendorCategoriesResponseDTO`: `{ recommendation: { id, type, status, edited, created_at, prompt_version_id, llm_provider, language_code, latency_ms, fallback_used, timeout_ms }, categories: [{ service_category_code, name, priority_score, reason }] }` (ordenado desc).

### Repository / Persistence

* `EventPrismaRepository.findOwnedById` (reuso US-017).
* `ServiceCategoryPrismaRepository.listActive` (reuso US-019).
* `AIRecommendationPrismaRepository.create` (compartido).
* `AIPromptVersionPrismaRepository.findActiveByPromptKey` (compartido).

### Validation Rules

* VR-01..06 mapeados como `400`/`409`/filtrado interno.

### Error Handling

* Mismo set que US-017/018/019: `NotFoundError`, `ForbiddenError`, `ConflictError`, `ZodError`, `AIRateLimitError`, `AITimeoutError`, `AIInvalidOutputError`, `AIProviderError`.

### Transactions

* `prisma.$transaction` envuelve solo el insert de `AIRecommendation`.

### Observability

* Logs `ai.vendor-categories.*` incluyendo `unknown_category` (cada omisión) y `clicked` (telemetría del front).
* Métricas: contadores por `provider`, `fallback_used`, `result`, `unknown_category_count`; histograma de latencia.

---

## 8. Frontend Technical Design

### Routes / Pages

* Sección embebida en `/[locale]/organizer/events/[id]/page.tsx`.

### Components

* `AIRecommendedCategories`: contenedor con CTA + lista.
* `AICategoryCard`: tarjeta por categoría con badge "Sugerido por IA" y CTA.
* `AIBadge` (reusado).

### Forms

No aplica.

### State Management

* `useGenerateAIVendorCategories(eventId)` (TanStack `useMutation`).
* `queryKey: ['ai','event', eventId, 'vendor-categories']`.

### Data Fetching

* `aiApi.generateVendorCategories(eventId)` con cookie auth.

### Loading / Empty / Error / Success States

* Empty: CTA "Generar recomendaciones IA".
* Loading: skeleton + "Puede tomar hasta 60 segundos." (`aria-live="polite"`).
* Error: banner por `error.code` (`AI_TIMEOUT`, `AI_INVALID_OUTPUT`, `AI_PROVIDER_ERROR`, `RATE_LIMITED`, `VALIDATION`, `CONFLICT`).
* Success: lista visible con badge; click navega al directorio con filtros prearmados.

### Accessibility

* Lista con `role="list"` y `<li>`.
* Cada `AICategoryCard` es un `<a>` con `aria-label` descriptivo (categoría + razón).
* `aria-live="polite"` para anuncios de generación.
* Contraste WCAG AA en badges.

### i18n

* Claves `ai.vendorCategories.*` (badges, banners, headings, errores) en 4 locales.

### Telemetría

* `useEffect` o handler `onClick` emite `ai.vendor-categories.clicked` con `service_category_code`, `event_id`, `correlation_id` vía cliente de telemetría existente.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:eventId/ai/vendor-categories` | Generar lista priorizada de categorías IA | Yes — Organizer dueño | Path: `eventId: uuid`. Body vacío. | `200 OK` con `VendorCategoriesResponseDTO`. Header `x-correlation-id`. | `400 VALIDATION`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 EVENT_NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED` (con `Retry-After`), `5xx AI_TIMEOUT`/`AI_INVALID_OUTPUT`/`AI_PROVIDER_ERROR`. |

Documentation Alignment Required: regenerar snapshot OpenAPI vía US-098.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (read), `AIRecommendation` (insert), `AIPromptVersion` (read), `ServiceCategory` (read).

### Fields / Columns

* `ai_recommendations.type='vendor_categories'`, demás metadata canónica.

### Relations

* `ai_recommendations.event_id → events.id`.
* `ai_recommendations.prompt_version_id → ai_prompt_versions.id`.

### Indexes

* Sin nuevos índices.

### Constraints

* Enum `ai_recommendation_type` ya incluye `'vendor_categories'`.

### Migrations Impact

* Sin migraciones nuevas.
* Semilla del prompt vía registry US-121.

### Seed Impact

* Sembrar `VendorCategoriesPrompt v1` y asegurar al menos un evento por idioma con datos completos.

---

## 11. AI / PromptOps Design

### AI Feature

AI-004 — Categorías priorizadas.

### Provider

`OpenAIProvider` / `MockAIProvider` / `AnthropicProvider` stub.

### Prompt Version

* Key: `VendorCategoriesPrompt`.
* Versión: `v1`.

### Input Schema

`VendorCategoriesInputSchema` (§7), con `service_categories_active` anclado.

### Output Schema

`VendorCategoriesSchema` (§7).

### Human-in-the-loop

* `AIRecommendation.status='pending'` y `edited=false`.
* No se crean entidades downstream sin acción humana (`FR-AI-012`).

### Fallback

* Demo: timeout/provider error → `MockAIProvider`.
* Prod: error explícito.

### Persistence

* Siempre persistir `AIRecommendation` con metadata, incluso en falla.

### Safety Rules

* Sin decisiones autónomas.
* Sin RAG.
* Redacción de PII.

---

## 12. Security & Authorization Design

### Authentication

Cookie HTTP-Only signed (`ADR-SEC-002`).

### Authorization

`requireRole('organizer')` + ownership guard.

### Ownership Rules

`event.owner_user_id === actor.id`.

### Role Rules

* Organizer dueño → `200`.
* Otros → `403`/`401`.

### Negative Authorization Scenarios

* Organizer no dueño, vendor, admin → `403`.
* Anónimo → `401`.
* Exceso de rate → `429`.

### Audit Requirements

* No `AdminAction`.
* `AIRecommendation` actúa como audit trail.

### Sensitive Data Handling

* PII redactada; secretos solo en backend.

---

## 13. Testing Strategy

### Unit Tests

* `GenerateVendorCategoriesUseCase` con repos/provider mockeados (happy + ramas de error).
* `VendorCategoriesOutputValidator` (rango, longitud).
* `VendorCategoriesFilter` (omisión de desconocidos/inactivos, conteo).
* `VendorCategoriesAssembler` (orden desc).

### Integration Tests

* TS-01 happy + filtrado contra catálogo + persistencia.
* TS-02 verificación de campos persistidos.
* TS-03 `language_code='pt'` → contenido pt.
* TS-04 categoría desconocida → omitida + log.

### API Tests

* NT-01..07 (matriz negativa).
* AUTH-TS-01..05.

### E2E Tests

* TS-05: organizer ve recomendaciones y navega al directorio con filtros (Playwright + seed + Mock).

### Security Tests

* AI-TS-07: rate limit → `429` + `Retry-After`.

### Accessibility Tests

* axe sobre la sección embebida en el dashboard.

### AI Tests

* AI-TS-01..06.

### Seed / Demo Tests

* Verificar `VendorCategoriesPrompt v1` y eventos por idioma con datos completos.

### CI Checks

* Quality gates de PB-P1-024 / US-132.

---

## 14. Observability & Audit

### Logs

* `ai.vendor-categories.requested|generated|failed|fallback|unknown_category|clicked`.

### Correlation ID

* Propagación al log y al `AIRecommendation`.

### AdminAction

No aplica.

### Error Tracking

* Errores no controlados al pipeline estándar.

### Metrics

* Contadores y latencia (NFR-OBS-001).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* `VendorCategoriesPrompt v1` activo.
* Eventos por idioma con datos completos para demo.
* Catálogo `service_categories` cargado (PB-P1-019).

### Demo Scenario Supported

* "Organizer ve recomendaciones IA y entra al directorio con filtros prearmados".

### Reset / Isolation Notes

* `ai_recommendations` se truncate en reset demo; `service_categories` y `ai_prompt_versions` se conservan.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/16-API-Design-Specification.md` | Confirmar snapshot OpenAPI. | Endpoint canónico documentado. | Regenerar snapshot vía US-098. | No |
| `/docs/8-Use-Cases-Specification.md` | `UC-AI-004` se describe como distribución de presupuesto; backlog y `/docs/9` lo mapean a AI-004 (categorías). | Mantener mapeo del FRD. | Aclaración liviana en `/docs/8`. | No |
| `/docs/7-AI-Features-Specification.md` | Invariantes del output (`priority_score ∈ [0,1]`, `reason ≤ 240`, filtro estricto) no explícitas. | Implementación las enforced. | Registrar en `/docs/7`. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LLM devuelve solo categorías inactivas/desconocidas | Lista vacía tras filtro. | Anclaje en prompt + retry; tests específicos. |
| `priority_score` fuera de rango o `reason` muy largo | Validación falla. | Validator estricto + tests. |
| Cambios en el catálogo `ServiceCategory` durante la sesión | Inconsistencia. | Captura del snapshot al inicio del use case. |
| Latencia LLM cercana al timeout | Timeouts. | Métricas + fallback Mock solo en demo. |
| CTR inflado por bots o clicks accidentales | Métricas engañosas. | Telemetría con `correlation_id` + dedupe en analítica. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/modules/ai/vendor-categories/interface/AIVendorCategoriesController.ts`
  * `apps/api/src/modules/ai/vendor-categories/application/GenerateVendorCategoriesUseCase.ts`
  * `apps/api/src/modules/ai/vendor-categories/application/VendorCategoriesOutputValidator.ts`
  * `apps/api/src/modules/ai/vendor-categories/application/VendorCategoriesFilter.ts`
  * `apps/api/src/modules/ai/vendor-categories/application/VendorCategoriesAssembler.ts`
  * `apps/api/src/modules/ai/vendor-categories/infrastructure/prompts/vendor-categories.v1.yaml`
  * `apps/api/src/modules/ai/llm-provider/MockAIProvider.vendorCategories.ts` (extensión)
  * `apps/api/src/routes/events/ai.routes.ts` (alta de la ruta)
* Frontend:
  * `apps/web/src/features/ai/vendor-categories/components/AIRecommendedCategories.tsx`
  * `apps/web/src/features/ai/vendor-categories/components/AICategoryCard.tsx`
  * `apps/web/src/features/ai/vendor-categories/hooks/useGenerateAIVendorCategories.ts`
  * `apps/web/src/features/ai/vendor-categories/api/aiApi.generateVendorCategories.ts`
  * Integración en `apps/web/src/app/[locale]/organizer/events/[id]/page.tsx`
  * `apps/web/src/i18n/messages/{es,en,pt,fr}/ai.vendor-categories.json`
  * Cliente de telemetría `ai.vendor-categories.clicked`

(Rutas exactas según convención feature-first.)

### Recommended order of implementation

1. Verificar fundación IA, rate limit y `ServiceCategoryRepository.listActive`.
2. Registrar `VendorCategoriesPrompt v1`.
3. Extender `MockAIProvider` por idioma con `service_categories_active`.
4. Implementar validator + filter + assembler.
5. Implementar use case.
6. Implementar controlador + middlewares + rate limit + error mapping.
7. Tests unitarios y de integración.
8. Implementar cliente, hook, componentes UI y integración en dashboard.
9. i18n + a11y + telemetría de click.
10. E2E con seed (incluye click-through al directorio).

### Decisions that must not be reopened

* Timeout 60 s; AnthropicProvider stub; HITL solo `AIRecommendation`; endpoint canónico; `type='vendor_categories'`; status enum; rate limit `SEC-POL-AI-007`; filtro estricto contra catálogo activo; click-through canónico.

### What must not be implemented

* Recomendación de vendors específicos ni creación de `QuoteRequest`.
* Feedback "no relevante" persistente.
* Enriquecimiento automático del catálogo.
* `AnthropicProvider` operativo.
* RAG / chatbot.

### Assumptions to preserve

* `ServiceCategory` provee catálogo curado con `is_active`.
* `MockAIProvider` siempre disponible.
* Dashboard del evento existe (PB-P1-014 surface).

---

## 19. Task Generation Notes

### Suggested task groups

* AI: prompt, Mock, validator, filter.
* BE: use case, controller, repos, assembler.
* API: schemas Zod y envelope.
* SEC: rate limit; Secrets/PII.
* FE: componentes embebidos, hook, cliente, i18n, a11y, telemetría click.
* OBS: logs (incluye `unknown_category` y `clicked`), métricas, correlation ID.
* QA: unit, integration, AI behaviors, autorización/rate limit, E2E, a11y.
* SEED: prompt + eventos por idioma + catálogo activo.
* DOC: snapshot OpenAPI (US-098) + aclaración `/docs/8` y `/docs/7`.

### Required QA tasks

* Suite IA con Mock; tests de filtro (omisión); rate limit; E2E click-through; a11y.

### Required security tasks

* Rate limit; Secrets/PII.

### Required seed/demo tasks

* Verificación de prompt y catálogo activo en seed.

### Required documentation tasks

* OpenAPI vía US-098; aclaración `/docs/8` y `/docs/7`.

### Dependencies between tasks

* FE depende de BE/API (MSW en local).
* QA E2E depende de FE + seed + Mock.
* SEC depende de BE-controller + middleware.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

* PB-P1-014 tiene una sola US; no se requiere `tasks.md` consolidado.

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

**Ready for Task Breakdown.** US aprobada, mapeo a PB-P1-014 confirmado, decisiones formalizadas, arquitectura cubierta por la fundación IA sin migraciones nuevas. Las alineaciones documentales (`/docs/16`, `/docs/8`, `/docs/7`) se atienden como tareas ligeras y no bloquean el breakdown.
