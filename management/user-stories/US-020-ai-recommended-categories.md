# 🧾 User Story: Obtener categorías IA priorizadas para mi evento (AI-004)

## 🆔 Metadata

| Field              | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| ID                 | US-020                                                 |
| Epic               | EPIC-AIP-001 — AI-Assisted Event Planning              |
| Backlog Item       | PB-P1-014 — AI Categorías priorizadas (AI-004)         |
| UI Surface         | Dashboard del evento (sección "Recomendado para ti")    |
| Feature            | AI-004 — Categorías priorizadas                        |
| Module / Domain    | AI / Vendors                                           |
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

**As an** organizador planeando un evento
**I want** obtener una lista priorizada de categorías de proveedor a contratar
**So that** sepa por dónde comenzar a buscar y solicitar cotizaciones

---

## 🧠 Business Context

### Context Summary

AI-004 recomienda categorías de proveedor priorizadas (por ejemplo, para una boda: venue → catering → fotografía → música → decoración) a partir de los datos del evento. El backend invoca al `LLMProvider` con `VendorCategoriesPrompt v1`, valida el JSON con Zod y filtra el output contra `ServiceCategory.is_active=true` antes de persistir un `AIRecommendation { type='vendor_categories', status='pending' }`. La lista es la antesala del directorio de proveedores (US-045) y del envío de `QuoteRequest`.

### Related Domain Concepts

* `AIRecommendation { type='vendor_categories', status='pending' }`.
* `LLMProvider` (`OpenAIProvider` / `MockAIProvider` / `AnthropicProvider` stub).
* `ServiceCategory` (catálogo curado con `code`, `name`, `is_active`).

### Assumptions

* Las categorías sugeridas deben existir en el catálogo y estar activas (`BR-SERVICE-001` aplica al ecosistema; el filtro es estricto en el backend).
* Si una categoría sugerida no existe o está inactiva, se omite y se registra en log para enriquecer el catálogo (no se materializa nada).
* La click-through del organizer apunta a `/[locale]/organizer/vendors?category=<code>&city=<city>` (consistente con US-045).
* El idioma del evento se incluye en el prompt y se persiste en `AIRecommendation.language_code`.

### Dependencies

* PB-P1-011 / US-017 — Fundación AI-001 (`LLMProvider`, `MockAIProvider`, prompt registry, `AIRecommendation`, rate limit aplicado).
* PB-P1-006 — Evento creado con datos completos (`event_type_code`, `guest_count`, `budget_estimated`, `language_code`, `city`).
* PB-P0-009..011 — Fundación IA.
* PB-P0-007 — Rate limit IA (`SEC-POL-AI-007`).
* PB-P0-014 — Observabilidad IA.
* PB-P1-019 (catálogo `ServiceCategory` activo) — fuente del filtro de salida.
* US-045 — Directorio de proveedores (destino del click-through).

---

## 🔗 Traceability

