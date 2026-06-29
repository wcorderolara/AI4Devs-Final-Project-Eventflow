# Technical Specification — US-019: Sugerencia IA de distribución de presupuesto (AI-003)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-019 |
| Source User Story | `management/user-stories/US-019-ai-budget-distribution.md` |
| Decision Resolution Artifact | No aplica (decisiones PO ya formalizadas: 8.1 #7, #9, #15) |
| Priority | P1 |
| Backlog ID | PB-P1-013 |
| Backlog Title | Sugerencia IA de distribución de presupuesto por categoría |
| Backlog Execution Order | 31 (P0: 18 + posición 13 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-019 |
| Epic | EPIC-AIP-001 — AI-Assisted Event Planning |
| Backlog Item Dependencies | PB-P1-011, PB-P1-019, PB-P0-009, PB-P0-010, PB-P0-011, PB-P0-007, PB-P0-014 |
| Feature | AI-003 — Distribución de presupuesto IA |
| Module / Domain | AI / Budget |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-013 — Sugerencia IA de distribución de presupuesto por categoría. Depende de PB-P1-011 (fundación AI-001 y rate limit aplicado), PB-P1-019 (cálculo de totales del presupuesto), PB-P0-009..011 (fundación IA), PB-P0-007 (rate limit IA), PB-P0-014 (observabilidad IA). La aplicación de la distribución (`BudgetItem(ai_generated=true)`) y la edición previa a aceptar se cubren en US-037 / PB-P1-020.

### Execution Order Rationale

Se ejecuta tras US-017/US-018 reutilizando toda la fundación IA. Habilita el flujo financiero IA-003 → US-037 (aplicación), sin tocar `budget_items` en esta US.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-019 | Generación inicial de la distribución con HITL pending | 1 |

---

## 3. Executive Technical Summary

Implementar `POST /api/v1/events/:eventId/ai/budget-suggestion` que orquesta `GenerateBudgetSuggestionUseCase`: valida ownership y `budget_estimated > 0`, obtiene los `ServiceCategory.code` activos, invoca `LLMProvider` con `BudgetSuggestionPrompt v1`, valida el JSON con Zod (incluyendo invariante `Σ percentage = 100 ±0.01` y mapeo a categorías activas) con un único reintento, persiste `AIRecommendation { type='budget_suggestion', status='pending' }` y devuelve la distribución con `amount = round(percentage/100 * budget_estimated)`. **No** crea ni modifica `BudgetItem` (ese paso vive en US-037). Aplica rate limit `SEC-POL-AI-007`. Fallback determinista en demo. Toda invocación —exitosa o no— persiste `AIRecommendation` con metadata canónica (`prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`). El frontend implementa `/[locale]/organizer/events/:id/ai/budget` con `AIBudgetSuggestion` y `AIBudgetViewer` (tabla accesible con `<caption>`/headers), badge "Sugerido por IA", manejo de estados, i18n y a11y. Reusa `AIBadge` y la pila de error mapper introducidos por US-017.

---

## 4. Scope Boundary

### In Scope

* `POST /api/v1/events/:eventId/ai/budget-suggestion` con ownership + rate limit.
* `GenerateBudgetSuggestionUseCase` (validación Zod estricta con invariantes, retry, persistencia).
* Registro de `BudgetSuggestionPrompt v1` en `ai_prompt_versions` + catálogo de código.
* Extensión de `MockAIProvider` con respuesta determinista por idioma/moneda para `budget_suggestion`.
* Persistencia transaccional de `AIRecommendation` (éxito y falla).
* Logging estructurado `ai.budget-suggestion.*` con `correlation_id` y métricas.
* Página `/[locale]/organizer/events/:id/ai/budget` con componentes accesibles.
* i18n para 4 locales.
* Suite de pruebas funcional, IA (suma=100, categorías), autorización, rate limit y a11y.

### Out of Scope

* Aceptación de la distribución y materialización de `BudgetItem` (US-037 / PB-P1-020).
* Edición previa a aceptar y CRUD individual de items (US-037, US-036).
* Conversión automática de moneda.
* Regeneración con feedback dedicado (US-026).
* `AnthropicProvider` operativo.

### Explicit Non-Goals

* No tocar `budget_items` ni `budgets` (escritura) en esta US.
* No introducir migraciones nuevas.
* No introducir nuevos enums (`type='budget_suggestion'` ya existe).
* No introducir nuevos middlewares de rate limit (reutiliza el de PB-P0-007).

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Interface: `AIBudgetSuggestionController.generate`.
* Capa Application: `GenerateBudgetSuggestionUseCase`, `BudgetSuggestionOutputValidator` (Zod + invariantes), `BudgetSuggestionAssembler`.
* Capa Domain: `Event` (read), `Budget` (read), `AIRecommendation` (creación), `AIPromptVersion` (lookup), `ServiceCategory` (lookup activos), `LLMProvider` port.
* Capa Infrastructure: `OpenAIProvider`, `MockAIProvider` (extensión `budget_suggestion`), `AIRecommendationPrismaRepository`, `AIPromptVersionPrismaRepository`, `ServiceCategoryPrismaRepository.listActive`, `EventPrismaRepository.findOwnedById` (reusado).
* Cross-cutting: `requireAuth`, `requireRole('organizer')`, ownership guard, `aiRateLimitMiddleware`, `withCorrelationId`, error mapper unificado.
* Transacción: insert de `AIRecommendation` dentro de `prisma.$transaction` (sin tocar `budget_items`).

### Frontend Architecture

* Next.js App Router; client component para `AIBudgetSuggestion`.
* `useGenerateAIBudget` (TanStack `useMutation`).
* Reuso de `AIBadge` (US-017); nuevo `AIBudgetViewer` con tabla accesible.
* `next-intl` para 4 locales.

### Database Architecture

* Tablas afectadas (sin cambios estructurales):
  * `ai_recommendations` (insert, `type='budget_suggestion'`).
  * `ai_prompt_versions` (read; semilla de `BudgetSuggestionPrompt v1`).
  * `events`, `budgets` (read).
  * `service_categories` (read; activos).
  * `budget_items` **no** se toca en esta US.
* Reutiliza enums (`ai_recommendation_status`, `ai_recommendation_type`).
* Reutiliza índices entregados por PB-P0-001 / US-101.

### API Architecture

* REST JSON `/api/v1` (`ADR-API-001`).
* `POST /api/v1/events/:eventId/ai/budget-suggestion`.
* Respuestas: `200`, `400`, `401`, `403`, `404`, `409`, `429`, `5xx` con envelope unificado.

### AI / PromptOps Architecture

* Prompt: `BudgetSuggestionPrompt v1` en `prompts/BudgetSuggestionPrompt/v1.yaml` + registro en `ai_prompt_versions`.
* Reuso del port `LLMProvider`.
* Selección de provider por env (`LLM_PROVIDER`, `AI_DEMO_MODE`).
* Reintento de validación: 1 sola vez si falla Zod, la invariante de suma o el mapeo de categorías.
* Persistencia siempre (éxito y falla), dentro de transacción.

### Security Architecture

* Backend como source of truth; cookies HTTP-Only signed (`ADR-SEC-002`).
* RBAC `requireRole('organizer')` + ownership guard sobre `Event`.
* Rate limit `SEC-POL-AI-007` (20/usuario/hora).
* `OPENAI_API_KEY` solo en backend vía Secrets Manager.
* Redacción de PII en logs.

### Testing Architecture

* Unit: use case + validator (suma + categorías + amounts) + assembler + provider mocks.
* Integration: endpoint contra BD test + `MockAIProvider`.
* AI tests: timeout, JSON inválido con retry, fallback Mock, rate limit, suma≠100, categoría desconocida.
* Autorización: AUTH-TS-01..05 + matriz NT.
* E2E Playwright con seed.
* A11y con axe sobre tabla de distribución.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Sugerencia con HITL pending | Pipeline: ownership → estado válido → `budget_estimated > 0` → lookup prompt + `ServiceCategory.listActive()` → `LLMProvider.generateStructured` → Zod + invariantes → persistir `AIRecommendation(pending)` → `200`. **No tocar `budget_items`**. | Backend, DB, API, Frontend |
| AC-02: Idioma y moneda | Payload del prompt incluye `language_code` y `currency_code`; `MockAIProvider` produce contenido por idioma; `amount` en moneda del evento sin conversión. | Backend, AI |
| AC-03: Trazabilidad completa | Insert con metadata canónica completa. | Backend, DB, OBS |
| AC-04: Estructura suma=100 + categorías | Validador rechaza si `Σ percentage ≠ 100` o si `service_category_code` no está en activos; `amount = round(percentage/100 * budget_estimated)` se computa en backend antes de retornar. | Backend, API |
| EC-01: `budget_estimated <= 0` | Pre-validación con `400 INVALID_BUDGET`. | Backend |
| EC-02: Suma ≠ 100% | `BudgetSuggestionOutputValidator` aplica reintento; si falla, `failed` + `5xx AI_INVALID_OUTPUT`. | Backend, AI |
| EC-03: Categoría desconocida | Idem EC-02 con post-validador por catálogo activo. | Backend, AI |
| EC-04: Timeout 60s | Política prod vs demo idéntica a US-017. | Backend, AI |
| EC-05: Provider error | Fallback demo / error prod. | Backend, AI |
| EC-06: Rate limit | Middleware → `429` + `Retry-After`. | Backend, Security |
| VR-01..07 | Validación Zod + invariantes + chequeo de estado. | Backend, API |
| SEC-01..06 | Middlewares + Secrets Manager + redacción PII. | Backend, Security, OPS |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/ai/budget-suggestion/`:
  * `interface/AIBudgetSuggestionController.ts`
  * `application/GenerateBudgetSuggestionUseCase.ts`
  * `application/BudgetSuggestionOutputValidator.ts`
  * `application/BudgetSuggestionAssembler.ts`
  * `infrastructure/prompts/budget-suggestion.v1.yaml`
* Reuso de `modules/ai/llm-provider/`, `modules/ai/prompt-registry/`, `modules/ai/recommendations/` (de US-017).
* Reuso de `EventPrismaRepository.findOwnedById` (US-017).

### Use Cases / Application Services

* `GenerateBudgetSuggestionUseCase.execute({ eventId, actor, correlationId })`:
  1. `EventRepository.findOwnedById(eventId, actor.id)` → `Event | null`.
  2. Validar estado (`draft|active`) → `Conflict` si no.
  3. Validar `budget_estimated > 0` → `400 INVALID_BUDGET` si no.
  4. `ServiceCategoryRepository.listActive()` → lista de códigos.
  5. `AIPromptVersionRepository.findActiveByPromptKey('BudgetSuggestionPrompt')`.
  6. `LLMProvider.generateStructured(prompt, payload, BudgetSuggestionSchema, { timeoutMs: 60_000 })`.
  7. Retry una vez si falla Zod, suma o catálogo; sino `failed` + `AI_INVALID_OUTPUT`.
  8. Fallback Mock en demo ante timeout/provider error; en prod, `failed` + error correspondiente.
  9. Calcular `amount` por categoría (`round(percentage/100 * budget_estimated)`).
  10. Insert `AIRecommendation { type='budget_suggestion', status='pending', ... }` dentro de `prisma.$transaction`.
  11. Retornar `BudgetSuggestionResponseDTO`.

* `BudgetSuggestionOutputValidator`: Zod + invariantes (`Σ percentage = 100 ±0.01`, `service_category_code ∈ activeCodes`).
* `BudgetSuggestionAssembler`: mapeo a `BudgetSuggestionResponseDTO` con `amount` calculado.

### Controllers / Routes

* `AIBudgetSuggestionController.generate`: stack `requireAuth`, `requireRole('organizer')`, `validateParams`, `aiRateLimitMiddleware`, `withCorrelationId`; mapping de errores.

### DTOs / Schemas

* `eventBudgetSuggestionParamsSchema`: `{ eventId: z.string().uuid() }`.
* `BudgetSuggestionInputSchema` (payload del prompt):
  ```ts
  z.object({
    event_type_code: z.string(),
    guest_count: z.number().int().positive(),
    budget_estimated: z.number().positive(),
    currency_code: z.string().length(3),
    city: z.string().min(1),
    language_code: z.enum(['es','en','pt','fr']),
    service_categories_active: z.array(z.string()).min(1)
  }).strict()
  ```
* `BudgetSuggestionSchema` (output IA):
  ```ts
  z.object({
    categories: z.array(z.object({
      name: z.string().min(1),
      service_category_code: z.string().min(1),
      percentage: z.number().min(0).max(100),
      notes: z.string().optional()
    })).min(1)
  }).strict()
  .superRefine((data, ctx) => {
    const sum = data.categories.reduce((s, c) => s + c.percentage, 0);
    if (Math.abs(sum - 100) > 0.01) ctx.addIssue({ code: 'custom', message: 'PERCENT_SUM_INVALID' });
    const dup = new Set();
    for (const c of data.categories) {
      if (dup.has(c.service_category_code)) ctx.addIssue({ code: 'custom', message: 'CATEGORY_DUPLICATED' });
      dup.add(c.service_category_code);
    }
  })
  ```
  Validación cruzada con `service_categories_active` aplicada en el validator (no en el schema, para usar contexto runtime).
* `BudgetSuggestionResponseDTO`: `{ recommendation: { id, type, status, edited, created_at, prompt_version_id, llm_provider, language_code, latency_ms, fallback_used, timeout_ms }, distribution: { currency_code, budget_estimated, categories: [{ name, service_category_code, percentage, amount, notes }] } }`.

### Repository / Persistence

* `EventPrismaRepository.findOwnedById` (reuso US-017).
* `ServiceCategoryPrismaRepository.listActive()` (read).
* `AIRecommendationPrismaRepository.create` (compartido).
* `AIPromptVersionPrismaRepository.findActiveByPromptKey` (compartido).

### Validation Rules

* VR-01..07 mapeados; suma y catálogo se aplican post-LLM en el validator.

### Error Handling

* `NotFoundError` → `404 EVENT_NOT_FOUND`.
* `ForbiddenError` → `403`.
* `ConflictError` (estado) → `409`.
* `InvalidBudgetError` → `400 INVALID_BUDGET`.
* `ZodError` / invariante → `400 VALIDATION` o `5xx AI_INVALID_OUTPUT` según fuente.
* `AIRateLimitError` → `429 RATE_LIMITED` con `Retry-After`.
* `AITimeoutError` → `5xx AI_TIMEOUT`.
* `AIProviderError` → `5xx AI_PROVIDER_ERROR`.

### Transactions

* `prisma.$transaction` envuelve solo el insert de `AIRecommendation`.

### Observability

* Logs `ai.budget-suggestion.*` con campos canónicos + `currency_code` y `budget_estimated`.
* Métricas: contadores + histograma de latencia.

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/organizer/events/[id]/ai/budget/page.tsx` (client component).

### Components

* `AIBudgetSuggestion`: contenedor + CTA.
* `AIBudgetViewer`: tabla con `<caption>`/headers; barras de porcentaje accesibles.
* `AIBadge` (reusado).
* Banners de error y rate-limit (reusados de US-017).

### Forms

No aplica.

### State Management

* `useGenerateAIBudget(eventId)` (TanStack `useMutation`).
* `queryKey: ['ai','event', eventId, 'budget-suggestion']`.

### Data Fetching

* `aiApi.generateBudgetSuggestion(eventId)` con cookie auth.

### Loading / Empty / Error / Success States

* Empty: CTA "Sugerir distribución IA".
* Loading: skeleton + "Puede tomar hasta 60 segundos." (`aria-live="polite"`).
* Error: banner por `error.code` (`INVALID_BUDGET`, `AI_TIMEOUT`, `AI_INVALID_OUTPUT`, `AI_PROVIDER_ERROR`, `RATE_LIMITED`, `VALIDATION`, `CONFLICT`).
* Success: tabla con badge + montos por categoría.

### Accessibility

* Tabla con `<caption>` semántico.
* Lectura de porcentajes y montos por screen reader.
* `aria-live="polite"` para anuncios de generación.
* Contraste WCAG AA en barras.

### i18n

* Claves `ai.budget.*` (badges, banners, headers, errores) en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:eventId/ai/budget-suggestion` | Generar sugerencia IA de distribución | Yes — Organizer dueño | Path: `eventId: uuid`. Body vacío. | `200 OK` con `BudgetSuggestionResponseDTO`. Header `x-correlation-id`. | `400 VALIDATION`/`400 INVALID_BUDGET`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 EVENT_NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED` (con `Retry-After`), `5xx AI_TIMEOUT`/`AI_INVALID_OUTPUT`/`AI_PROVIDER_ERROR`. |

Documentation Alignment Required: regenerar snapshot OpenAPI vía US-098.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (read), `Budget` (read), `AIRecommendation` (insert), `AIPromptVersion` (read), `ServiceCategory` (read).

### Fields / Columns

* `ai_recommendations.type='budget_suggestion'`, demás metadata canónica.

### Relations

* `ai_recommendations.event_id → events.id`.
* `ai_recommendations.prompt_version_id → ai_prompt_versions.id`.

### Indexes

* Sin nuevos índices.

### Constraints

* Enum `ai_recommendation_type` ya incluye `'budget_suggestion'`.

### Migrations Impact

* Sin migraciones nuevas; semilla del prompt vía registry US-121.

### Seed Impact

* Sembrar `BudgetSuggestionPrompt v1` y asegurar al menos un evento por idioma y moneda con `budget_estimated > 0`.

---

## 11. AI / PromptOps Design

### AI Feature

AI-003 — Distribución de presupuesto IA.

### Provider

`OpenAIProvider` / `MockAIProvider` / `AnthropicProvider` stub. Selección por env.

### Prompt Version

* Key: `BudgetSuggestionPrompt`.
* Versión: `v1`.
* Almacenamiento: archivo + `ai_prompt_versions`.

### Input Schema

`BudgetSuggestionInputSchema` (§7); incluye `service_categories_active` como anclaje.

### Output Schema

`BudgetSuggestionSchema` (§7) con `superRefine` para suma y duplicados.

### Human-in-the-loop

* `AIRecommendation.status='pending'` y `edited=false`.
* Materialización (`BudgetItem`) ocurre solo al aceptar (US-037).

### Fallback

* Demo: timeout/provider error → `MockAIProvider`, `fallback_used=true`.
* Prod: error explícito.

### Persistence

* Siempre persistir `AIRecommendation` con metadata, incluso en falla.

### Safety Rules

* Sin decisiones autónomas.
* Sin RAG.
* Redacción de PII en logs.

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

* `GenerateBudgetSuggestionUseCase` con repos/provider mockeados (happy + ramas de error).
* `BudgetSuggestionOutputValidator` (suma=100, categorías activas, duplicados).
* `BudgetSuggestionAssembler` (cálculo de `amount`).

### Integration Tests

* TS-01: happy + persistencia con metadata.
* TS-02: verificación de campos persistidos.
* TS-03: `language_code='pt'` + `currency_code='EUR'` → contenido pt y `amount` en EUR.

### API Tests

* NT-01..07 (incluye `budget_estimated=0`, ajeno, vendor, admin, idioma inválido, estado conflictivo, anónimo).
* AUTH-TS-01..05.

### E2E Tests

* TS-04: organizer genera distribución y la ve en pending (Playwright + seed + Mock).

### Security Tests

* AI-TS-08: rate limit excedido → `429` + `Retry-After`.

### Accessibility Tests

* axe sobre tabla de distribución.

### AI Tests

* AI-TS-01..07 (incluye suma≠100 con retry y categoría desconocida).

### Seed / Demo Tests

* Verificar `BudgetSuggestionPrompt v1` y eventos por idioma/moneda con `budget_estimated > 0`.

### CI Checks

* Quality gates de PB-P1-024 / US-132.

---

## 14. Observability & Audit

### Logs

* `ai.budget-suggestion.requested|generated|failed|fallback` con campos canónicos.

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

* `BudgetSuggestionPrompt v1` activo.
* Eventos por idioma con `currency_code` distinto (cobertura GTQ/EUR/MXN/COP/USD ideal) y `budget_estimated > 0`.

### Demo Scenario Supported

* "Organizer sugiere distribución IA": muestra tabla con porcentajes y montos en la moneda del evento, sin conversión.

### Reset / Isolation Notes

* `ai_recommendations` se truncate en reset demo.
* `ai_prompt_versions` y `service_categories` se conservan.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/16-API-Design-Specification.md` | Confirmar snapshot OpenAPI. | Endpoint canónico documentado. | Regenerar snapshot vía US-098. | No |
| `/docs/8-Use-Cases-Specification.md` | `UC-AI-003` se describe como checklist; `/docs/9` lo mapea a AI-003. | Mantener mapeo del FRD. | Aclaración liviana en `/docs/8`. | No |
| `/docs/7-AI-Features-Specification.md` | Invariante `Σ percentage = 100` no explícita. | Implementación la enforced. | Registrar invariante + mapeo a `ServiceCategory.code` activos. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LLM devuelve categorías que no están en `ServiceCategory` activos | `5xx AI_INVALID_OUTPUT` recurrentes. | Anclaje en prompt con `service_categories_active` + retry; mejora de prompt v2 si persiste (fuera de esta US). |
| Suma de porcentajes con drift de redondeo | Validación falla por flotantes. | Tolerancia ±0.01 explícita; ajuste de `amount` por suma final = `budget_estimated`. |
| Confusión con moneda al renderizar | UX errónea. | Usar `Intl.NumberFormat` con `currency_code` del evento; tests por moneda. |
| Latencia variable cercana al timeout | Timeouts en prod. | Métricas y fallback Mock solo en demo. |
| Filtración de PII en logs | Cumplimiento. | Redactor centralizado + verificación. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/modules/ai/budget-suggestion/interface/AIBudgetSuggestionController.ts`
  * `apps/api/src/modules/ai/budget-suggestion/application/GenerateBudgetSuggestionUseCase.ts`
  * `apps/api/src/modules/ai/budget-suggestion/application/BudgetSuggestionOutputValidator.ts`
  * `apps/api/src/modules/ai/budget-suggestion/application/BudgetSuggestionAssembler.ts`
  * `apps/api/src/modules/ai/budget-suggestion/infrastructure/prompts/budget-suggestion.v1.yaml`
  * `apps/api/src/modules/ai/llm-provider/MockAIProvider.budgetSuggestion.ts` (extensión)
  * `apps/api/src/routes/events/ai.routes.ts` (alta de la ruta)
* Frontend:
  * `apps/web/src/app/[locale]/organizer/events/[id]/ai/budget/page.tsx`
  * `apps/web/src/features/ai/budget-suggestion/components/AIBudgetSuggestion.tsx`
  * `apps/web/src/features/ai/budget-suggestion/components/AIBudgetViewer.tsx`
  * `apps/web/src/features/ai/budget-suggestion/hooks/useGenerateAIBudget.ts`
  * `apps/web/src/features/ai/budget-suggestion/api/aiApi.generateBudgetSuggestion.ts`
  * `apps/web/src/i18n/messages/{es,en,pt,fr}/ai.budget.json`

(Rutas exactas según convención feature-first.)

### Recommended order of implementation

1. Verificar fundación IA y rate limit; verificar `ServiceCategoryRepository.listActive`.
2. Registrar `BudgetSuggestionPrompt v1`.
3. Extender `MockAIProvider` con fixture determinista por idioma y moneda.
4. Implementar validator (Zod + invariantes), assembler con `amount`.
5. Implementar use case.
6. Implementar controlador + middlewares + rate limit + error mapping.
7. Tests unitarios y de integración.
8. Implementar cliente, hook, página y componentes UI.
9. i18n + a11y.
10. E2E con seed.

### Decisions that must not be reopened

* Timeout 60 s; AnthropicProvider stub; HITL solo `AIRecommendation`; endpoint canónico; `type='budget_suggestion'`; status enum; rate limit `SEC-POL-AI-007`; moneda inmutable y sin conversión; categorías canónicas = `ServiceCategory.code` activos.

### What must not be implemented

* Aceptación de la sugerencia ni `BudgetItem` (US-037).
* Edición previa a aceptar (US-037).
* CRUD de items (US-036).
* Conversión de moneda.
* RAG / chatbot.

### Assumptions to preserve

* `Event.currency_code` inmutable.
* `Budget` 1:1 con `Event`.
* `MockAIProvider` siempre disponible.
* `ServiceCategory` provee catálogo curado.

---

## 19. Task Generation Notes

### Suggested task groups

* AI: registro de prompt, extensión Mock, validator con invariantes.
* BE: use case, controller, repos, assembler.
* API: schemas Zod y envelope.
* SEC: rate limit; Secrets/PII.
* FE: página, componentes, hook, cliente, i18n, a11y.
* OBS: logs, métricas, correlation ID.
* QA: unit, integration, AI behaviors, autorización/rate limit, E2E, a11y.
* SEED: prompt + eventos por idioma/moneda con `budget_estimated > 0`.
* DOC: snapshot OpenAPI (US-098) + aclaración `/docs/8`, `/docs/7`.

### Required QA tasks

* Suite IA con Mock; tests de invariantes (suma, categorías).
* Tests de timeout/retry/fallback.
* Tests de rate limit.
* E2E + a11y (incluye tabla accesible).

### Required security tasks

* Verificación de rate limit.
* No exposición de claves; redacción PII.

### Required seed/demo tasks

* Verificación de `BudgetSuggestionPrompt v1` y eventos por idioma/moneda.

### Required documentation tasks

* Coordinar con US-098, aclarar `/docs/8` y `/docs/7`.

### Dependencies between tasks

* FE depende de BE/API (MSW en local).
* QA E2E depende de FE + seed + Mock.
* SEC depende de BE-controller + middleware.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

* PB-P1-013 tiene una sola US; no se requiere `tasks.md` consolidado.

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

**Ready for Task Breakdown.** US aprobada, mapeo a PB-P1-013 confirmado, decisiones formalizadas (PO 8.1 #7/#9/#15), arquitectura cubierta por la fundación IA sin migraciones nuevas. Las alineaciones documentales (`/docs/16`, `/docs/8`, `/docs/7`) se atienden como tareas ligeras y no bloquean el breakdown.
