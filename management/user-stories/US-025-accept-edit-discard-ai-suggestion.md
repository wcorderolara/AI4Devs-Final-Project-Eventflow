# 🧾 User Story: Aplicar, editar o descartar una sugerencia IA (HITL transversal)

## 🆔 Metadata

| Field              | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| ID                 | US-025                                                               |
| Epic               | EPIC-AIP-001 — AI-Assisted Event Planning                            |
| Backlog Item       | PB-P1-016 — HITL Accept / Edit / Discard transversal                 |
| UI Surface         | Componente reusable `HITLActions` invocado desde toda vista IA       |
| Feature            | HITL transversal sobre `AIRecommendation`                             |
| Module / Domain    | AI / Cross-cutting                                                   |
| User Role          | Organizer (own) / Vendor (own)                                        |
| Priority           | Must Have                                                            |
| Status             | Approved                                                             |
| Owner              | Product Owner / Business Analyst                                     |
| Approved By        | PO/BA Review                                                          |
| Approval Date      | 2026-06-26                                                           |
| Ready for Development Tasks | Yes                                                          |
| Sprint / Milestone | MVP                                                                  |
| Created Date       | 2026-06-09                                                           |
| Last Updated       | 2026-06-26                                                           |

---

## 🎯 User Story

**As an** usuario al que la IA le presentó una sugerencia (`event_plan`, `checklist`, `budget_suggestion`, `vendor_categories`, `quote_brief`, `quote_comparison`, `vendor_bio`, `task_prioritization`)
**I want** aplicar (aceptar), editar antes de aplicar, o descartar la sugerencia
**So that** mantenga el control completo de mis datos y la IA nunca convierta una sugerencia en dato oficial sin mi confirmación

---

## 🧠 Business Context

### Context Summary

HITL es transversal a EventFlow: toda sugerencia IA se persiste como `AIRecommendation` con `status='pending'` durante la generación (US-017..US-024). Esta historia formaliza los **dos endpoints comunes** de cierre del ciclo HITL definidos en `/docs/16` (sección 35.3):

* `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` — aplica la sugerencia y materializa los efectos colaterales según el `type`. Admite `editedPayload` opcional para editar antes de aplicar (`BR-AI-002`). Marca `status='accepted'`, `edited=true` cuando hubo edición, y enlaza la `AIRecommendation` con la entidad oficial creada.
* `POST /api/v1/ai-recommendations/:aiRecommendationId/discard` — descarta la sugerencia sin efectos. Marca `status='discarded'`.

El use case `ApplyAIRecommendationUseCase` orquesta los **side effects por tipo** vía un **strategy pattern** (`AIRecommendationApplyStrategyRegistry`), en una transacción atómica que actualiza el `AIRecommendation` y crea/modifica la entidad destino.

### Related Domain Concepts

* `AIRecommendation` (entidad central; ciclo de vida HITL).
* `AIRecommendation.type` ∈ `{event_plan, checklist, budget_suggestion, vendor_categories, quote_brief, quote_comparison, vendor_bio, task_prioritization}` (`/docs/16` líneas 1534–1543).
* `AIRecommendation.status` ∈ `{pending, accepted, rejected, discarded, failed, expired}` (`/docs/18` líneas 823, 1002).
* `AIRecommendation.edited: boolean` (flag de payload editado antes de aplicar).
* `AIRecommendation.applied_entity_type` y `applied_entity_id` (trazabilidad de la entidad oficial creada por el side effect, cuando aplica).
* `EventTask`, `BudgetItem`, `QuoteRequest`, `VendorProfile`, `VendorService` (entidades destino según `type`).
* `LLMProvider` (no se invoca en este flujo; el HITL es post-generación).

### Assumptions

* La `AIRecommendation` fue creada por el flujo de generación correspondiente (US-017..US-024) y está en `status='pending'`.
* El actor autenticado es el dueño de la `AIRecommendation` (organizador del evento asociado o vendor dueño del perfil, según `type`).
* El `editedPayload` (cuando se provee) cumple el mismo JSON Schema (`*OutputDto`) que valida la salida del LLM en la generación.
* Los efectos colaterales por tipo están definidos por las US específicas (US-017 plan, US-018 checklist, US-019 budget, US-020 categorías, US-021 brief, US-022 comparación, US-023 quote, US-024 bio, US-031 tareas priorizadas).
* La autoría humana posterior al `apply` es editable libremente por el usuario; este endpoint solo cubre el **cierre HITL**, no edita la entidad oficial después.

### Dependencies

* PB-P1-011 / US-017 — Fundación AI-001 (`LLMProvider`, `AIRecommendation`, prompt registry, repositorio, badge).
* PB-P1-012..PB-P1-015 / US-018, US-019, US-020, US-021 — Flujos de generación que producen `AIRecommendation` `pending`.
* PB-P1-017 — Confirmar tareas IA en bloque (consume el strategy de tipo `checklist` y `task_prioritization`).
* PB-P1-030 — Creación de `QuoteRequest` (consume el strategy de tipo `quote_brief` para persistir `brief` con `ai_generated_brief=true` y `ai_recommendation_id`).
* PB-P0-014 — Observabilidad IA (correlation IDs, logs estructurados).
* PB-P0-007 — Rate limit IA (`SEC-POL-AI-007`; aplica a la generación, no al HITL).

