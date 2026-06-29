# 🧾 User Story: Generar plan IA de mi evento (AI-001)

## 🆔 Metadata

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| ID                 | US-017                                             |
| Epic               | EPIC-AIP-001 — AI-Assisted Event Planning          |
| Backlog Item       | PB-P1-011 — Generar plan IA del evento (timeline + categorías) |
| UI Surface         | PB-P1-044                                          |
| Feature            | AI-001 — Generación de plan IA                     |
| Module / Domain    | AI / Events                                        |
| User Role          | Organizer                                          |
| Priority           | Must Have                                          |
| Status             | Approved                                           |
| Owner              | Product Owner / Business Analyst                   |
| Approved By        | PO/BA Review                                       |
| Approval Date      | 2026-06-25                                         |
| Ready for Development Tasks | Yes                                       |
| Sprint / Milestone | MVP                                                |
| Created Date       | 2026-06-09                                         |
| Last Updated       | 2026-06-25                                         |

---

## 🎯 User Story

**As an** organizador con un evento creado
**I want** generar un plan IA estructurado (timeline + categorías sugeridas + recomendaciones iniciales) a partir de los datos del evento
**So that** tenga un punto de partida claro y reduzca el tiempo de planificación a menos de 10 minutos

---

## 🧠 Business Context

### Context Summary

AI-001 es la feature IA inaugural del flujo de planificación. Toma como input los datos del evento (tipo, fecha, invitados, ciudad, presupuesto, idioma) e invoca al `LLMProvider` para devolver un plan estructurado que el organizador puede aceptar, editar o descartar. La sugerencia es **HITL** (Human-in-the-loop): no se materializa como tarea ni presupuesto oficial hasta que el organizador confirma. Cada generación persiste un `AIRecommendation` con trazabilidad completa.

### Related Domain Concepts

* `AIRecommendation` con `status ∈ {pending, accepted, rejected, discarded, failed, expired}` y flags `edited`, `fallback_used`.
* `LLMProvider` (`OpenAIProvider` en producción, `MockAIProvider` en demo/tests, `AnthropicProvider` como stub futuro).
* `AIPromptVersion` (catálogo en código + tabla `ai_prompt_versions` para trazabilidad histórica).

### Assumptions

* `AI-001` corresponde al prompt `EventPlanPrompt v1` versionado en `AIPromptVersion`.
* La regeneración del plan se gobierna por la política global de rate limit IA (`SEC-POL-AI-007`: 20 invocaciones por usuario por hora) y el flujo dedicado de regeneración con feedback se modela en US-026.
* El idioma del evento se incluye explícitamente en el prompt y se propaga al campo `language_code` del `AIRecommendation`.
* La feature opera siempre vía backend; el frontend nunca invoca el LLM directamente.

### Dependencies

* PB-P0-009..011 — Foundation IA (`LLMProvider`, `MockAIProvider`, `AIRecommendation`, prompt registry).
* PB-P1-006 — Creación de evento (`Event` con datos completos).
* PB-P0-014 — Observabilidad mínima IA (latencia, fallback, errores).
* PB-P0-007 — Rate limit IA (`SEC-POL-AI-007`).

---

## 🔗 Traceability