| Source                 | Reference                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-014                                                                                 |
| FRD Requirement(s)     | FR-AI-004 (categorías priorizadas), FR-AI-009 (timeout/fallback), FR-AI-011 (badge IA), FR-AI-012 (no conversión automática a entidad oficial), FR-AI-017 (idioma) |
| Use Case(s)            | UC-AI-004                                                                                 |
| Business Rule(s)       | BR-AI-001..006 (HITL/abstracción), BR-AI-007..011 (trazabilidad, `ai_generated`, timeout, prompt versionado, idioma), BR-SERVICE-001 (ServiceCategory existente como guardrail del filtro) |
| Permission Rule(s)     | Ownership del evento; rate limit IA `SEC-POL-AI-007` (20/usuario/hora)                     |
| Data Entity / Entities | `Event`, `ServiceCategory`, `AIRecommendation`, `AIPromptVersion`                          |
| API Endpoint(s)        | `POST /api/v1/events/:eventId/ai/vendor-categories`                                       |
| NFR Reference(s)       | NFR-AI-003 (timeout 60s), NFR-AI-005 (validación JSON con 1 reintento), NFR-AI-007 (`LLMProvider`), NFR-AI-008 (`MockAIProvider` determinista) |
| Related ADR(s)         | ADR-AI-001 (LLMProvider abstraction)                                                       |
| PO Decision(s)         | Decisión PO 8.1 #9 (timeout/fallback), Decisión PO 8.1 #15 (Anthropic stub)                |
| Related Document(s)    | `/docs/7` (AI-004), `/docs/17` (AI Architecture & PromptOps), `/docs/19` (`SEC-POL-AI-007`), `/docs/6` (`ServiceCategory`, `AIRecommendation.type='vendor_categories'`), `/docs/18` (enums), `/docs/4` (BR-AI/SERVICE), `/docs/8.1` (#9, #15) |

---

## 🧩 PO/BA Decisions Applied

1. **Decisión PO 8.1 #9** — Timeout LLM 60 s; producción error controlado, demo fallback `MockAIProvider`.
2. **Decisión PO 8.1 #15** — `AnthropicProvider` solo stub en MVP.
3. **HITL canónico (`BR-AI-001..003`)** — La lista IA se entrega como sugerencia (`status='pending'`); la decisión de explorar una categoría es siempre humana (no se crea `QuoteRequest` automáticamente, ver `FR-AI-012`).
4. **Rate limit IA global (`SEC-POL-AI-007`)** — 20 invocaciones IA por usuario por hora; `429 RATE_LIMITED` al exceder.
5. **Endpoint canónico** — `POST /api/v1/events/:eventId/ai/vendor-categories` conforme a `/docs/16`.
6. **`AIRecommendation.type`** — Valor canónico `'vendor_categories'`.
7. **Status enum canónico** — `(pending, accepted, rejected, discarded, failed, expired)`; `edited` boolean.
8. **Filtro contra catálogo** — La salida IA se filtra estrictamente contra `ServiceCategory.is_active=true` antes de persistir; las categorías inexistentes/inactivas se omiten y se registran en log.
9. **Click-through al directorio** — Ruta canónica `/[locale]/organizer/vendors?category=<code>&city=<city>` (consistente con US-045).

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Recomendación de proveedores específicos (solo categorías aquí; los vendors viven en US-045).
* Decisiones automáticas (no se crea `QuoteRequest` ni se reserva nada).
* Persistencia de feedback "no relevante" por categoría (delegado a iteración futura).
* `AnthropicProvider` operativo (solo stub).
* Enriquecimiento del catálogo `ServiceCategory` desde IA (las categorías inactivas/inexistentes solo se loguean).

### Scope Notes

* La sugerencia es siempre un baseline informativo; el organizer decide qué explorar.
* La regeneración crea un nuevo `AIRecommendation`; el anterior conserva su `status`.
* No introduce migraciones nuevas.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Categorías sugeridas con HITL pending

**Given** un organizador autenticado dueño de un evento con datos completos (`event_type_code`, `guest_count`, `budget_estimated`, `city`, `language_code`)
**When** invoca `POST /api/v1/events/:eventId/ai/vendor-categories`
**Then** el backend ejecuta `GenerateVendorCategoriesUseCase` vía `LLMProvider`, valida el JSON con Zod, filtra contra `ServiceCategory.is_active=true`, persiste `AIRecommendation { type='vendor_categories', status='pending', edited=false, fallback_used=false }` y devuelve `200` con `categories[]` ordenado por `priority_score` desc (cada categoría incluye `service_category_code`, `name`, `priority_score`, `reason`)
**And** **no** se crea `QuoteRequest` ni ninguna otra entidad oficial.

### AC-02: Idioma respetado

**Given** un evento con `language_code='pt'`
**When** se genera la lista
**Then** los campos `name` (label de display) y `reason` están en portugués
**And** `AIRecommendation.language_code='pt'`.

### AC-03: Trazabilidad completa

**Given** una lista generada
**When** se persiste
**Then** `AIRecommendation` incluye `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`, `event_id`, `created_at`, `type='vendor_categories'`, `status='pending'`, `edited=false`.

### AC-04: Click-through al directorio

**Given** una lista mostrada en la sección "Recomendado para ti" del dashboard
**When** el organizer hace click en una categoría
**Then** la UI navega a `/[locale]/organizer/vendors?category=<code>&city=<city>` con los filtros prearmados (consistente con US-045)
**And** se emite un evento de telemetría `ai.vendor-categories.clicked` con `service_category_code` y `correlation_id`.

---

## ⚠️ Edge Cases

### EC-01: Categoría sugerida no existe o está inactiva

**Given** el LLM propone una `service_category_code` que no está en el catálogo o tiene `is_active=false`
**When** el backend filtra
**Then** la entrada se omite del resultado
**And** se registra en log estructurado `ai.vendor-categories.unknown_category` con `code` y `correlation_id` (para enriquecer el catálogo offline).

---

### EC-02: Resultado vacío tras filtro

**Given** todas las categorías sugeridas son inválidas o inactivas
**When** el backend filtra
**Then** se reintenta una vez con prompt reforzado; si vuelve a fallar, persiste `AIRecommendation { status='failed' }` y retorna `5xx AI_INVALID_OUTPUT`.

---

### EC-03: Timeout 60s (`NFR-AI-003`, Decisión PO 8.1 #9)

**Given** la llamada al LLM excede 60 s
**When** el sistema detecta el timeout
**Then** en producción retorna `5xx AI_TIMEOUT` y persiste `AIRecommendation { status='failed' }`
**And** en modo demo cae a `MockAIProvider` (`fallback_used=true`).

---

### EC-04: Provider no disponible

**Given** `OpenAIProvider` responde con 5xx
**When** se invoca
**Then** en demo se usa `MockAIProvider`; en producción `5xx AI_PROVIDER_ERROR`.

---

### EC-05: Rate limit IA excedido (`SEC-POL-AI-007`)

**Given** el organizer ya ejecutó 20 invocaciones IA en la última hora
**When** invoca este endpoint
**Then** el backend retorna `429 RATE_LIMITED` con `Retry-After` y no persiste `AIRecommendation`.

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior          |
| ----- | ----------------------------------------------------------------- | --------------------------- |
| VR-01 | `eventId` debe ser UUID v4                                        | `400 VALIDATION`            |
| VR-02 | El evento debe existir y pertenecer al organizador autenticado    | `403 FORBIDDEN` o `404 NOT_FOUND` |
| VR-03 | `language_code ∈ {es, en, pt, fr}`                                | `400 VALIDATION`            |
| VR-04 | El evento no debe estar en `status ∈ {cancelled, completed, deleted}` | `409 CONFLICT`         |
| VR-05 | Output IA: `priority_score ∈ [0,1]` y `service_category_code` ∈ catálogo activo | Filtrado / retry / `AI_INVALID_OUTPUT` |
| VR-06 | Output IA: `reason` ≤ 240 caracteres                                | Truncar al persistir / `AI_INVALID_OUTPUT` si excede límite extremo |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria sobre el evento (`event.owner_user_id === actor.id`).                          |
| SEC-02 | Rate limit IA `SEC-POL-AI-007`: 20 invocaciones por usuario por hora; respuesta `429 RATE_LIMITED`.   |
| SEC-03 | Logs estructurados sin PII completa; redactar email, teléfono y direcciones.                          |
| SEC-04 | Backend-only: el frontend nunca llama directamente al LLM.                                            |
| SEC-05 | Persistir `AIRecommendation` con `correlation_id` y metadata canónica.                                |
| SEC-06 | `OPENAI_API_KEY` solo en backend vía Secrets Manager.                                                  |

### Negative Authorization Scenarios

* Organizer no dueño → `403`/`404`.
* Vendor autenticado → `403`.
* Admin autenticado → `403` (no es flujo admin).
* Anónimo / sesión inválida → `401`.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: AI-004 (`VendorCategoriesPrompt v1`).
* Provider Layer: `LLMProvider` (`OpenAIProvider` / `MockAIProvider` / `AnthropicProvider` stub).
* Human Validation Required: Yes (la lista no actúa por el usuario; explorar una categoría es decisión humana).
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
        "service_category_code": "VENUE",
        "name": "Venue",
        "priority_score": 0.95,
        "reason": "Reserva con anticipación: alta demanda en la ciudad."
      }
    ]
  }
  ```
* `priority_score ∈ [0,1]` desc; `reason` ≤ 240 caracteres; `service_category_code` ∈ catálogo activo.

### Human-in-the-loop Rules

* La sugerencia se entrega como lista informativa; el organizer decide qué categoría explorar.
* No se crean entidades oficiales (`QuoteRequest`, etc.) sin acción humana posterior (`FR-AI-012`).
* Regenerar crea un nuevo `AIRecommendation`.

### AI Error / Fallback Behavior

* Timeout 60 s → `AI_TIMEOUT` (o fallback Mock en demo).
* JSON inválido o lista vacía tras filtro → 1 reintento; si falla, `AI_INVALID_OUTPUT`.
* Provider error → fallback Mock en demo / `AI_PROVIDER_ERROR` en producción.
* Toda falla persiste `AIRecommendation { status='failed' }` con metadata.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Screen / Route      | Dashboard del evento (`/[locale]/organizer/events/:id`) — sección "Recomendado para ti" |
| Main UI Pattern     | Lista priorizada con razones cortas y badge "Sugerido por IA"                         |
| Primary Action      | Click categoría → directorio `/[locale]/organizer/vendors?category=<code>&city=<city>` |
| Secondary Actions   | "Regenerar" (US-026), "Ocultar sección" (preferencia local UI)                        |
| Empty State         | CTA "Generar recomendaciones IA"                                                     |
| Loading State       | Skeleton + mensaje "Puede tomar hasta 60 segundos." con `aria-live="polite"`         |
| Error State         | Banner por `error.code` traducido + reintento                                         |
| Success State       | Lista visible con badge                                                               |
| Accessibility Notes | Botones/enlaces con `aria-label` por categoría; lista con `role="list"` y `<li>`      |
| Responsive Notes    | Mobile-first                                                                         |
| i18n Notes          | Nombres y razones en `language_code` del evento; copy UI en `locale` de la app        |
| Currency Notes      | No aplica                                                                            |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: sección embebida en el dashboard `/[locale]/organizer/events/:id`.
* Components: `AIRecommendedCategories`, `AICategoryCard`, `AIBadge` (reusado de US-017).
* State Management: TanStack `useGenerateAIVendorCategories` (mutation) + cache `['ai','event', eventId, 'vendor-categories']`.
* Forms: No aplica.
* API Client: `aiApi.generateVendorCategories(eventId)`.

### Backend

* Use Case / Service: `GenerateVendorCategoriesUseCase` (orquesta `LLMProvider`, validación Zod, filtro contra catálogo, retry, persistencia).
* Controller / Route: `POST /api/v1/events/:eventId/ai/vendor-categories`.
* Authorization Policy: Ownership + rate limit `SEC-POL-AI-007`.
* Validation: Zod `eventVendorCategoriesParamsSchema` + `VendorCategoriesSchema` con invariantes (`priority_score ∈ [0,1]`, `reason` ≤ 240 chars).
* Transaction Required: Sí, para persistir `AIRecommendation` (no se tocan otras entidades).

### Database

* Main Tables:
  * `ai_recommendations` (insert, `type='vendor_categories'`).
  * `ai_prompt_versions` (read; semilla de `VendorCategoriesPrompt v1`).
  * `events` (read).
  * `service_categories` (read; `is_active=true`).
* Constraints: reutiliza enums.
* Index Considerations: reutiliza `ai_recommendations(event_id, type, status, created_at)`.

### API

| Method | Endpoint                                                  | Purpose                                       |
| ------ | --------------------------------------------------------- | --------------------------------------------- |
| POST   | `/api/v1/events/:eventId/ai/vendor-categories`            | Generar lista priorizada de categorías IA      |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes (`ai.vendor-categories.requested|generated|failed|fallback|unknown_category|clicked`).
* AdminAction Required: No.
* AIRecommendation Required: Yes (siempre, incluso en falla).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                            | Type        |
| ----- | ------------------------------------------------------------------- | ----------- |
| TS-01 | Generación exitosa con `MockAIProvider` filtrada por catálogo       | Integration |
| TS-02 | Persistencia de `AIRecommendation` con metadata completa            | Integration |
| TS-03 | Generación con `language_code='pt'` retorna contenido pt             | Integration |
| TS-04 | Categoría sugerida no existe → se omite y se loguea                  | Integration |
| TS-05 | E2E: organizer ve recomendaciones y navega al directorio con filtros | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result          |
| ----- | ----------------------------------------------------- | ------------------------ |
| NT-01 | Categoría no existe en catálogo                        | Filtrada (no error)      |
| NT-02 | Evento ajeno                                          | `403`/`404`              |
| NT-03 | Vendor invoca                                         | `403`                    |
| NT-04 | Admin invoca                                          | `403`                    |
| NT-05 | `language_code` no soportado                          | `400 VALIDATION`         |
| NT-06 | Evento `cancelled`/`completed`/`deleted`              | `409 CONFLICT`           |
| NT-07 | Anónimo                                               | `401 UNAUTHORIZED`       |

### AI Tests

| ID       | Scenario                                                       | Expected Result                                  |
| -------- | -------------------------------------------------------------- | ------------------------------------------------ |
| AI-TS-01 | `MockAIProvider` devuelve lista válida                         | `AIRecommendation` pending con metadata           |
| AI-TS-02 | Lista vacía tras filtro → retry exitoso                        | Lista válida; pending                            |
| AI-TS-03 | Lista vacía tras filtro en retry                               | `5xx AI_INVALID_OUTPUT`; failed                  |
| AI-TS-04 | Timeout 60 s en producción                                     | `5xx AI_TIMEOUT` + failed                        |
| AI-TS-05 | Timeout 60 s en modo demo                                      | Fallback Mock; `fallback_used=true`; pending     |
| AI-TS-06 | `OpenAIProvider` 5xx                                           | Fallback Mock en demo / `AI_PROVIDER_ERROR` en prod |
| AI-TS-07 | Rate limit excedido                                            | `429 RATE_LIMITED` con `Retry-After`             |

### Authorization Tests

| ID         | Scenario           | Expected Result    |
| ---------- | ------------------ | ------------------ |
| AUTH-TS-01 | Organizer dueño    | `200`              |
| AUTH-TS-02 | Organizer no dueño | `403`/`404`        |
| AUTH-TS-03 | Vendor             | `403`              |
| AUTH-TS-04 | Admin              | `403`              |
| AUTH-TS-05 | Anónimo            | `401`              |

### Accessibility Tests

* Lista con `role="list"` y `<li>`.
* Enlaces de categoría con `aria-label` descriptivo.
* Anuncio `aria-live="polite"` al completarse la generación.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | CTR a directorio de vendors, conversión a `QuoteRequest` |
| Expected Impact     | Acelera el descubrimiento de proveedores              |
| Success Criteria    | ≥ 40% CTR a directorio desde las recomendaciones      |
| Academic Demo Value | Conecta IA con el marketplace (categorías → vendors)   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Sección `AIRecommendedCategories` en dashboard del evento.
* `AICategoryCard` con badge y link al directorio.
* Hook `useGenerateAIVendorCategories` y cliente `aiApi.generateVendorCategories`.
* Telemetría `ai.vendor-categories.clicked`.
* i18n para 4 locales.

### Potential Backend Tasks

* `GenerateVendorCategoriesUseCase` + integración `LLMProvider`.
* Validación Zod + filtro contra `ServiceCategory.is_active=true` + retry.
* Endpoint con rate limit `SEC-POL-AI-007`.
* Logging estructurado + métricas + log `unknown_category`.

### Potential Database Tasks

* Verificación de fundación IA (sin migraciones nuevas).

### Potential AI / PromptOps Tasks

* Registrar `VendorCategoriesPrompt v1` (US-121 + `ai_prompt_versions`).
* Respuestas deterministas en `MockAIProvider` por idioma con `service_categories_active` anclado.

### Potential QA Tasks

* Tests deterministas con Mock.
* Tests de filtrado y retry.
* Tests de rate limit y autorización.

### Potential DevOps / Config Tasks

* Verificación de Secrets Manager (`OPENAI_API_KEY`).

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-AI-004/009/011/012/017`, `UC-AI-004`, `BR-AI-001..011`, `BR-SERVICE-001`).
* [x] Permisos identificados (ownership + `SEC-POL-AI-007`).
* [x] Entidades listadas (`Event`, `ServiceCategory`, `AIRecommendation`, `AIPromptVersion`).
* [x] AC en GWT (HITL, click-through, idioma, trazabilidad).
* [x] Edge cases documentados (categoría desconocida, lista vacía, timeout, provider error, rate limit).
* [x] Validación clara.
* [x] Out of Scope explícito (feedback, enriquecimiento de catálogo, recomendación de vendors).
* [x] Dependencias conocidas (PB-P1-011, PB-P1-006, PB-P0-009..011/007/014, PB-P1-019, US-045).
* [x] UX states identificados.
* [x] API definida (`POST /api/v1/events/:eventId/ai/vendor-categories`).
* [x] Tests definidos.
* [ ] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint y UI funcionales con HITL enforced (`status='pending'`).
* [ ] `AIRecommendation` persistido con trazabilidad completa.
* [ ] Filtro estricto contra `ServiceCategory.is_active=true` enforced y verificado.
* [ ] Click-through al directorio con filtros prearmados.
* [ ] Fallback `MockAIProvider` operativo en demo y determinista en tests.
* [ ] Rate limit IA `SEC-POL-AI-007` aplicado y verificado.
* [ ] Tests funcionales, negativos, IA y de autorización verdes en CI.
* [ ] PO valida en demo.

---

## 📝 Notes

* Documentation Alignment Required: `/docs/16-API-Design-Specification.md` ya documenta `POST /events/:eventId/ai/vendor-categories`; verificar regeneración del snapshot OpenAPI vía US-098.
* Documentation Alignment Required: `/docs/8-Use-Cases-Specification.md` describe `UC-AI-004` con semántica de "distribución de presupuesto"; `/docs/9-FRD.md` lo mapea correctamente a AI-004 (categorías). Aclaración liviana en `/docs/8`.
* Documentation Alignment Required: registrar en `/docs/7` las invariantes del output (`priority_score ∈ [0,1]`, `reason` ≤ 240 caracteres, filtro estricto contra `ServiceCategory.is_active=true`).
* La persistencia de feedback "no relevante" por categoría queda como mejora futura fuera del alcance MVP.
* El log `ai.vendor-categories.unknown_category` se usa para enriquecer el catálogo offline (sin automatización IA del catálogo).