---

## 🔗 Traceability

| Source                 | Reference                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P1-016                                                                                 |
| FRD Requirement(s)     | FR-AI-019 (aceptar/editar/regenerar salida IA antes de persistir), FR-AI-018 (prompt versionado referenciado en `AIRecommendation`), FR-AI-001..008 (cada feature IA cuyo cierre es esta historia) |
| Use Case(s)            | UC-AI-002 (canónico HITL para AI-001), UC-AI-001..008 (esta historia formaliza la fase de aplicación/descarte transversal a todos) |
| Business Rule(s)       | BR-AI-001 (validación humana obligatoria), BR-AI-002 (editabilidad pre-confirmación), BR-AI-003 (badge sugerido vs confirmado), BR-AI-004 (IA no toma decisiones), BR-AI-010 (prompt versionado preservado al aplicar), BR-AI-013 (cache — out of scope MVP) |
| Permission Rule(s)     | Ownership: `actor.id === ai_recommendation.requested_by_user_id` (organizer/vendor según `type`); admin **no** participa en este flujo (`FR-ADMIN-010`) |
| Data Entity / Entities | `AIRecommendation`, y según `type`: `EventTask`, `BudgetItem`, `QuoteRequest`, `VendorProfile`, `VendorService`, `Event` |
| API Endpoint(s)        | `POST /api/v1/ai-recommendations/:aiRecommendationId/apply`, `POST /api/v1/ai-recommendations/:aiRecommendationId/discard` |
| NFR Reference(s)       | NFR-OBS-001 (correlation ID), NFR-OBS-002/003 (logs estructurados + redacción PII), NFR-SEC-005 (auditoría de cambios)              |
| Related ADR(s)         | ADR-AI-001 (`LLMProvider` abstraction; tangencial: el HITL no invoca al LLM)              |
| PO Decision(s)         | Decisión PO 8.1 nota canónica UC-AI-001..009 (HITL irrenunciable)                          |
| Related Document(s)    | `/docs/4` BR-AI-001..004/010, `/docs/6` (`AIRecommendation`), `/docs/7` AI-001..AI-008 (HITL), `/docs/8` UC-AI-002, `/docs/9` FR-AI-019, `/docs/10` NFR-OBS-001..003, `/docs/16` §35.3, §35.6, §35.8 (endpoints + flujo), `/docs/18` `ai_recommendation_status`, `/docs/19` (ownership + audit), `/docs/22` ADR-AI-001 |

---

## 🧩 PO/BA Decisions Applied

1. **HITL canónico irrenunciable (`BR-AI-001..004`, `FR-AI-019`)** — Ninguna salida IA puede convertirse en dato oficial sin acción humana explícita; la IA no toma decisiones autónomas; toda salida es editable antes del `apply`.
2. **Dos endpoints canónicos (`/docs/16` §35.3, líneas 1521–1522)** — `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` y `POST /api/v1/ai-recommendations/:aiRecommendationId/discard`. No se introduce un `PATCH` único: la API canónica de EventFlow modela las acciones HITL como dos verbos POST claramente diferenciados.
3. **`apply` admite `editedPayload` opcional** — El `apply` acepta un payload editado que reemplaza la salida original antes de materializar los side effects. Cuando hay edición, se marca `edited=true` y se persiste el `editedPayload` validado contra el `*OutputDto` correspondiente (`BR-AI-002`).
4. **State machine canónica (`/docs/18`)** — `status` transiciona desde `pending` solo a `accepted` (vía `apply`) o `discarded` (vía `discard`). Los estados terminales `rejected`, `failed` y `expired` son fijados por otros procesos (validación, error de generación, jobs de expiración) y no son destinos válidos desde estos endpoints HITL.
5. **Estado inmutable tras transición terminal** — Cualquier intento de transición sobre un `AIRecommendation` cuyo `status ∉ {pending}` devuelve `409 RECOMMENDATION_NOT_PENDING` sin side effects. Esto preserva la auditabilidad.
6. **Ownership backend-only** — Authorization Policy verifica `actor.id === ai_recommendation.requested_by_user_id`. Admin no participa en este flujo (`FR-ADMIN-010`). Para `type ∈ {vendor_bio}` y similares creados por vendor, ownership corresponde al vendor; para los `type` del organizador, al organizador.
7. **Transacción atómica `AIRecommendation` + side effect** — La actualización del `status` y la creación/modificación de la entidad destino ocurren en una sola transacción. Si el side effect falla, se revierte y se devuelve `5xx` sin alterar `status`.
8. **Strategy pattern por `type`** — `ApplyAIRecommendationUseCase` delega los side effects a un `AIRecommendationApplyStrategyRegistry` que registra una `ApplyStrategy` por cada `type`. Cada strategy se entrega como dependencia inyectable y se cubre con tests unitarios independientes.
9. **Side effects por `type` (MVP)** — Mapa canónico de side effects, alineado con `/docs/16` §35.8 y las US específicas:

   | `type`                | Side effect del `apply`                                                                 | US destino         |
   | --------------------- | --------------------------------------------------------------------------------------- | ------------------ |
   | `event_plan`          | Persiste `Event.ai_plan` con `ai_recommendation_id`; opcionalmente siembra fases.        | US-017             |
   | `checklist`           | Crea `EventTask[]` con `ai_generated=true`, `status='pending'`, `ai_recommendation_id`. | US-018             |
   | `budget_suggestion`   | Crea `BudgetItem[]` con `ai_generated=true`, `ai_recommendation_id`.                     | US-019             |
   | `vendor_categories`   | No materializa entidad; solo registra adopción / click-through.                          | US-020             |
   | `quote_brief`         | Marca el brief como listo para enviar; la creación de `QuoteRequest` con `ai_generated_brief=true`, `ai_recommendation_id` es responsabilidad de US-023 / PB-P1-030. | US-021 → US-023 / PB-P1-030 |
   | `quote_comparison`    | No materializa entidad; registra adopción.                                                | US-022             |
   | `vendor_bio`          | Persiste `VendorProfile.bio` / `VendorService.description` con `ai_recommendation_id`.   | US-024             |
   | `task_prioritization` | Actualiza `EventTask.priority` con `ai_recommendation_id`.                                | US-031 / PB-P1-017 |