| Source                 | Reference                                                                 |
| ---------------------- | ------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-011                                                                 |
| FRD Requirement(s)     | FR-AI-001 (plan), FR-AI-003 (HITL), FR-AI-004 (AIRecommendation), FR-AI-009 (timeout/fallback), FR-AI-017 (idioma) |
| Use Case(s)            | UC-AI-001                                                                 |
| Business Rule(s)       | BR-AI-001..006, BR-AI-011                                                 |
| Permission Rule(s)     | Ownership del evento; rate limit IA `SEC-POL-AI-007` (20/usuario/hora)    |
| Data Entity / Entities | `Event`, `AIRecommendation`, `AIPromptVersion`                            |
| API Endpoint(s)        | `POST /api/v1/events/:eventId/ai/event-plan`                              |
| NFR Reference(s)       | NFR-AI-003 (timeout 60s), NFR-AI-005 (validación JSON con 1 reintento), NFR-AI-007 (`LLMProvider`), NFR-AI-008 (`MockAIProvider` determinista) |
| Related ADR(s)         | ADR-AI-001 (LLMProvider abstraction)                                       |
| PO Decision(s)         | Decisión PO 8.1 #9 (timeout/fallback), Decisión PO 8.1 #15 (Anthropic stub) |
| Related Document(s)    | `/docs/7` (AI Features), `/docs/17` (AI Architecture & PromptOps), `/docs/19` (`SEC-POL-AI-007`), `/docs/18` (`ai_recommendations`, `ai_prompt_versions`), `/docs/8.1` (#9, #15) |

---

## 🧩 PO/BA Decisions Applied

1. **Decisión PO 8.1 #9** — Timeout LLM: 60 s; ante exceso, error controlado en producción o fallback a `MockAIProvider` en modo demo/testing. Estado: Resuelta.
2. **Decisión PO 8.1 #15** — `AnthropicProvider` queda como stub funcional para MVP (interfaz preparada, no operativo). Estado: Resuelta.
3. **HITL obligatorio (BR-AI-001..003)** — La sugerencia nace en `status='pending'`; solo el organizador puede `accept`/`edit`/`discard`. La IA no toma decisiones autónomas.
4. **Rate limit IA global (`SEC-POL-AI-007`)** — 20 invocaciones IA por usuario por hora. Aplica a la generación inicial y a regeneraciones; respuesta `429 RATE_LIMITED` cuando se excede.
5. **Endpoint canónico** — `POST /api/v1/events/:eventId/ai/event-plan` conforme a `/docs/16`.
6. **Status enum canónico de `AIRecommendation`** — `(pending, accepted, rejected, discarded, failed, expired)`; `edited` es una flag booleana independiente.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Chatbot conversacional libre.
* RAG / vector DB.
* Generación IA de imágenes.
* Decisiones autónomas (la IA no aprueba, no reserva, no comunica con vendors).
* Materialización automática del plan como tareas/presupuesto oficiales.
* Moderación automática.
* `AnthropicProvider` operativo (solo stub en MVP).
* Cap por evento de regeneraciones (gestionado por rate limit global y, si aplica, formalizado en US-026).

### Scope Notes

* La sugerencia IA nunca reemplaza tareas ni presupuesto oficiales sin confirmación humana.
* La regeneración del plan crea un nuevo `AIRecommendation` (no modifica el anterior); la versión anterior se conserva con su `status`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Generación exitosa

**Given** un organizador autenticado dueño de un evento en `status ∈ {draft, active}` con datos completos (tipo, fecha, invitados, ciudad, presupuesto, idioma)
**When** invoca `POST /api/v1/events/:eventId/ai/event-plan`
**Then** el backend ejecuta `GenerateEventPlanUseCase` vía `LLMProvider`, valida el output con Zod, persiste un `AIRecommendation { type='event_plan', status='pending', edited=false, fallback_used=false }` y devuelve `200` con el plan estructurado
**And** la UI lo muestra con badge "Sugerido por IA" y acciones HITL "Aceptar", "Editar", "Regenerar", "Descartar".

### AC-02: Idioma respetado

**Given** un evento con `language_code='pt'`
**When** se genera el plan
**Then** el contenido textual del plan está en portugués
**And** `AIRecommendation.language_code='pt'`.

### AC-03: Trazabilidad completa en `AIRecommendation`

**Given** un plan generado
**When** se persiste
**Then** `AIRecommendation` incluye los campos: `prompt_version_id` (FK a `AIPromptVersion`), `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`, `event_id` y `created_at`.

### AC-04: HITL — status inicial pending

**Given** un plan generado
**When** se devuelve al frontend
**Then** `AIRecommendation.status='pending'` y `edited=false`
**And** no se crean tareas oficiales ni se modifica el presupuesto hasta una acción explícita del organizador (cubierta en US-025/US-027/US-028).

---

## ⚠️ Edge Cases

### EC-01: Timeout 60s (`NFR-AI-003`, Decisión PO 8.1 #9)

**Given** la llamada al LLM excede 60 segundos
**When** el sistema detecta el timeout
**Then** en producción retorna `5xx AI_TIMEOUT` (envelope unificado) y se persiste `AIRecommendation { status='failed', fallback_used=false }`
**And** en modo demo (`LLM_PROVIDER=mock` o `AI_DEMO_MODE=true`) se cae a `MockAIProvider`, se retorna `200` y se persiste `AIRecommendation { status='pending', fallback_used=true }`.

#### Handling

* UI: banner con mensaje "No fue posible generar el plan, intenta de nuevo." y botón de reintento.

---

### EC-02: JSON inválido del LLM (`NFR-AI-005`)

**Given** el LLM responde con JSON malformado o que no cumple el schema Zod
**When** la validación falla
**Then** el backend hace un único reintento con prompt corregido; si vuelve a fallar, retorna `5xx AI_INVALID_OUTPUT` y persiste `AIRecommendation { status='failed' }`.

#### Handling

* Logging con `correlation_id`, `provider`, `prompt_version_id` y muestra truncada del output (sin PII).

---

### EC-03: Provider no disponible

**Given** `OpenAIProvider` no responde o responde con error 5xx
**When** se invoca la generación
**Then** en modo demo se usa `MockAIProvider` y se marca `fallback_used=true`
**And** en producción se retorna `5xx AI_PROVIDER_ERROR` con `correlationId` en el envelope.

#### Handling

* Selector por env var `LLM_PROVIDER` (y/o `AI_DEMO_MODE`).

---

### EC-04: Rate limit IA excedido (`SEC-POL-AI-007`)

**Given** el organizador ya ejecutó 20 invocaciones IA en la última hora
**When** invoca nuevamente este endpoint
**Then** el backend retorna `429 RATE_LIMITED` con `Retry-After` y no se persiste `AIRecommendation`.

#### Handling

* UI: aviso de límite alcanzado y sugerencia de reintentar más tarde.

---

## 🚫 Validation Rules

| ID    | Rule                                                                              | Message / Behavior                |
| ----- | --------------------------------------------------------------------------------- | --------------------------------- |
| VR-01 | `eventId` debe ser UUID v4                                                        | `400 VALIDATION`                  |
| VR-02 | El evento debe existir y pertenecer al organizador autenticado                    | `403 FORBIDDEN` o `404 NOT_FOUND` |
| VR-03 | Datos completos del evento: `event_type_code`, `event_date`, `guest_count`, `budget_estimated`, `currency_code`, `city`, `language_code` | `400 VALIDATION` con `details` por campo faltante |
| VR-04 | `language_code` ∈ `{es, en, pt, fr}`                                              | `400 VALIDATION`                  |
| VR-05 | El evento no debe estar en `status ∈ {cancelled, completed, deleted}`             | `409 CONFLICT`                    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria sobre el evento (`event.owner_user_id === actor.id`).                          |
| SEC-02 | Rate limit IA `SEC-POL-AI-007`: 20 invocaciones por usuario por hora; respuesta `429 RATE_LIMITED`.   |
| SEC-03 | Logs estructurados sin PII completa; redactar email, teléfono y direcciones.                          |
| SEC-04 | Backend-only: el frontend nunca llama directamente al LLM ni a la API de OpenAI.                      |
| SEC-05 | Persistir `AIRecommendation` con trazabilidad completa incluyendo `correlation_id`.                   |
| SEC-06 | No exponer claves de proveedor; `OPENAI_API_KEY` solo en backend vía Secrets Manager.                 |

### Negative Authorization Scenarios

* Organizer no dueño del evento → `403 FORBIDDEN` (o `404 NOT_FOUND` si la política de privacidad lo prefiere).
* Vendor autenticado → `403 FORBIDDEN`.
* Admin autenticado → `403 FORBIDDEN` (no es flujo admin).
* Anónimo / sesión inválida → `401 UNAUTHORIZED`.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: AI-001 (`EventPlanPrompt v1`).
* Provider Layer: `LLMProvider` (`OpenAIProvider` en producción, `MockAIProvider` en demo/tests, `AnthropicProvider` stub).
* Human Validation Required: Yes.
* Persist `AIRecommendation`: Yes.
* Fallback Required: Yes (modo demo a `MockAIProvider`).

### AI Input

* `event.event_type_code`
* `event.event_date`
* `event.guest_count`
* `event.budget_estimated`
* `event.currency_code`
* `event.city`
* `event.language_code`

### AI Output

* JSON estructurado validado con Zod:
  ```jsonc
  {
    "timeline": [
      { "phase": "T-180", "milestones": ["..."] },
      { "phase": "T-90", "milestones": ["..."] },
      { "phase": "T-30", "milestones": ["..."] },
      { "phase": "T-7", "milestones": ["..."] },
      { "phase": "T-1", "milestones": ["..."] }
    ],
    "suggested_categories": ["..."],
    "general_recommendations": ["..."]
  }
  ```

### Human-in-the-loop Rules

* El plan se entrega en `status='pending'` y `edited=false`.
* Solo el organizador puede ejecutar `accept`, `edit`, `discard` (cubiertas en US-025).
* La regeneración crea un nuevo `AIRecommendation`; el anterior conserva su `status`.
* Ninguna acción IA muta tareas, presupuesto, reservas ni reseñas sin acción humana.

### AI Error / Fallback Behavior

* Timeout 60 s → `AI_TIMEOUT` (o fallback Mock en demo).
* JSON inválido → 1 reintento controlado; si falla, `AI_INVALID_OUTPUT`.
* Provider error → fallback Mock en demo / `AI_PROVIDER_ERROR` en producción.
* Toda falla persiste `AIRecommendation { status='failed' }` con metadata para análisis.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events/:id/ai/plan`                                             |
| Main UI Pattern     | Vista de sugerencia con secciones (Timeline, Categorías, Recomendaciones) + acciones HITL |
| Primary Action      | "Aceptar plan" (delegada a US-025)                                                    |
| Secondary Actions   | "Editar" (US-025), "Regenerar" (US-026), "Descartar" (US-025)                          |
| Empty State         | CTA "Generar plan IA"                                                                |
| Loading State       | Skeleton + mensaje de progreso indicando latencia esperada (hasta 60 s)               |
| Error State         | Banner con razón legible y botón de reintento; en demo, fallback transparente         |
| Success State       | Plan visible con badge "Sugerido por IA"                                              |
| Accessibility Notes | Sugerencias con `role="region"` y `aria-live="polite"`; anuncio al completarse        |
| Responsive Notes    | Mobile-first                                                                         |
| i18n Notes          | Output IA en el `language_code` del evento; copy UI en el `locale` de la app          |
| Currency Notes      | Si el plan menciona montos, en la moneda del evento; sin conversión automática        |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/organizer/events/:id/ai/plan`.
* Components: `AIPlanGenerator`, `AISuggestionViewer`, `AIBadge`.
* State Management: TanStack `useGenerateAIPlan` con manejo de loading prolongado (hasta 60 s) y reintentos.
* Forms: No aplica.
* API Client: `aiApi.generateEventPlan(eventId)`.

### Backend

* Use Case / Service: `GenerateEventPlanUseCase` (orquesta `LLMProvider`, validación Zod, persistencia `AIRecommendation`).
* Controller / Route: `POST /api/v1/events/:eventId/ai/event-plan`.
* Authorization Policy: Ownership + rate limit `SEC-POL-AI-007`.
* Validation: `eventId` UUID + datos completos del evento + `language_code` válido.
* Transaction Required: Sí, para persistir `AIRecommendation`.

### Database

* Main Tables: `ai_recommendations`, `ai_prompt_versions`, `events`.
* Constraints: FK `ai_recommendations.event_id → events.id`; FK `ai_recommendations.prompt_version_id → ai_prompt_versions.id`.
* Index Considerations: índice por (`event_id`, `type`, `status`, `created_at`) ya cubierto por PB-P0-001 / US-101.

### API

| Method | Endpoint                                          | Purpose                |
| ------ | ------------------------------------------------- | ---------------------- |
| POST   | `/api/v1/events/:eventId/ai/event-plan`           | Generar plan IA        |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes (`ai.event-plan.generated`, `ai.event-plan.failed`, `ai.event-plan.fallback`).
* AdminAction Required: No.
* AIRecommendation Required: Yes (siempre, incluso en falla).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                  | Type        |
| ----- | --------------------------------------------------------- | ----------- |
| TS-01 | Generación exitosa con `MockAIProvider` determinista      | Integration |
| TS-02 | Persistencia de `AIRecommendation` con metadata completa  | Integration |
| TS-03 | E2E: organizador genera plan y lo ve en pending           | E2E         |
| TS-04 | Generación con `language_code='pt'` retorna contenido pt   | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result          |
| ----- | ----------------------------------------------------- | ------------------------ |
| NT-01 | Evento ajeno                                          | `403`/`404`              |
| NT-02 | Vendor invoca el endpoint                             | `403`                    |
| NT-03 | Admin invoca el endpoint                              | `403`                    |
| NT-04 | Datos del evento incompletos                          | `400 VALIDATION`         |
| NT-05 | `language_code` no soportado                          | `400 VALIDATION`         |
| NT-06 | Evento `cancelled` / `completed` / `deleted`          | `409 CONFLICT`           |
| NT-07 | Anónimo                                               | `401 UNAUTHORIZED`       |

### AI Tests

| ID       | Scenario                                                       | Expected Result                                  |
| -------- | -------------------------------------------------------------- | ------------------------------------------------ |
| AI-TS-01 | `MockAIProvider` devuelve respuesta válida                     | Plan estructurado y `AIRecommendation` pending   |
| AI-TS-02 | Timeout 60 s en producción                                     | `5xx AI_TIMEOUT` + `AIRecommendation` failed     |
| AI-TS-03 | Timeout 60 s en modo demo                                      | Fallback Mock; `fallback_used=true`; status pending |
| AI-TS-04 | JSON inválido + retry exitoso                                  | Plan válido; `AIRecommendation` pending          |
| AI-TS-05 | JSON inválido en retry                                         | `5xx AI_INVALID_OUTPUT`; `AIRecommendation` failed |
| AI-TS-06 | `OpenAIProvider` 5xx                                           | Fallback Mock en demo / `AI_PROVIDER_ERROR` en prod |
| AI-TS-07 | Rate limit excedido                                            | `429 RATE_LIMITED` con `Retry-After`             |

### Authorization Tests

| ID         | Scenario            | Expected Result    |
| ---------- | ------------------- | ------------------ |
| AUTH-TS-01 | Organizer dueño     | `200`              |
| AUTH-TS-02 | Organizer no dueño  | `403`/`404`        |
| AUTH-TS-03 | Vendor              | `403`              |
| AUTH-TS-04 | Admin               | `403`              |
| AUTH-TS-05 | Anónimo             | `401`              |

### Accessibility Tests

* Sugerencia con `role="region"` y label asociado.
* Anuncio `aria-live="polite"` al completarse o fallar la generación.
* Foco accesible en los botones de acción HITL.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Time to Plan (TTP), tasa de activación IA            |
| Expected Impact     | Reduce TTP a menos de 10 minutos                     |
| Success Criteria    | ≥ 70% de organizadores aceptan o editan el plan generado |
| Academic Demo Value | Core demo: muestra IA + HITL + trazabilidad + fallback determinista |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Página generador con HITL.
* Manejo de loading prolongado y reintentos.
* Componentes `AIPlanGenerator`, `AISuggestionViewer`, `AIBadge`.
* i18n para 4 locales y mensajes de error.

### Potential Backend Tasks

* `GenerateEventPlanUseCase` + integración `LLMProvider`.
* Persistencia `AIRecommendation` con metadata completa.
* Validación de output con Zod y retry controlado.
* Endpoint con rate limit `SEC-POL-AI-007`.

### Potential Database Tasks

* Verificar tabla `ai_recommendations`, `ai_prompt_versions` y enums (cubierto por PB-P0-009..011).

### Potential AI / PromptOps Tasks

* Registrar `EventPlanPrompt v1` en `ai_prompt_versions` y en el catálogo de código.
* Respuestas deterministas en `MockAIProvider`.

### Potential QA Tasks

* Tests deterministas con `MockAIProvider`.
* Pruebas de timeout con clock injectable.
* Tests de rate limit.

### Potential DevOps / Config Tasks

* Configurar `LLM_PROVIDER`, `OPENAI_API_KEY`, `AI_DEMO_MODE` vía Secrets Manager.

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer dueño del evento).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (`FR-AI-001/003/004/009/017`, `UC-AI-001`, `BR-AI-001..006/011`).
* [x] Permisos identificados (ownership + `SEC-POL-AI-007`).
* [x] Entidades listadas (`Event`, `AIRecommendation`, `AIPromptVersion`).
* [x] AC en GWT.
* [x] Edge cases documentados (timeout, JSON inválido, provider error, rate limit).
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P0-009..011, PB-P1-006, PB-P0-014, PB-P0-007).
* [x] UX states identificados.
* [x] API definida (`POST /api/v1/events/:eventId/ai/event-plan`).
* [x] Tests definidos.
* [ ] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint y UI funcionales con HITL enforced.
* [ ] `AIRecommendation` persistido con trazabilidad completa (`prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`).
* [ ] Fallback `MockAIProvider` operativo en demo y determinista en tests.
* [ ] Rate limit IA `SEC-POL-AI-007` aplicado y verificado.
* [ ] Tests funcionales, negativos, IA y de autorización verdes en CI.
* [ ] PO valida en demo.

---

## 📝 Notes

* Documentation Alignment Required: `/docs/16-API-Design-Specification.md` ya documenta `POST /events/:eventId/ai/event-plan`; verificar que el snapshot OpenAPI esté regenerado (vía US-098) al integrar.
* La nota previa "máximo de regeneraciones por evento" se delega a US-026 (flujo de regeneración con feedback). Para esta US (generación inicial), el cap efectivo es el rate limit global `SEC-POL-AI-007`.
* Considerar caching de prompts y respuestas Mock en demo para latencia consistente (decisión técnica delegada a US-119 / `MockAIProvider`).
