# 🧾 User Story: Generar checklist IA con fechas relativas (AI-002)

## 🆔 Metadata

| Field              | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| ID                 | US-018                                                 |
| Epic               | EPIC-AIP-001 — AI-Assisted Event Planning              |
| Backlog Item       | PB-P1-012 — Generar checklist IA con fechas relativas T-x |
| UI Surface         | PB-P1-044                                              |
| Feature            | AI-002 — Checklist IA                                  |
| Module / Domain    | AI / Tasks                                             |
| User Role          | Organizer                                              |
| Priority           | Must Have                                              |
| Status             | Approved                                               |
| Owner              | Product Owner / Business Analyst                       |
| Approved By        | PO/BA Review                                           |
| Approval Date      | 2026-06-25                                             |
| Ready for Development Tasks | Yes                                           |
| Sprint / Milestone | MVP                                                    |
| Created Date       | 2026-06-09                                             |
| Last Updated       | 2026-06-25                                             |

---

## 🎯 User Story

**As an** organizador con un evento creado
**I want** generar un checklist IA con tareas estructuradas y fechas relativas (T-180, T-90, T-30, T-7, T-1)
**So that** tenga una lista de acciones pre-evento priorizadas en el tiempo, lista para revisar y confirmar

---

## 🧠 Business Context

### Context Summary

AI-002 produce un set de tareas con `due_relative_days` agrupadas por fase T-x. El backend invoca al `LLMProvider` con `ChecklistPrompt v1`, valida el JSON con Zod y persiste **únicamente** un `AIRecommendation { type='checklist', status='pending' }` con el JSON crudo. Las tareas `EventTask` se materializan **al aceptar** en US-031 (confirmación bulk). El idioma del evento se respeta en el output IA. Esta US cubre la **generación**; la confirmación masiva, la conversión T-x → fecha absoluta y la creación de `EventTask` viven en US-031.

### Related Domain Concepts

* `AIRecommendation { type='checklist', status='pending' }`.
* `LLMProvider` (`OpenAIProvider` en prod, `MockAIProvider` en demo/tests, `AnthropicProvider` stub).
* `EventTask` (afectado solo en US-031 al confirmar; aquí no se persisten tareas).
* Fechas relativas (T-180/T-90/T-30/T-7/T-1) en el output IA.

### Assumptions

* La materialización de tareas y la conversión T-x → fecha absoluta ocurre al confirmar (US-031 / `BR-TASK-006`).
* El idioma del evento se propaga al prompt y se persiste en `AIRecommendation.language_code`.
* `MockAIProvider` provee respuestas deterministas por idioma para tests y demo.
* Regenerar crea un nuevo `AIRecommendation`; las tareas confirmadas anteriormente no se ven afectadas.

### Dependencies

* US-017 / PB-P1-011 — Generación de plan IA (precedente; comparte fundación IA).
* PB-P0-009..011 — Fundación IA (`LLMProvider`, `MockAIProvider`, prompt registry, `AIRecommendation`).
* PB-P1-015 — Catálogo de categorías de tarea (dependencia del backlog).
* PB-P0-007 — Rate limit IA (`SEC-POL-AI-007`).
* PB-P0-014 — Observabilidad IA.
* US-031 / PB-P1-017 — Confirmación bulk y materialización de `EventTask` (consumidor del `AIRecommendation` generado aquí).

---

## 🔗 Traceability