10. **`discard` siempre devuelve `204`** y solo actualiza `status='discarded'` + `decided_at`. No genera entidades. No tiene `editedPayload`.
11. **Idempotencia HITL** — Una segunda llamada a `apply` o `discard` sobre el mismo `AIRecommendation` que ya cerró su ciclo devuelve `409 RECOMMENDATION_NOT_PENDING`. No se usa `If-Match` ni `ETag` en MVP; la idempotencia se garantiza por el state machine canónico.
12. **Trazabilidad bidireccional** — Tras `apply`, la `AIRecommendation` apunta a la entidad creada (`applied_entity_type`, `applied_entity_id` cuando aplica), y la entidad oficial referencia la `AIRecommendation` (`ai_recommendation_id`). Esto permite reproducir el origen IA en auditoría y demo (`BR-AI-010`).
13. **Audit y observabilidad** — Toda transición persiste `decided_by_user_id`, `decided_at`, `correlation_id`. No se requiere `AdminAction` (no es flujo admin). No hay `AdminAction` ni para `apply` ni para `discard`.
14. **Sin moderación IA en MVP** — La IA no modera ni valida el `editedPayload` salvo la validación de schema (`*OutputDto`). El usuario es responsable del contenido aplicado (`BR-AI-004`).

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Decisiones autónomas IA o autoaplicación tras N segundos sin acción.
* Moderación o validación semántica IA del `editedPayload` (solo se valida schema).
* Regeneración dentro del HITL (cada feature IA mantiene su propio botón "Regenerar", que dispara una nueva generación con un nuevo `AIRecommendation`).
* Cache de salidas IA (`BR-AI-013`): no aplica al HITL; podría introducirse en la capa de generación en Future.
* Bulk apply / bulk discard transversal (cada feature decide; el caso bulk de tareas IA lo cubre US-031 / PB-P1-017).
* `If-Match` / `ETag` para concurrencia; el state machine canónico cubre el caso.
* `AdminAction` y endpoints admin (admin no participa en HITL).
* Edición posterior al `apply` (cada entidad oficial usa su propio endpoint de edición — `FR-EVENT-004`, `FR-TASK-003`, `FR-BUDGET-003`, etc.).
* Persistencia de feedback "no relevante" sobre el descarte (Future).

### Scope Notes

* La IA precarga; el usuario aplica, edita-antes-de-aplicar o descarta.
* Strategy registry permite agregar nuevos `type` sin tocar el controller ni el use case.
* Sin migraciones nuevas: reusa `ai_recommendations` (incluye columnas `status`, `edited`, `applied_entity_type`, `applied_entity_id`, `decided_by_user_id`, `decided_at`, `correlation_id` ya sembradas por la fundación AI-001 / US-017 / `/docs/18`).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Apply sin edición sobre `AIRecommendation pending` propia

**Given** un actor autenticado dueño de una `AIRecommendation` con `status='pending'` y un `type` con strategy registrada
**When** invoca `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` con body `{}`
**Then** el backend ejecuta `ApplyAIRecommendationUseCase` en una transacción atómica:

* Resuelve la strategy por `type` desde `AIRecommendationApplyStrategyRegistry`.
* Materializa los side effects definidos en la sección **PO/BA Decisions #9**.
* Actualiza `AIRecommendation` a `status='accepted'`, `edited=false`, `decided_by_user_id=actor.id`, `decided_at=now()`, y `applied_entity_type`/`applied_entity_id` cuando aplica.
* Persiste log estructurado `ai.recommendation.applied` con `correlation_id`, `type`, `applied_entity_type`, `latency_ms`.
* Devuelve `200` con `AIRecommendationResponseDto` actualizado.

### AC-02: Apply con `editedPayload` válido

