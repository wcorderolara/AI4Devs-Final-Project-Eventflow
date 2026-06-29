# 🧾 User Story: Pedir sugerencia IA de distribución de presupuesto (AI-003)

## 🆔 Metadata

| Field              | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| ID                 | US-019                                                 |
| Epic               | EPIC-AIP-001 — AI-Assisted Event Planning              |
| Backlog Item       | PB-P1-013 — Sugerencia IA de distribución de presupuesto por categoría |
| UI Surface         | PB-P1-044                                              |
| Feature            | AI-003 — Distribución de presupuesto IA                |
| Module / Domain    | AI / Budget                                            |
| User Role          | Organizer                                              |
| Priority           | Must Have                                              |
| Status             | Approved                                               |
| Owner              | Product Owner / Business Analyst                       |
| Approved By        | PO/BA Review                                           |
| Approval Date      | 2026-06-26                                             |
| Ready for Development Tasks | Yes                                           |
| Sprint / Milestone | MVP                                                    |
| Created Date       | 2026-06-09                                             |
| Last Updated       | 2026-06-26                                             |

---

## 🎯 User Story

**As an** organizador con evento creado y presupuesto estimado
**I want** recibir una sugerencia IA de distribución porcentual del presupuesto por categorías típicas
**So that** tenga un baseline editable para mi presupuesto sin partir de cero

---

## 🧠 Business Context

### Context Summary

AI-003 sugiere una distribución porcentual del presupuesto entre categorías canónicas de `ServiceCategory` (catering, venue, fotografía, decoración, música, etc.) en la moneda del evento. El backend invoca al `LLMProvider` con `BudgetSuggestionPrompt v1`, valida el JSON con Zod (incluyendo que los porcentajes sumen 100 y mapeen a `ServiceCategory.code` activos) y persiste **únicamente** un `AIRecommendation { type='budget_suggestion', status='pending' }`. La materialización como `BudgetItem(ai_generated=true)` ocurre **al aceptar** en US-037 (PB-P1-020). El idioma del evento se respeta en notas y descripciones.

### Related Domain Concepts

* `AIRecommendation { type='budget_suggestion', status='pending' }`.
* `LLMProvider` (`OpenAIProvider` en prod, `MockAIProvider` en demo/tests, `AnthropicProvider` stub).
* `Budget` 1:1 con `Event`; `BudgetItem` con `ai_generated=true` (creados al aceptar en US-037).
* `ServiceCategory` (catálogo curado) como fuente de categorías válidas.

### Assumptions

* `Budget` 1:1 por `Event` (`BR-BUDGET-001`).
* Distribución total = 100% (validado por Zod).
* La moneda usada es la del evento (`BR-BUDGET-006`, inmutable); sin conversión automática (`BR-BUDGET-007`).
* Categorías sugeridas se mapean a `ServiceCategory.code` activos.
* `MockAIProvider` provee respuestas deterministas por idioma para tests/demo.

### Dependencies

* PB-P1-011 / US-017 — Fundación IA-001 (`LLMProvider`, `MockAIProvider`, prompt registry, `AIRecommendation`, rate limit aplicado).
* PB-P1-019 — Cálculo de totales del presupuesto (dependencia del backlog).
* PB-P0-009..011 — Fundación IA.
* PB-P0-007 — Rate limit IA (`SEC-POL-AI-007`).
* PB-P0-014 — Observabilidad IA.
* US-037 / PB-P1-020 — Aceptación que materializa `BudgetItem` (consumidor del `AIRecommendation` generado aquí).

---

## 🔗 Traceability