| Source                 | Reference                                                                 |
| ---------------------- | ------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-012                                                                 |
| FRD Requirement(s)     | FR-AI-002 (checklist), FR-AI-009 (timeout/fallback)                       |
| Use Case(s)            | UC-AI-002                                                                 |
| Business Rule(s)       | BR-AI-001..006 (HITL/abstracción/idioma), BR-AI-007..011 (trazabilidad, `ai_generated`, timeout, prompt versionado, idioma), BR-TASK-002 (origen), BR-TASK-003 (confirmación), BR-TASK-004 (ciclo de vida), BR-TASK-005 (edición individual y en bloque), BR-TASK-006 (fechas relativas T-x), BR-TASK-010 (bloqueo en estados terminales) |
| Permission Rule(s)     | Ownership del evento; rate limit IA `SEC-POL-AI-007` (20/usuario/hora)     |
| Data Entity / Entities | `Event`, `AIRecommendation`, `AIPromptVersion` (sin `EventTask` en esta US) |
| API Endpoint(s)        | `POST /api/v1/events/:eventId/ai/checklist`                                |
| NFR Reference(s)       | NFR-AI-003 (timeout 60s), NFR-AI-005 (validación JSON con 1 reintento), NFR-AI-007 (`LLMProvider`), NFR-AI-008 (`MockAIProvider` determinista) |
| Related ADR(s)         | ADR-AI-001 (LLMProvider abstraction)                                       |
| PO Decision(s)         | Decisión PO 8.1 #9 (timeout/fallback), Decisión PO 8.1 #15 (Anthropic stub) |
| Related Document(s)    | `/docs/7` (AI-002), `/docs/17` (AI Architecture & PromptOps), `/docs/19` (`SEC-POL-AI-007`), `/docs/6` (`AIRecommendation.type='checklist'`, C-012), `/docs/18` (`ai_recommendations`, enums), `/docs/4` (`BR-AI-*`, `BR-TASK-*`), `/docs/8.1` (#9, #15) |

---

## 🧩 PO/BA Decisions Applied

1. **Decisión PO 8.1 #9** — Timeout LLM 60 s; en producción error controlado, en demo fallback a `MockAIProvider`. Estado: Resuelta.
2. **Decisión PO 8.1 #15** — `AnthropicProvider` solo stub en MVP. Estado: Resuelta.
3. **HITL canónico (`BR-AI-001..003`, C-012)** — La generación crea solo `AIRecommendation(type='checklist', status='pending')`. Los `EventTask(ai_generated=true)` se materializan al aceptar (US-031).
4. **Rate limit IA global (`SEC-POL-AI-007`)** — 20 invocaciones IA por usuario por hora; `429 RATE_LIMITED` al exceder.
5. **Endpoint canónico** — `POST /api/v1/events/:eventId/ai/checklist` conforme a `/docs/16`.
6. **`AIRecommendation.type`** — Valor canónico `'checklist'`.
7. **Status enum canónico** — `(pending, accepted, rejected, discarded, failed, expired)`; `edited` boolean.
8. **Conversión T-x → fecha absoluta (`BR-TASK-006`)** — Ocurre en backend al confirmar (US-031), no en la generación.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Confirmación masiva, individual o edición de tareas IA (US-031, US-028, US-029).
* Materialización de `EventTask` y conversión T-x → fecha absoluta (US-031, `BR-TASK-006`).
* Asignación de tareas a múltiples usuarios.
* Subtareas anidadas IA.
* Recordatorios push (no aplica en MVP).
* `AnthropicProvider` operativo (solo stub).
* Cap por evento de regeneraciones distinto al global (cap operativo = `SEC-POL-AI-007`).

### Scope Notes

* La sugerencia IA nunca crea tareas oficiales sin confirmación humana.
* La regeneración crea un nuevo `AIRecommendation`; el anterior conserva su `status`.
* No introduce migraciones nuevas: reutiliza fundación IA y `event_tasks`/`ai_recommendations`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Generación exitosa de checklist con HITL pending

**Given** un organizador autenticado dueño de un evento en `status ∈ {draft, active}` con `event_date` definida y `language_code` válido
**When** invoca `POST /api/v1/events/:eventId/ai/checklist`
**Then** el backend ejecuta `GenerateChecklistUseCase` vía `LLMProvider`, valida el output con Zod, persiste `AIRecommendation { type='checklist', status='pending', edited=false, fallback_used=false }` con el JSON crudo y devuelve `200` con el checklist agrupado por fase T-x
**And** **no** crea ni modifica `EventTask` en esta US (la materialización ocurre al aceptar en US-031).

### AC-02: Idioma respetado

**Given** un evento con `language_code='pt'`
**When** se genera el checklist
**Then** el contenido textual de cada tarea (título, descripción) está en portugués
**And** `AIRecommendation.language_code='pt'`.

### AC-03: Trazabilidad completa

**Given** un checklist generado
**When** se persiste
**Then** `AIRecommendation` incluye `prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`, `event_id`, `created_at`, `type='checklist'`, `status='pending'`, `edited=false`.

### AC-04: Estructura del checklist

**Given** un checklist generado
**When** la UI lo recibe
**Then** las tareas vienen agrupadas por las fases `T-180`, `T-90`, `T-30`, `T-7`, `T-1` (cada tarea incluye `title`, `description`, `category`, `due_relative_days`, `priority`)
**And** se muestran con badge "Sugerido por IA" y acciones placeholder hacia US-031 (`Confirmar tareas seleccionadas`, `Regenerar`, `Descartar`).

---

## ⚠️ Edge Cases

### EC-01: Fecha del evento muy próxima

**Given** un evento cuyo `event_date - now() < 180 días` (por ejemplo 3 días)
**When** se solicita el checklist
**Then** el backend incluye solo tareas cuyas `due_relative_days <= (event_date - now())` (filtra T-x inaplicables)
**And** persiste el `AIRecommendation` con el JSON ya filtrado.

#### Handling

* Filtro determinista en el use case antes de persistir.

---

### EC-02: Timeout 60s (`NFR-AI-003`, Decisión PO 8.1 #9)

**Given** la invocación al LLM excede 60 s
**When** el sistema detecta el timeout
**Then** en producción retorna `5xx AI_TIMEOUT` y persiste `AIRecommendation { status='failed', fallback_used=false }`
**And** en modo demo (`LLM_PROVIDER=mock` o `AI_DEMO_MODE=true`) cae a `MockAIProvider`, retorna `200` y persiste `AIRecommendation { status='pending', fallback_used=true }`.

#### Handling

* UI: banner con mensaje y reintento.

---

### EC-03: JSON inválido (`NFR-AI-005`)

**Given** el LLM responde con JSON que no cumple el schema Zod
**When** la validación falla
**Then** el backend reintenta una vez con prompt reforzado; si vuelve a fallar, retorna `5xx AI_INVALID_OUTPUT` y persiste `AIRecommendation { status='failed' }`.

#### Handling

* Logging con `correlation_id`, `provider`, `prompt_version_id` y muestra truncada (sin PII).

---

### EC-04: Provider no disponible

**Given** `OpenAIProvider` no responde o responde con 5xx
**When** se invoca la generación
**Then** en modo demo se usa `MockAIProvider` (`fallback_used=true`)
**And** en producción retorna `5xx AI_PROVIDER_ERROR`.

---

### EC-05: Rate limit IA excedido (`SEC-POL-AI-007`)

**Given** el organizador ya ejecutó 20 invocaciones IA en la última hora
**When** invoca este endpoint
**Then** el backend retorna `429 RATE_LIMITED` con `Retry-After` y no persiste `AIRecommendation`.

---

## 🚫 Validation Rules

| ID    | Rule                                                            | Message / Behavior          |
| ----- | --------------------------------------------------------------- | --------------------------- |
| VR-01 | `eventId` debe ser UUID v4                                      | `400 VALIDATION`            |
| VR-02 | El evento debe existir y pertenecer al organizador autenticado  | `403 FORBIDDEN` o `404 NOT_FOUND` |
| VR-03 | `event_date` definida                                            | `400 VALIDATION`            |
| VR-04 | `language_code` ∈ `{es, en, pt, fr}`                            | `400 VALIDATION`            |
| VR-05 | El evento no debe estar en `status ∈ {cancelled, completed, deleted}` | `409 CONFLICT`         |
| VR-06 | Cada tarea generada con `due_relative_days >= 0`                | Filtrada del output         |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria sobre el evento (`event.owner_user_id === actor.id`).                          |
| SEC-02 | Rate limit IA `SEC-POL-AI-007`: 20 invocaciones por usuario por hora; respuesta `429 RATE_LIMITED`.   |
| SEC-03 | Logs estructurados sin PII completa; redactar email, teléfono y direcciones.                          |
| SEC-04 | Backend-only: el frontend nunca llama directamente al LLM.                                            |
| SEC-05 | Persistir `AIRecommendation` con `correlation_id` y metadata canónica.                                |
| SEC-06 | No exponer claves del proveedor; `OPENAI_API_KEY` solo en backend vía Secrets Manager.                |

### Negative Authorization Scenarios

* Organizer no dueño → `403`/`404`.
* Vendor autenticado → `403`.
* Admin autenticado → `403` (no es flujo admin).
* Anónimo / sesión inválida → `401`.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: AI-002 (`ChecklistPrompt v1`).
* Provider Layer: `LLMProvider` (`OpenAIProvider` en prod, `MockAIProvider` en demo/tests, `AnthropicProvider` stub).
* Human Validation Required: Yes.
* Persist `AIRecommendation`: Yes.
* Fallback Required: Yes (modo demo a `MockAIProvider`).

### AI Input

* `event.event_type_code`
* `event.event_date`
* `event.guest_count`
* `event.language_code`

### AI Output

* JSON estructurado validado con Zod:
  ```jsonc
  {
    "tasks": [
      {
        "title": "...",
        "description": "...",
        "category": "...",
        "due_relative_days": 180,
        "phase": "T-180",
        "priority": "low" | "medium" | "high"
      }
    ]
  }
  ```
* `phase ∈ {T-180, T-90, T-30, T-7, T-1}` y consistente con `due_relative_days`.

### Human-in-the-loop Rules

* La generación produce únicamente `AIRecommendation { status='pending' }`.
* Las tareas (`EventTask`) se crean solo al aceptar (US-031).
* Edición/eliminación individual viven en US-028/US-029 una vez materializadas.
* Regeneración crea un nuevo `AIRecommendation`.

### AI Error / Fallback Behavior

* Timeout 60 s → `AI_TIMEOUT` (o fallback Mock en demo).
* JSON inválido → 1 reintento; si falla, `AI_INVALID_OUTPUT`.
* Provider error → fallback Mock en demo / `AI_PROVIDER_ERROR` en producción.
* Toda falla persiste `AIRecommendation { status='failed' }` con metadata.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events/:id/ai/checklist`                                    |
| Main UI Pattern     | Lista agrupada por fase T-x con badge "Sugerido por IA"                          |
| Primary Action      | Placeholder hacia US-031 ("Confirmar tareas seleccionadas")                       |
| Secondary Actions   | "Regenerar" (US-026), "Descartar" (US-025)                                        |
| Empty State         | CTA "Generar checklist IA"                                                       |
| Loading State       | Skeleton + mensaje "Puede tomar hasta 60 segundos." con `aria-live="polite"`     |
| Error State         | Banner con `error.code` traducido + botón de reintento                            |
| Success State       | Lista renderizada con badges y acciones placeholder                               |
| Accessibility Notes | Grupos por fase con `role="region"` y `aria-labelledby` por encabezado de fase    |
| Responsive Notes    | Mobile-first                                                                     |
| i18n Notes          | Output IA en `language_code` del evento; copy UI en `locale` de la app            |
| Currency Notes      | No aplica                                                                        |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/organizer/events/:id/ai/checklist`.
* Components: `AIChecklistGenerator`, `AIChecklistViewer`, `AIBadge` (compartido con US-017).
* State Management: TanStack `useGenerateAIChecklist` (mutation), cache `['ai','event', eventId,'checklist']`.
* Forms: No aplica en esta US (la selección/confirmación vive en US-031).
* API Client: `aiApi.generateChecklist(eventId)`.

### Backend

* Use Case / Service: `GenerateChecklistUseCase` (orquesta `LLMProvider`, validación, retry, filtro T-x, persistencia).
* Controller / Route: `POST /api/v1/events/:eventId/ai/checklist`.
* Authorization Policy: Ownership + rate limit `SEC-POL-AI-007`.
* Validation: Zod `eventChecklistParamsSchema` (`{ eventId: uuid }`) + verificación de `event_date` y `language_code`.
* Transaction Required: Sí, para persistir `AIRecommendation` (sin tocar `event_tasks`).

### Database

* Main Tables:
  * `ai_recommendations` (insert, `type='checklist'`).
  * `ai_prompt_versions` (read; semilla de `ChecklistPrompt v1`).
  * `events` (read con ownership).
  * `event_tasks` no se toca en esta US.
* Constraints: reutiliza enums (`ai_recommendation_status`, `ai_recommendation_type`).
* Index Considerations: reutiliza `ai_recommendations(event_id, type, status, created_at)` provisto por PB-P0-001 / US-101.

### API

| Method | Endpoint                                            | Purpose                                  |
| ------ | --------------------------------------------------- | ---------------------------------------- |
| POST   | `/api/v1/events/:eventId/ai/checklist`              | Generar checklist IA en `status=pending` |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes (`ai.checklist.requested|generated|failed|fallback`).
* AdminAction Required: No.
* AIRecommendation Required: Yes (siempre, incluso en falla).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                            | Type        |
| ----- | ------------------------------------------------------------------- | ----------- |
| TS-01 | Generación exitosa con `MockAIProvider` determinista                | Integration |
| TS-02 | Persistencia de `AIRecommendation` con metadata completa            | Integration |
| TS-03 | Generación con `language_code='pt'` produce contenido pt             | Integration |
| TS-04 | Evento próximo (3 días) filtra tareas con T-x > días disponibles     | Integration |
| TS-05 | E2E: organizador genera checklist y lo ve en pending (Playwright)    | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result          |
| ----- | ----------------------------------------------------- | ------------------------ |
| NT-01 | Evento ajeno                                          | `403`/`404`              |
| NT-02 | Vendor invoca                                         | `403`                    |
| NT-03 | Admin invoca                                          | `403`                    |
| NT-04 | `event_date` ausente                                  | `400 VALIDATION`         |
| NT-05 | `language_code` no soportado                          | `400 VALIDATION`         |
| NT-06 | Evento `cancelled` / `completed` / `deleted`          | `409 CONFLICT`           |
| NT-07 | Anónimo                                               | `401 UNAUTHORIZED`       |

### AI Tests

| ID       | Scenario                                                       | Expected Result                                  |
| -------- | -------------------------------------------------------------- | ------------------------------------------------ |
| AI-TS-01 | `MockAIProvider` devuelve checklist válido                     | `AIRecommendation` pending con metadata           |
| AI-TS-02 | Timeout 60 s en producción                                     | `5xx AI_TIMEOUT` + `AIRecommendation` failed     |
| AI-TS-03 | Timeout 60 s en modo demo                                      | Fallback Mock; `fallback_used=true`; pending     |
| AI-TS-04 | JSON inválido + retry exitoso                                  | Checklist válido; `AIRecommendation` pending     |
| AI-TS-05 | JSON inválido en retry                                         | `5xx AI_INVALID_OUTPUT`; failed                  |
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

* Grupos por fase con headings y `role="region"`.
* Anuncio `aria-live="polite"` al completarse o fallar la generación.
* Navegación por teclado entre fases y tareas.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Time to Plan (TTP), completitud de checklist         |
| Expected Impact     | Reduce esfuerzo manual y omisiones                   |
| Success Criteria    | ≥ 60% de tareas IA generadas son confirmadas (medido conjuntamente con US-031) |
| Academic Demo Value | Demuestra HITL: el JSON IA convive con la confirmación humana antes de materializar tareas |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Página `/[locale]/organizer/events/:id/ai/checklist` y `AIChecklistGenerator`.
* Componente `AIChecklistViewer` con grupos por fase y badge.
* Hook `useGenerateAIChecklist` y cliente `aiApi.generateChecklist`.
* i18n y a11y para 4 locales.

### Potential Backend Tasks

* `GenerateChecklistUseCase` con `LLMProvider`, validación Zod, retry y filtro T-x.
* Endpoint con rate limit `SEC-POL-AI-007`.
* Repositorios de `AIRecommendation` y `AIPromptVersion`.
* Logging estructurado + métricas.

### Potential Database Tasks

* Verificación de fundación IA (sin migraciones nuevas).

### Potential AI / PromptOps Tasks

* Registrar `ChecklistPrompt v1` (registry US-121 + `ai_prompt_versions`).
* Respuestas deterministas en `MockAIProvider` por idioma.

### Potential QA Tasks

* Tests deterministas con Mock.
* Pruebas de timeout con clock injectable.
* Tests de rate limit y de filtrado T-x.

### Potential DevOps / Config Tasks

* Verificación de Secrets Manager (`OPENAI_API_KEY`).

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-AI-002/009`, `UC-AI-002`, `BR-AI-001..011`, `BR-TASK-002..006/010`).
* [x] Permisos identificados (ownership + `SEC-POL-AI-007`).
* [x] Entidades listadas (`Event`, `AIRecommendation`, `AIPromptVersion`).
* [x] AC en GWT (HITL inicial, sin materialización de `EventTask`).
* [x] Edge cases documentados (evento próximo, timeout, JSON inválido, provider error, rate limit).
* [x] Validación clara.
* [x] Out of Scope explícito (confirmación bulk en US-031, materialización al aceptar).
* [x] Dependencias conocidas (PB-P1-011, PB-P0-009..011, PB-P1-015, PB-P0-007, PB-P0-014).
* [x] UX states identificados.
* [x] API definida (`POST /api/v1/events/:eventId/ai/checklist`).
* [x] Tests definidos.
* [ ] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint y UI funcionales con HITL enforced (`status='pending'`, sin `EventTask` creado).
* [ ] `AIRecommendation` persistido con trazabilidad completa.
* [ ] Fallback `MockAIProvider` operativo en demo y determinista en tests.
* [ ] Rate limit IA `SEC-POL-AI-007` aplicado y verificado.
* [ ] Filtrado T-x cuando `event_date` está próximo.
* [ ] Tests funcionales, negativos, IA y de autorización verdes en CI.
* [ ] PO valida en demo.

---

## 📝 Notes

* Documentation Alignment Required: `/docs/16-API-Design-Specification.md` ya documenta `POST /events/:eventId/ai/checklist`; verificar que el snapshot OpenAPI esté regenerado vía US-098.
* Documentation Alignment Required: `/docs/8-Use-Cases-Specification.md` describe `UC-AI-002` con semántica de "revisión del plan IA"; `/docs/9-Functional-Requirements-Document.md` lo mapea correctamente a AI-002 (checklist). Mantener el mapeo del FRD y abrir nota para alinear `/docs/8`.
* La nota previa "Confirmar límite de tareas por generación (sugerido 20)" se delega como pregunta no bloqueante: el cap operativo viene por el bounding del prompt LLM y por el cap de bulk en US-031 (50 IDs). Para esta US no se introduce cap por evento.
* La confirmación bulk previamente listada en AC-02/Technical Notes se movió a US-031 (PB-P1-017) por scope.