**Given** una `AIRecommendation pending` propia
**When** invoca `apply` con body `{ editedPayload: <json> }` donde `editedPayload` cumple el JSON Schema (`*OutputDto`) correspondiente al `type`
**Then** el backend valida `editedPayload` con Zod, reemplaza `output` antes de invocar la strategy, marca `edited=true`, y completa el flujo descrito en AC-01.

### AC-03: Discard de `AIRecommendation pending` propia

**Given** una `AIRecommendation pending` propia
**When** invoca `POST /api/v1/ai-recommendations/:aiRecommendationId/discard`
**Then** el backend actualiza `status='discarded'`, `decided_by_user_id=actor.id`, `decided_at=now()` sin crear/modificar entidades destino
**And** persiste log `ai.recommendation.discarded`
**And** devuelve `204 No Content`.

### AC-04: Trazabilidad bidireccional preservada

**Given** un `apply` exitoso con side effect que crea entidades (`type ∈ {checklist, budget_suggestion, vendor_bio, task_prioritization, event_plan}`)
**When** se inspecciona la entidad creada
**Then** la entidad tiene `ai_recommendation_id` poblado y `ai_generated=true` cuando el modelo lo expone (`BR-AI-010`).
**And** el `AIRecommendation` referencia la entidad mediante `applied_entity_type` y `applied_entity_id` cuando es entidad única, o se omite cuando son múltiples (caso `checklist`/`budget_suggestion`/`task_prioritization`).

### AC-05: Strategy pattern extensible

**Given** un `AIRecommendation` con un `type` para el cual no hay strategy registrada
**When** se invoca `apply`
**Then** el backend devuelve `422 RECOMMENDATION_TYPE_NOT_APPLICABLE` con código de error documentado, sin alterar `status` ni efectos colaterales.

### AC-06: Idioma propagado en logs

**Given** un `apply` o `discard`
**When** se persiste el log
**Then** el log incluye `language_code` (el propagado al generar la `AIRecommendation`) para permitir métricas por idioma (`NFR-OBS-001`).

---

## ⚠️ Edge Cases

### EC-01: Recomendación ya finalizada (no `pending`)

**Given** una `AIRecommendation` con `status ∈ {accepted, rejected, discarded, failed, expired}`
**When** se invoca `apply` o `discard`
**Then** el backend devuelve `409 RECOMMENDATION_NOT_PENDING` con el `status` actual en el payload
**And** no altera ningún estado.

#### Handling

* Idempotencia natural: el state machine impide doble aplicación.

---

### EC-02: Sugerencia ajena

**Given** una `AIRecommendation` que no pertenece al actor
**When** se invoca cualquier endpoint HITL
**Then** el backend devuelve `404 NOT_FOUND` (no se filtra existencia de IDs ajenos)
**And** **no** distingue entre `403` y `404` para ownership de `AIRecommendation` (`/docs/19` política de no-revelación).

#### Handling

* Authorization Policy basada en `requested_by_user_id`.

---

### EC-03: `editedPayload` no cumple el `*OutputDto` del `type`

**Given** un `apply` con `editedPayload` cuyo schema no es válido para el `type` de la `AIRecommendation`
**When** Zod falla la validación
**Then** el backend devuelve `400 EDITED_PAYLOAD_INVALID` con los detalles de la validación
**And** no altera `status` ni efectos colaterales.

---

### EC-04: Side effect falla (e.g., constraint DB)

**Given** un `apply` cuyo side effect lanza error (e.g., violación de unique en `EventTask`)
**When** la transacción no puede confirmar
**Then** el backend revierte la transacción, devuelve `5xx SIDE_EFFECT_FAILED` con código y `correlation_id`
**And** persiste log `ai.recommendation.apply_failed`
**And** el `status` de la `AIRecommendation` permanece `pending` (no se marca `failed`).

---

### EC-05: `type` sin strategy registrada

**Given** un `type` desconocido para el `AIRecommendationApplyStrategyRegistry`
**When** se invoca `apply`
**Then** el backend devuelve `422 RECOMMENDATION_TYPE_NOT_APPLICABLE`
**And** persiste log `ai.recommendation.type_unsupported` con `type` para alertar al equipo.

---

### EC-06: `editedPayload` excesivo

**Given** un `editedPayload` cuyo tamaño excede el límite por `type` (e.g., > 256 KB)
**When** el body es procesado
**Then** el backend devuelve `413 PAYLOAD_TOO_LARGE` antes de invocar Zod.

---

### EC-07: Concurrencia (dos `apply` casi simultáneos)

**Given** dos requests `apply` casi concurrentes sobre la misma `AIRecommendation pending`
**When** ambos llegan al backend
**Then** el primero gana (transición atómica `pending → accepted` con `UPDATE ... WHERE status='pending'`)
**And** el segundo recibe `409 RECOMMENDATION_NOT_PENDING`.

#### Handling

* Concurrencia resuelta por update condicional. No se requiere `If-Match` en MVP.

---

### EC-08: `discard` con body