| Source                 | Reference                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-013                                                                                 |
| FRD Requirement(s)     | FR-AI-003 (distribución presupuesto), FR-AI-009 (timeout/fallback), FR-AI-011 (badge IA), FR-AI-017 (idioma) |
| Use Case(s)            | UC-AI-003                                                                                 |
| Business Rule(s)       | BR-AI-001..006 (HITL/abstracción), BR-AI-007..011 (trazabilidad, `ai_generated`, timeout, prompt versionado, idioma), BR-BUDGET-001 (1:1), BR-BUDGET-006 (moneda inmutable), BR-BUDGET-007 (sin conversión automática), BR-BUDGET-008 (sugerencia IA), BR-BUDGET-009 (edición libre) |
| Permission Rule(s)     | Ownership del evento; rate limit IA `SEC-POL-AI-007` (20/usuario/hora)                     |
| Data Entity / Entities | `Event`, `Budget`, `AIRecommendation`, `AIPromptVersion`, `ServiceCategory` (sin `BudgetItem` en esta US) |
| API Endpoint(s)        | `POST /api/v1/events/:eventId/ai/budget-suggestion`                                       |
| NFR Reference(s)       | NFR-AI-003 (timeout 60s), NFR-AI-005 (validación JSON con 1 reintento), NFR-AI-007 (`LLMProvider`), NFR-AI-008 (`MockAIProvider` determinista) |
| Related ADR(s)         | ADR-AI-001 (LLMProvider abstraction)                                                       |
| PO Decision(s)         | Decisión PO 8.1 #7 (monedas mínimas e inmutabilidad), Decisión PO 8.1 #9 (timeout/fallback), Decisión PO 8.1 #15 (Anthropic stub) |
| Related Document(s)    | `/docs/7` (AI-003), `/docs/17` (AI Architecture & PromptOps), `/docs/19` (`SEC-POL-AI-007`), `/docs/6` (`AIRecommendation.type='budget_suggestion'`, `ServiceCategory`), `/docs/18` (`ai_recommendations`, enums), `/docs/4` (`BR-AI-*`, `BR-BUDGET-*`), `/docs/8.1` (#7, #9, #15) |

---

## 🧩 PO/BA Decisions Applied

1. **Decisión PO 8.1 #7** — Monedas mínimas (`GTQ`, `EUR`, `MXN`, `COP`, `USD`); `currency_code` inmutable por evento.
2. **Decisión PO 8.1 #9** — Timeout LLM 60 s; producción error controlado, demo fallback `MockAIProvider`.
3. **Decisión PO 8.1 #15** — `AnthropicProvider` solo stub en MVP.
4. **HITL canónico (`BR-AI-001..003`)** — La generación crea solo `AIRecommendation { type='budget_suggestion', status='pending' }`; la materialización a `BudgetItem(ai_generated=true)` ocurre al aceptar en US-037.
5. **Rate limit IA global (`SEC-POL-AI-007`)** — 20 invocaciones IA por usuario por hora; `429 RATE_LIMITED` al exceder.
6. **Endpoint canónico** — `POST /api/v1/events/:eventId/ai/budget-suggestion` conforme a `/docs/16`.
7. **`AIRecommendation.type`** — Valor canónico `'budget_suggestion'`.
8. **Status enum canónico** — `(pending, accepted, rejected, discarded, failed, expired)`; `edited` boolean.
9. **Categorías sugeridas** — Mapeadas a `ServiceCategory.code` activos del catálogo curado (resuelve la nota previa sobre lista canónica).
10. **Moneda del presupuesto** — Es la del evento; sin conversión automática (`BR-BUDGET-006`, `BR-BUDGET-007`).

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Aceptación de la sugerencia (materialización como `BudgetItem`) y edición previa — pertenece a **US-037 / PB-P1-020**.
* Recomendación de proveedores específicos (otros AI features).
* Conversión automática de moneda.
* `AnthropicProvider` operativo (solo stub).
* Regeneración con feedback dedicado (US-026).
* Edición posterior individual de items (US-036 / CRUD de `BudgetItem`).

### Scope Notes

* La sugerencia es siempre baseline editable; nunca reemplaza items confirmados.
* La regeneración crea un nuevo `AIRecommendation`; el anterior conserva su `status`.
* No introduce migraciones nuevas; reutiliza fundación IA.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Sugerencia generada con HITL pending

**Given** un organizador autenticado dueño de un evento con `budget_estimated > 0` y `currency_code` válido y `language_code` válido
**When** invoca `POST /api/v1/events/:eventId/ai/budget-suggestion`
**Then** el backend ejecuta `GenerateBudgetSuggestionUseCase` vía `LLMProvider`, valida el output con Zod (incluyendo suma=100 y mapeo a `ServiceCategory.code` activos), persiste un `AIRecommendation { type='budget_suggestion', status='pending', edited=false, fallback_used=false }` y devuelve `200` con la distribución (`categories[]` con `name`, `service_category_code`, `percentage`, `amount`, `notes`)
**And** **no** crea ni modifica `BudgetItem` en esta US (la aplicación ocurre en US-037).

### AC-02: Idioma y moneda respetados

**Given** un evento con `language_code='pt'` y `currency_code='EUR'`
**When** se genera la sugerencia
**Then** `notes` y descripciones están en portugués
**And** `amount` se expresa en `EUR` (la moneda del evento) sin conversión
**And** `AIRecommendation.language_code='pt'`.

### AC-03: Trazabilidad completa

**Given** una sugerencia generada
**When** se persiste
**Then** `AIRecommendation` incluye `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`, `event_id`, `created_at`, `type='budget_suggestion'`, `status='pending'`, `edited=false`.

### AC-04: Estructura de la distribución

**Given** una sugerencia generada
**When** la UI la recibe
**Then** la respuesta incluye `categories[]` con la suma exacta de `percentage = 100` y `amount = round(percentage/100 * budget_estimated)`
**And** se muestran con badge "Sugerido por IA" y acciones placeholder hacia US-037 (`Aplicar distribución`, `Editar antes de aplicar` (en US-037), `Regenerar`, `Descartar`).

---

## ⚠️ Edge Cases

### EC-01: `budget_estimated <= 0`

**Given** un evento con `budget_estimated <= 0`
**When** se invoca la generación
**Then** el backend retorna `400 INVALID_BUDGET` con envelope unificado y no persiste `AIRecommendation`.

---

### EC-02: Salida IA con suma ≠ 100% (`NFR-AI-005`)

**Given** el LLM responde con `percentages` que no suman 100 (con tolerancia ±0.01)
**When** Zod valida
**Then** se reintenta una vez con prompt reforzado; si vuelve a fallar, retorna `5xx AI_INVALID_OUTPUT` y persiste `AIRecommendation { status='failed' }`.

#### Handling

* Política estricta de validación; logging con `correlation_id` y muestra truncada del output.

---

### EC-03: Categoría desconocida en la salida IA

**Given** la salida IA referencia un `service_category_code` que no existe o está inactivo
**When** Zod/post-validator detecta el desajuste
**Then** se reintenta una vez con prompt reforzado; si vuelve a fallar, retorna `5xx AI_INVALID_OUTPUT` y persiste `AIRecommendation { status='failed' }`.

---

### EC-04: Timeout 60s (`NFR-AI-003`, Decisión PO 8.1 #9)

**Given** la llamada al LLM excede 60 s
**When** el sistema detecta el timeout
**Then** en producción retorna `5xx AI_TIMEOUT` y persiste `AIRecommendation { status='failed' }`
**And** en modo demo (`LLM_PROVIDER=mock` o `AI_DEMO_MODE=true`) cae a `MockAIProvider`, retorna `200` y persiste `AIRecommendation { status='pending', fallback_used=true }`.

---

### EC-05: Provider no disponible

**Given** `OpenAIProvider` responde con 5xx
**When** se invoca
**Then** en demo se usa `MockAIProvider` (`fallback_used=true`); en producción se retorna `5xx AI_PROVIDER_ERROR`.

---

### EC-06: Rate limit IA excedido (`SEC-POL-AI-007`)

**Given** el organizador ya ejecutó 20 invocaciones IA en la última hora
**When** invoca este endpoint
**Then** el backend retorna `429 RATE_LIMITED` con `Retry-After` y no persiste `AIRecommendation`.

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior          |
| ----- | ----------------------------------------------------------------- | --------------------------- |
| VR-01 | `eventId` debe ser UUID v4                                        | `400 VALIDATION`            |
| VR-02 | El evento debe existir y pertenecer al organizador autenticado    | `403 FORBIDDEN` o `404 NOT_FOUND` |
| VR-03 | `budget_estimated > 0`                                            | `400 INVALID_BUDGET`        |
| VR-04 | `currency_code` válido y consistente con el evento                | `400 VALIDATION`            |
| VR-05 | `language_code ∈ {es, en, pt, fr}`                                | `400 VALIDATION`            |
| VR-06 | El evento no debe estar en `status ∈ {cancelled, completed, deleted}` | `409 CONFLICT`         |
| VR-07 | Output IA: `Σ percentage = 100` (tolerancia ±0.01) y `service_category_code` válidos | Reintento; `5xx AI_INVALID_OUTPUT` si falla |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria sobre el evento (`event.owner_user_id === actor.id`).                          |
| SEC-02 | Rate limit IA `SEC-POL-AI-007`: 20 invocaciones por usuario por hora; respuesta `429 RATE_LIMITED`.   |
| SEC-03 | Logs estructurados sin PII completa; redactar email, teléfono y direcciones.                          |
| SEC-04 | Backend-only: el frontend nunca llama directamente al LLM.                                            |
| SEC-05 | Persistir `AIRecommendation` con `correlation_id` y metadata canónica.                                |
| SEC-06 | `OPENAI_API_KEY` solo en backend vía Secrets Manager; no exponer claves al cliente.                    |

### Negative Authorization Scenarios

* Organizer no dueño → `403`/`404`.
* Vendor autenticado → `403`.
* Admin autenticado → `403` (no es flujo admin).
* Anónimo / sesión inválida → `401`.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: AI-003 (`BudgetSuggestionPrompt v1`).
* Provider Layer: `LLMProvider` (`OpenAIProvider` en prod, `MockAIProvider` en demo/tests, `AnthropicProvider` stub).
* Human Validation Required: Yes.
* Persist `AIRecommendation`: Yes.
* Fallback Required: Yes (modo demo a `MockAIProvider`).

### AI Input

* `event.event_type_code`
* `event.guest_count`
* `event.budget_estimated`
* `event.currency_code`
* `event.city`
* `event.language_code`
* `service_categories_active`: lista de `ServiceCategory.code` activos para anclar la salida

### AI Output

* JSON estructurado validado con Zod:
  ```jsonc
  {
    "categories": [
      {
        "name": "Catering",
        "service_category_code": "CATERING",
        "percentage": 35.0,
        "amount": 3500,
        "notes": "..."
      }
    ]
  }
  ```
* Suma de `percentage` = 100 (±0.01); `service_category_code` ∈ catálogo activo.

### Human-in-the-loop Rules

* La generación produce únicamente `AIRecommendation { status='pending' }`.
* La aplicación (creación de `BudgetItem(ai_generated=true)`) ocurre solo al aceptar (US-037).
* Edición libre posterior de items en US-036 (CRUD).
* Regeneración crea un nuevo `AIRecommendation`.

### AI Error / Fallback Behavior

* Timeout 60 s → `AI_TIMEOUT` (o fallback Mock en demo).
* JSON inválido (incluida `Σ percentage ≠ 100` o categoría desconocida) → 1 reintento; si falla, `AI_INVALID_OUTPUT`.
* Provider error → fallback Mock en demo / `AI_PROVIDER_ERROR` en producción.
* Toda falla persiste `AIRecommendation { status='failed' }` con metadata.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events/:id/ai/budget`                                           |
| Main UI Pattern     | Vista con tabla/lista de categorías + barras de porcentaje + badge "Sugerido por IA" |
| Primary Action      | Placeholder hacia US-037 ("Aplicar distribución")                                     |
| Secondary Actions   | "Regenerar" (US-026), "Descartar" (US-025)                                            |
| Empty State         | CTA "Sugerir distribución IA"                                                        |
| Loading State       | Skeleton + mensaje "Puede tomar hasta 60 segundos." con `aria-live="polite"`         |
| Error State         | Banner por `error.code` traducido + botón de reintento                                |
| Success State       | Distribución mostrada con badge                                                       |
| Accessibility Notes | Tabla con `<caption>` y headers; lectura de porcentajes y montos por screen reader    |
| Responsive Notes    | Mobile-first                                                                         |
| i18n Notes          | Notas y descripciones en `language_code` del evento; copy UI en `locale` de la app    |
| Currency Notes      | Montos en la moneda del evento; sin conversión                                        |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/organizer/events/:id/ai/budget`.
* Components: `AIBudgetSuggestion`, `AIBudgetViewer`, `AIBadge` (reusado de US-017).
* State Management: TanStack `useGenerateAIBudget` (mutation).
* Forms: No aplica en esta US (edición previa a aceptar vive en US-037).
* API Client: `aiApi.generateBudgetSuggestion(eventId)`.

### Backend

* Use Case / Service: `GenerateBudgetSuggestionUseCase` (orquesta `LLMProvider`, validación Zod estricta, retry, persistencia).
* Controller / Route: `POST /api/v1/events/:eventId/ai/budget-suggestion`.
* Authorization Policy: Ownership + rate limit `SEC-POL-AI-007`.
* Validation: Zod `eventBudgetSuggestionParamsSchema` + `BudgetSuggestionSchema` con invariante de suma=100 y mapeo a `ServiceCategory.code`.
* Transaction Required: Sí, para persistir `AIRecommendation` (sin tocar `budget_items`).

### Database

* Main Tables:
  * `ai_recommendations` (insert, `type='budget_suggestion'`).
  * `ai_prompt_versions` (read; semilla de `BudgetSuggestionPrompt v1`).
  * `events`, `budgets` (read).
  * `service_categories` (read; categorías activas para validar salida).
  * `budget_items` **no** se toca en esta US.
* Constraints: reutiliza enums (`ai_recommendation_status`, `ai_recommendation_type`).
* Index Considerations: reutiliza `ai_recommendations(event_id, type, status, created_at)`.

### API

| Method | Endpoint                                                  | Purpose                                  |
| ------ | --------------------------------------------------------- | ---------------------------------------- |
| POST   | `/api/v1/events/:eventId/ai/budget-suggestion`            | Generar sugerencia de distribución IA    |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes (`ai.budget-suggestion.requested|generated|failed|fallback`).
* AdminAction Required: No.
* AIRecommendation Required: Yes (siempre, incluso en falla).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                            | Type        |
| ----- | ------------------------------------------------------------------- | ----------- |
| TS-01 | Generación exitosa con `MockAIProvider` determinista                | Integration |
| TS-02 | Persistencia de `AIRecommendation` con metadata completa            | Integration |
| TS-03 | Generación con `language_code='pt'` y `currency_code='EUR'`         | Integration |
| TS-04 | E2E: organizer genera distribución y la ve en pending (Playwright)   | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result          |
| ----- | ----------------------------------------------------- | ------------------------ |
| NT-01 | `budget_estimated = 0`                                | `400 INVALID_BUDGET`     |
| NT-02 | Evento ajeno                                          | `403`/`404`              |
| NT-03 | Vendor invoca                                         | `403`                    |
| NT-04 | Admin invoca                                          | `403`                    |
| NT-05 | `language_code` no soportado                          | `400 VALIDATION`         |
| NT-06 | Evento `cancelled`/`completed`/`deleted`              | `409 CONFLICT`           |
| NT-07 | Anónimo                                               | `401 UNAUTHORIZED`       |

### AI Tests

| ID       | Scenario                                                       | Expected Result                                  |
| -------- | -------------------------------------------------------------- | ------------------------------------------------ |
| AI-TS-01 | `MockAIProvider` devuelve distribución válida                  | `AIRecommendation` pending con metadata           |
| AI-TS-02 | Suma de porcentajes ≠ 100 → retry exitoso                      | Distribución válida; `AIRecommendation` pending  |
| AI-TS-03 | Suma de porcentajes ≠ 100 en retry                             | `5xx AI_INVALID_OUTPUT`; failed                  |
| AI-TS-04 | Categoría desconocida                                          | Retry; si persiste, `5xx AI_INVALID_OUTPUT`      |
| AI-TS-05 | Timeout 60 s en producción                                     | `5xx AI_TIMEOUT` + failed                        |
| AI-TS-06 | Timeout 60 s en modo demo                                      | Fallback Mock; `fallback_used=true`; pending     |
| AI-TS-07 | `OpenAIProvider` 5xx                                           | Fallback Mock en demo / `AI_PROVIDER_ERROR` en prod |
| AI-TS-08 | Rate limit excedido                                            | `429 RATE_LIMITED` con `Retry-After`             |

### Authorization Tests

| ID         | Scenario           | Expected Result    |
| ---------- | ------------------ | ------------------ |
| AUTH-TS-01 | Organizer dueño    | `200`              |
| AUTH-TS-02 | Organizer no dueño | `403`/`404`        |
| AUTH-TS-03 | Vendor             | `403`              |
| AUTH-TS-04 | Admin              | `403`              |
| AUTH-TS-05 | Anónimo            | `401`              |

### Accessibility Tests

* Tabla de distribución con `<caption>` y headers correctos.
* Lectura de porcentajes y montos por screen reader.
* Anuncio `aria-live="polite"` al completarse o fallar la generación.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Adopción de presupuesto, tiempo a primer item         |
| Expected Impact     | Acelera la definición de presupuesto                  |
| Success Criteria    | ≥ 50% de organizadores aplican la sugerencia (medido conjuntamente con US-037) |
| Academic Demo Value | Demuestra HITL en datos financieros (sin decisión autónoma) |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Página `/[locale]/organizer/events/:id/ai/budget` con `AIBudgetSuggestion`.
* `AIBudgetViewer` con tabla de categorías y badges.
* Hook `useGenerateAIBudget` y cliente `aiApi.generateBudgetSuggestion`.
* i18n para 4 locales y mensajes de error.

### Potential Backend Tasks

* `GenerateBudgetSuggestionUseCase` + integración `LLMProvider`.
* Validación Zod estricta con invariante de suma=100 y mapeo a `ServiceCategory.code`.
* Endpoint con rate limit `SEC-POL-AI-007`.
* Logging estructurado + métricas.

### Potential Database Tasks

* Verificación de fundación IA (sin migraciones nuevas).

### Potential AI / PromptOps Tasks

* Registrar `BudgetSuggestionPrompt v1` (registry US-121 + `ai_prompt_versions`).
* Respuestas deterministas en `MockAIProvider` por idioma/moneda.

### Potential QA Tasks

* Tests deterministas con Mock.
* Tests de validación 100% / categorías.
* Tests de timeout y rate limit.

### Potential DevOps / Config Tasks

* Verificación de Secrets Manager (`OPENAI_API_KEY`).

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-AI-003/009/011/017`, `UC-AI-003`, `BR-AI-001..011`, `BR-BUDGET-001/006/007/008/009`).
* [x] Permisos identificados (ownership + `SEC-POL-AI-007`).
* [x] Entidades listadas (`Event`, `Budget`, `AIRecommendation`, `AIPromptVersion`, `ServiceCategory`).
* [x] AC en GWT (HITL inicial, sin `BudgetItem`).
* [x] Edge cases documentados (presupuesto inválido, suma≠100, categoría desconocida, timeout, provider error, rate limit).
* [x] Validación clara.
* [x] Out of Scope explícito (aplicación en US-037).
* [x] Dependencias conocidas (PB-P1-011, PB-P1-019, PB-P0-007/009..011/014, US-037).
* [x] UX states identificados.
* [x] API definida (`POST /api/v1/events/:eventId/ai/budget-suggestion`).
* [x] Tests definidos.
* [ ] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint y UI funcionales con HITL enforced (`status='pending'`, sin `BudgetItem` creado).
* [ ] `AIRecommendation` persistido con trazabilidad completa.
* [ ] Validación de suma=100 y mapeo a `ServiceCategory.code` activos enforced.
* [ ] Fallback `MockAIProvider` operativo en demo y determinista en tests.
* [ ] Rate limit IA `SEC-POL-AI-007` aplicado y verificado.
* [ ] Tests funcionales, negativos, IA y de autorización verdes en CI.
* [ ] PO valida en demo.

---

## 📝 Notes

* Documentation Alignment Required: `/docs/16-API-Design-Specification.md` ya documenta `POST /events/:eventId/ai/budget-suggestion`; verificar regeneración del snapshot OpenAPI vía US-098.
* Documentation Alignment Required: `/docs/8-Use-Cases-Specification.md` describe `UC-AI-003` con semántica de "Generar checklist con IA"; `/docs/9-FRD.md` lo mapea correctamente a AI-003. Aclaración liviana en `/docs/8` recomendada.
* Documentation Alignment Required: registrar explícitamente en `/docs/7` la invariante `Σ percentage = 100` (tolerancia ±0.01) y la obligación de mapear a `ServiceCategory.code` activos.
* La aplicación de la distribución (creación de `BudgetItem(ai_generated=true)`) y la edición previa a aceptar se mueven a US-037 / PB-P1-020.
* La nota previa sobre "lista canónica de categorías" queda resuelta: se usa `ServiceCategory.code` del catálogo curado.