**Given** un `discard` con body no vacío
**When** se procesa
**Then** el backend ignora el body silenciosamente (no es error)
**And** procede como discard estándar.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                    | Message / Behavior                  |
| ----- | --------------------------------------------------------------------------------------- | ----------------------------------- |
| VR-01 | `aiRecommendationId` debe ser UUID v4                                                   | `400 VALIDATION`                    |
| VR-02 | `AIRecommendation` debe existir y pertenecer al actor                                   | `404 NOT_FOUND`                     |
| VR-03 | `status` actual debe ser `pending`                                                      | `409 RECOMMENDATION_NOT_PENDING`    |
| VR-04 | `type` debe tener strategy registrada en `AIRecommendationApplyStrategyRegistry`         | `422 RECOMMENDATION_TYPE_NOT_APPLICABLE` |
| VR-05 | `editedPayload` (apply) debe cumplir el `*OutputDto` correspondiente al `type`           | `400 EDITED_PAYLOAD_INVALID`        |
| VR-06 | `editedPayload` (apply) ≤ 256 KB                                                         | `413 PAYLOAD_TOO_LARGE`             |
| VR-07 | `discard` ignora body                                                                    | sin error                            |
| VR-08 | Side effect debe completar dentro de transacción                                         | `5xx SIDE_EFFECT_FAILED` con rollback |
| VR-09 | El actor no puede ser admin para este endpoint                                           | `403 FORBIDDEN`                     |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership obligatoria: `actor.id === ai_recommendation.requested_by_user_id`.                                                                  |
| SEC-02 | Admin **no** participa en HITL (`FR-ADMIN-010`): rol `admin` ⇒ `403`.                                                                          |
| SEC-03 | `apply` y `discard` requieren autenticación (cookie de sesión / token vigente).                                                                |
| SEC-04 | No-revelación de IDs ajenos: `404` también cuando el ID existe pero no pertenece al actor.                                                      |
| SEC-05 | Logs estructurados sin PII; el `editedPayload` se redacta si contiene email, teléfono o dirección antes de loguear (reusa `OrganizerPiiDetector` cuando aplique).             |
| SEC-06 | Auditoría: `decided_by_user_id`, `decided_at`, `correlation_id` se persisten en `AIRecommendation`.                                              |
| SEC-07 | Transacción atómica enforced (Postgres `BEGIN ... COMMIT`); rollback automático ante side effect fallido.                                       |
| SEC-08 | Side effects respetan políticas de autorización propias de cada entidad destino (e.g., `EventTask` solo si el actor es organizador del evento). |
| SEC-09 | Endpoint `discard` no requiere `correlation_id` adicional; el existente del `AIRecommendation` se preserva.                                     |

### Negative Authorization Scenarios

* Actor no dueño → `404`.
* Admin autenticado → `403`.
* Vendor intentando `apply` sobre `type` propio del organizador → `404`.
* Organizer intentando `apply` sobre `type ∈ {vendor_bio}` → `404`.
* Anónimo / sesión inválida → `401`.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: HITL transversal (cierre del ciclo de toda `AIRecommendation`).
* Provider Layer: **No aplica** (no se invoca al LLM en este flujo).
* Human Validation Required: **Yes — esta historia ES el HITL**.
* Persist `AIRecommendation`: Yes (`UPDATE` del status + flags + metadata + applied entity).
* Fallback Required: No.

### AI Input

* `aiRecommendationId`.
* Acción humana implícita (apply o discard).
* `editedPayload` opcional (solo en `apply`).

### AI Output

* Estado actualizado de `AIRecommendation`.
* Entidad oficial creada/modificada según `type` (ver mapa de side effects).

### Human-in-the-loop Rules

* La IA **no decide**: el actor humano decide aplicar o descartar.
* Edición pre-confirmación libre y enforced por validación de schema.
* Ningún `type` de `AIRecommendation` puede auto-aplicarse.
* La regeneración (volver a llamar al LLM) no es parte de este endpoint; cada feature IA tiene su propio "Regenerar" en su US específica.

### AI Error / Fallback Behavior

* No aplica al HITL: el LLM no se invoca aquí.
* Si el side effect falla, no se marca `status='failed'`; permanece `pending` para reintento humano.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | Componente reusable `HITLActions` invocado por toda vista IA (`US-017..US-024`, US-031).                                       |
| Main UI Pattern     | Botonera "Aplicar / Editar / Descartar" + indicador `pending` y badge "Sugerido por IA" (`BR-AI-003`).                          |
| Primary Action      | "Aplicar".                                                                                                                     |
| Secondary Actions   | "Editar" (abre edición inline o modal según contexto), "Descartar" (con confirmación), "Regenerar" (delegado a la US dueña del `type`). |
| Empty State         | No aplica (el componente solo se monta cuando hay una `AIRecommendation pending`).                                              |
| Loading State       | Spinner en el botón disparado + bloqueo de los demás botones; `aria-live="polite"` anuncia "Aplicando sugerencia IA...".         |
| Error State         | Toast con `error.code` traducido (`RECOMMENDATION_NOT_PENDING`, `EDITED_PAYLOAD_INVALID`, `SIDE_EFFECT_FAILED`, `PAYLOAD_TOO_LARGE`, `RECOMMENDATION_TYPE_NOT_APPLICABLE`) + botón "Reintentar". |
| Success State       | Toast "Sugerencia aplicada / descartada" + revalidación de la query origen (e.g., `['event', eventId]`, `['budget', eventId]`). |
| Accessibility Notes | Botones con `aria-label` explícito; foco gestionado al cerrar modal de edición; navegación por teclado completa.                |
| Responsive Notes    | Mobile-first; en pantallas pequeñas la botonera puede colapsar en menú "Más acciones".                                          |
| i18n Notes          | Copy de UI en 4 locales (es-LATAM, es-ES, pt, en); el `editedPayload` mantiene el `language_code` del `AIRecommendation`.        |
| Currency Notes      | No aplica al HITL en sí; el contenido editado puede contener montos en la moneda del evento.                                    |

---

## 🛠 Technical Notes

### Frontend

* Componentes reusables: `HITLActions`, `HITLEditModal` (envuelve el editor específico por `type`), `AIBadge` (reusado de US-017).
* State Management: TanStack `useApplyAIRecommendation` (mutation) y `useDiscardAIRecommendation` (mutation). Ambas invalidan la query origen del consumidor.
* Forms: React Hook Form + Zod para el `editedPayload` por `type` (cada US dueña del `type` provee el schema y el editor).
* API Client: `aiApi.applyRecommendation(id, { editedPayload? })`, `aiApi.discardRecommendation(id)`.

### Backend

* Use Case / Service: `ApplyAIRecommendationUseCase`, `DiscardAIRecommendationUseCase`.
* Controller / Route: `POST /api/v1/ai-recommendations/:aiRecommendationId/apply`, `POST /api/v1/ai-recommendations/:aiRecommendationId/discard`.
* Authorization Policy: Ownership backend-only (`AIRecommendationOwnershipPolicy`).
* Validation: Zod `aiRecommendationIdParamSchema`, `applyRequestBodySchema` (`{ editedPayload?: unknown }`), por-`type` `*OutputDto` (resuelto en runtime según `recommendation.type`).
* Strategy: `AIRecommendationApplyStrategyRegistry` con `register(type, strategy)`. Strategies registradas: `EventPlanApplyStrategy`, `ChecklistApplyStrategy`, `BudgetSuggestionApplyStrategy`, `VendorCategoriesApplyStrategy`, `QuoteBriefApplyStrategy` (no-op marker; persistencia en US-023), `QuoteComparisonApplyStrategy` (no-op), `VendorBioApplyStrategy`, `TaskPrioritizationApplyStrategy`.
* Transaction Required: **Sí**, transacción atómica (`PrismaService.$transaction`) abarcando update de `AIRecommendation` + side effect.

### Database

* Main Tables:
  * `ai_recommendations` (update; columnas `status`, `edited`, `applied_entity_type`, `applied_entity_id`, `decided_by_user_id`, `decided_at`, `correlation_id` — todas ya disponibles desde US-017 / `/docs/18`).
  * Entidades destino según `type` (insert/update): `event_tasks`, `budget_items`, `events`, `vendor_profiles`, `vendor_services`.
* Constraints: enum `ai_recommendation_status` ya cubre los estados canónicos; check constraint `status='accepted' ⇒ applied_entity_type IS NOT NULL OR type IN ('vendor_categories','quote_brief','quote_comparison')` (verificar implementación a partir de `/docs/18`).
* Index Considerations: reutiliza índice existente `ai_recommendations(requested_by_user_id, status, created_at)`.
* Migraciones nuevas: **ninguna**. Toda la columna y enums ya están sembrados por la fundación AI-001 (US-017).

### API

| Method | Endpoint                                                                | Purpose                                       |
| ------ | ----------------------------------------------------------------------- | --------------------------------------------- |
| POST   | `/api/v1/ai-recommendations/:aiRecommendationId/apply`                  | Aceptar (con edición opcional) y materializar |
| POST   | `/api/v1/ai-recommendations/:aiRecommendationId/discard`                | Descartar sin efectos                          |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes (`ai.recommendation.applied`, `ai.recommendation.discarded`, `ai.recommendation.apply_failed`, `ai.recommendation.type_unsupported`, `ai.recommendation.conflict`).
* AdminAction Required: No.
* AIRecommendation Required: Yes (siempre se persiste actualización del status).
* Métricas: `hitl_apply_count{type, edited}`, `hitl_discard_count{type}`, `hitl_apply_failure_count{type, error_code}`.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                            | Type        |
| ----- | --------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | `apply` sin edición sobre `type='checklist'` crea `EventTask[]` con `ai_generated=true`              | Integration |
| TS-02 | `apply` con `editedPayload` válido reemplaza `output` y marca `edited=true`                          | Integration |
| TS-03 | `apply` sobre `type='budget_suggestion'` crea `BudgetItem[]` con `ai_recommendation_id`              | Integration |
| TS-04 | `apply` sobre `type='vendor_bio'` actualiza `VendorProfile.bio` con `ai_recommendation_id`           | Integration |
| TS-05 | `apply` sobre `type='vendor_categories'` no crea entidad; persiste `status='accepted'`               | Integration |
| TS-06 | `apply` sobre `type='task_prioritization'` actualiza `EventTask.priority`                            | Integration |
| TS-07 | `discard` sobre `type='quote_brief'` solo actualiza `status='discarded'` (sin tocar `QuoteRequest`) | Integration |
| TS-08 | E2E flujo plan IA: generar → editar → aplicar → tareas visibles                                      | E2E         |
| TS-09 | E2E flujo brief IA: generar → editar → aplicar → handoff a creación de `QuoteRequest` (US-023)       | E2E         |
| TS-10 | Transacción rollback ante side effect fallido: status permanece `pending`                            | Integration |

### Negative Tests

| ID    | Scenario                                                          | Expected Result                              |
| ----- | ----------------------------------------------------------------- | -------------------------------------------- |
| NT-01 | `AIRecommendation` con `status='accepted'` recibe `apply`         | `409 RECOMMENDATION_NOT_PENDING`             |
| NT-02 | `AIRecommendation` con `status='discarded'` recibe `discard`       | `409 RECOMMENDATION_NOT_PENDING`             |
| NT-03 | `AIRecommendation` ajena                                          | `404 NOT_FOUND`                              |
| NT-04 | Admin invoca `apply` o `discard`                                  | `403 FORBIDDEN`                              |
| NT-05 | Anónimo invoca                                                    | `401 UNAUTHORIZED`                           |
| NT-06 | `editedPayload` con schema inválido para el `type`                | `400 EDITED_PAYLOAD_INVALID`                 |
| NT-07 | `editedPayload` excede 256 KB                                     | `413 PAYLOAD_TOO_LARGE`                      |
| NT-08 | `aiRecommendationId` con formato inválido                         | `400 VALIDATION`                             |
| NT-09 | `type` sin strategy registrada                                    | `422 RECOMMENDATION_TYPE_NOT_APPLICABLE`     |
| NT-10 | Side effect lanza error                                           | `5xx SIDE_EFFECT_FAILED` + rollback + status `pending` |

### AI Tests

| ID       | Scenario                                                                       | Expected Result                                          |
| -------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| AI-TS-01 | Strategy `event_plan` materializa `Event.ai_plan` con trazabilidad              | `applied_entity_type='event'`, `applied_entity_id` poblado |
| AI-TS-02 | Strategy `checklist` materializa N `EventTask` con `ai_recommendation_id`        | N entidades creadas, no se setea `applied_entity_id` único |
| AI-TS-03 | Strategy `budget_suggestion` respeta `editedPayload` con montos modificados      | `BudgetItem.amount` refleja la edición                    |
| AI-TS-04 | Strategy `quote_brief` queda como no-op pero marca `accepted` y bloquea reapply  | `status='accepted'`, segundo apply ⇒ `409`               |
| AI-TS-05 | Strategy `vendor_bio` actualiza `VendorProfile.bio` y `ai_recommendation_id`     | Verifica trazabilidad bidireccional                       |
| AI-TS-06 | Concurrencia: dos apply simultáneos sobre la misma `AIRecommendation`            | Primero `200`, segundo `409 RECOMMENDATION_NOT_PENDING`  |
| AI-TS-07 | `apply` con `editedPayload` y PII en el contenido editado                       | El log redacta PII; el side effect respeta el contenido del usuario (`BR-AI-004`) |

### Authorization Tests

| ID         | Scenario                                                             | Expected Result |
| ---------- | -------------------------------------------------------------------- | --------------- |
| AUTH-TS-01 | Dueño organizador aplica recomendación propia                        | `200`           |
| AUTH-TS-02 | Dueño vendor aplica recomendación propia (`type='vendor_bio'`)       | `200`           |
| AUTH-TS-03 | Otro organizador                                                     | `404`           |
| AUTH-TS-04 | Vendor sobre recomendación de organizador                            | `404`           |
| AUTH-TS-05 | Admin                                                                | `403`           |
| AUTH-TS-06 | Anónimo                                                              | `401`           |

### Accessibility Tests

* Botones `HITLActions` accesibles por teclado con orden lógico (Aplicar → Editar → Descartar).
* `aria-label` explícito por botón con el `type` de la sugerencia.
* `aria-live="polite"` anuncia el resultado tras `apply`/`discard`.
* Modal de edición captura el foco y lo restaura al cerrar.
* Contraste mínimo AA en botones y badge "Sugerido por IA".

---

## 📊 Business Impact

| Field               | Value                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| KPI Affected        | Tasa de adopción IA (apply/discard ratio), satisfacción percibida, control humano efectivo |
| Expected Impact     | Garantiza HITL como principio rector visible en demo                              |
| Success Criteria    | 100% de las salidas IA pasan por `apply` o `discard` antes de oficializarse        |
| Academic Demo Value | Demuestra strategy pattern, ownership por tipo y transacciones atómicas IA→entidad oficial |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Componente `HITLActions` y `HITLEditModal` reusables.
* Hooks `useApplyAIRecommendation` y `useDiscardAIRecommendation`.
* Integración del componente en cada vista IA existente (US-017..US-024) — coordinada con cada US.
* i18n en 4 locales.
* Telemetría frontend (`ai.recommendation.apply_clicked|edit_clicked|discard_clicked`).

### Potential Backend Tasks

* `ApplyAIRecommendationUseCase` y `DiscardAIRecommendationUseCase` con strategy registry.
* `AIRecommendationApplyStrategyRegistry` + 8 strategies (una por `type` MVP).
* Endpoint `POST /apply` y `POST /discard` con ownership policy y validación Zod.
* Transacción atómica via `PrismaService.$transaction`.
* Logging estructurado + métricas.
* Documentación inline del contrato del registry.

### Potential Database Tasks

* Verificación de columnas y enums ya sembrados (`status`, `edited`, `applied_entity_type`, `applied_entity_id`, `decided_*`, `correlation_id`).
* Sin migraciones nuevas.

### Potential AI / PromptOps Tasks

* Not applicable for this story (no se invoca LLM).

### Potential QA Tasks

* Tests por strategy (8) + tests transversales del use case + rollback.
* Tests E2E mínimo 2 (plan completo, brief con handoff a US-023).
* Tests de autorización por rol y de concurrencia.
* Tests de accesibilidad de `HITLActions`.

### Potential DevOps / Config Tasks

* Métricas y dashboards de HITL (`hitl_apply_count`, `hitl_discard_count`, `hitl_apply_failure_count`).
* Alertas si `hitl_apply_failure_count` excede umbral.

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer/Vendor dueño de la `AIRecommendation`).
* [x] Goal/valor claros (HITL irrenunciable como principio rector).
* [x] FRD/UC/BR enlazados (`FR-AI-019/018`, `UC-AI-002`, `BR-AI-001..004/010`).
* [x] Permisos identificados (Ownership + admin excluido).
* [x] Entidades listadas (`AIRecommendation` + entidades destino por `type`).
* [x] AC en GWT cubriendo apply sin/con edición, discard, trazabilidad, strategy extensible, idioma en logs.
* [x] Edge cases documentados (estado terminal, ajena, schema inválido, side effect falla, type sin strategy, payload excesivo, concurrencia, body en discard).
* [x] Validación clara (`VR-01..09`).
* [x] Out of Scope explícito (regeneración, moderación IA, cache, bulk, ETag).
* [x] Dependencias conocidas (PB-P1-011/012..015/017/030, PB-P0-007/014).
* [x] UX states identificados.
* [x] API definida (`POST .../apply`, `POST .../discard`).
* [x] Tests definidos (10 functional, 10 negative, 7 AI, 6 authorization, accesibilidad).
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoints `apply` y `discard` operativos con ownership y validación Zod.
* [ ] `AIRecommendationApplyStrategyRegistry` con 8 strategies registradas y testeadas.
* [ ] Transacción atómica enforced; rollback verificado en pruebas.
* [ ] `HITLActions` reusable integrado en al menos las vistas IA de US-017..US-021 (las demás se integran en sus respectivas US).
* [ ] Trazabilidad bidireccional verificada (`AIRecommendation ↔ entidad oficial`).
* [ ] Logs estructurados y métricas en producción de demo.
* [ ] Tests funcionales, negativos, AI, autorización y accesibilidad verdes en CI.
* [ ] PO valida en demo: generar plan → editar → aplicar → tareas creadas → descartar nueva sugerencia.

---

## 📝 Notes

* Documentation Alignment Required: `/docs/8-Use-Cases-Specification.md` describe HITL inline dentro de `UC-AI-001..009` (cada UC contiene su fase de aplicación/descarte). No existe un UC dedicado a HITL transversal porque está modelado como concern transversal. Esta historia formaliza la API común; la trazabilidad apunta a `UC-AI-002` como canónico revisión + el resto de UC IA implícitamente. Cleanup editorial: agregar nota cruzada en `/docs/8`.
* Documentation Alignment Required: la versión original de US-025 referenciaba `FR-AI-015` (AnthropicProvider stub) y `FR-AI-016` (`LLM_PROVIDER` config), que no son HITL. La traza canónica es `FR-AI-019` (aceptar/editar/regenerar) y `FR-AI-018` (prompt versionado). Cleanup aplicado en esta refinación.
* Documentation Alignment Required: la versión original mencionaba un único `PATCH /api/v1/ai-recommendations/:id` con state machine que incluía `edited` como estado. El canónico vigente en `/docs/16` §35.3 (líneas 1521–1522) son **dos endpoints POST** (`/apply` y `/discard`); `edited` es un **flag boolean**, no un `status`. La refinación adopta el canónico y deja la nota para `/docs/16` §35.6 (flujo HITL) sobre la convención de `editedPayload`.
* `MockAIProvider` no interviene aquí; el HITL es post-generación.
* La integración del componente `HITLActions` en cada vista IA se entrega coordinada con la US específica del `type` (US-017..US-024, US-031). Esta US-025 deja el componente como contrato común reutilizable.
* La columna `applied_entity_id` queda `NULL` para `type ∈ {checklist, budget_suggestion, task_prioritization}` (efectos múltiples) y para `type ∈ {vendor_categories, quote_brief, quote_comparison}` (no materializan entidad nueva). La trazabilidad inversa la garantiza el `ai_recommendation_id` en cada entidad destino.
