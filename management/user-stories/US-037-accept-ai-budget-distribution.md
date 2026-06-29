# 🧾 User Story: Aceptar distribución IA como BudgetItems editables

## 🆔 Metadata

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| ID                 | US-037                                             |
| Epic               | EPIC-BUD-001 — Budget Management & Currency        |
| Backlog Item       | PB-P1-021                                          |
| Feature            | Aceptación de distribución IA                       |
| Module / Domain    | Budget / AI (HITL)                                 |
| User Role          | Organizer                                          |
| Priority           | Must Have                                          |
| Status             | Approved with Minor Notes                          |
| Owner              | Product Owner / Business Analyst                   |
| Approved By        | PO/BA Review                                       |
| Approval Date      | 2026-06-27                                         |
| Ready for Development Tasks | Yes                                       |
| Sprint / Milestone | MVP                                                |
| Created Date       | 2026-06-09                                         |
| Last Updated       | 2026-06-27                                         |

---

## 🎯 User Story

**As an** organizador
**I want** aceptar la distribución IA como items editables de mi presupuesto
**So that** comience con un baseline confiable sin partir de cero

---

## 🧠 Business Context

### Context Summary

US-037 es el **HITL canónico** para `AI-003 (budget_suggestion)`. Convierte una `AIRecommendation { type='budget_suggestion', status='pending' }` (producida por US-019) en `BudgetItem(ai_generated=true)` editables, cerrando `UC-BUDGET-001`. La invocación ocurre vía el endpoint genérico `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` provisto por **US-025**; US-037 registra el `ApplyBudgetSuggestionUseCase` como handler del dispatcher cuando `type='budget_suggestion'`. La materialización es transaccional: soft delete de items reemplazables (D2) + inserts de N `BudgetItem` + update del `AIRecommendation` (status=accepted, edited, accepted_at, accepted_by) ocurren en una sola `prisma.$transaction`. Cada apply exitoso invalida `['event', eventId, 'budget']` consumido por US-035.

### Related Domain Concepts

* `AIRecommendation { type='budget_suggestion', status: 'pending' → 'accepted' }` con `payload.categories[]` definido por US-019.
* `BudgetItem(ai_generated=true, ai_recommendation_id)` enlaza cada item materializado con su recomendación de origen.
* `ServiceCategory` (resuelta server-side por `service_category_code`).
* HITL `BR-AI-001..003` (acción humana obligatoria).
* Idioma del evento ya respetado upstream en el payload (BR-AI-011).

### Assumptions

* US-019 garantiza shape canónico `categories[]` con `service_category_code`, `percentage`, `amount`, `notes`, en la moneda del evento.
* `AIRecommendation.status` enum: `pending|accepted|discarded` (ADR).
* US-025 implementa el dispatcher y delega a US-037 cuando `type='budget_suggestion'`.
* US-035 invalida automáticamente al recibir el `invalidate` del hook de US-037.
* US-036 entregó `BudgetItemWriteRepository`, `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` y filtro `deleted_at IS NULL` en el read repository.

### Dependencies

* US-019 — productor del `AIRecommendation` (PB-P1-013).
* US-025 — dispatcher genérico HITL con endpoint canónico (PB-P1-016).
* US-035 — consumidor del cache `['event', eventId, 'budget']` (PB-P1-020).
* US-036 — proveedor de `BudgetItemWriteRepository` y policies/guards (PB-P1-020).
* PB-P1-013 / PB-P1-016 / PB-P1-020 — backlog items prerequisitos.
* PB-P1-021 — backlog item padre.

### PO/BA Decisions Applied

| ID | Decisión                                                                                                                                                                                                                                                                                  | Resolución |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1 | Endpoint canónico genérico de US-025                                                                                                                                                                                                                                                       | US-037 NO introduce ruta nueva. Consume `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` (US-025); aporta `ApplyBudgetSuggestionUseCase` como handler dispatched cuando `type='budget_suggestion'`. |
| D2 | Política de reemplazo                                                                                                                                                                                                                                                                      | Soft delete de items reemplazables (`ai_generated=true ∧ ai_recommendation_id ≠ aiRecommendationId actual ∧ deleted_at IS NULL ∧ event_id = path.eventId`). Items manuales (`ai_generated=false`) preservados. UI confirma con conteo. |
| D3 | Body shape `editedPayload`                                                                                                                                                                                                                                                                  | `{ editedPayload?: { categories: [{ service_category_code, planned ≥ 0, label? }] } }`. Subset implícito = descarte. Si omitido, apply as-is; si presente y editado, marca `edited=true`. Categorías no en payload original ⇒ 400. Vacío ⇒ 400. |
| D4 | Estado final                                                                                                                                                                                                                                                                              | `status='accepted'` (parcial y total). Persiste `edited`, `accepted_at`, `accepted_by`. NO se introduce `accepted_partial`. Auditoría vía `BudgetItem.ai_recommendation_id`.                                                                                                              |
| D5 | Bloqueo por estado del evento                                                                                                                                                                                                                                                              | Permitido solo si `event.status ∈ {'draft','active'}`. Otros ⇒ 409 `EVENT_NOT_EDITABLE`. Consistente con US-036 D3.                                                                                                                                                                       |
| D6 | Categoría desactivada entre US-019 y US-037                                                                                                                                                                                                                                                | 409 `CATEGORY_INACTIVE` con `inactive_categories[]`. Sin aplicación parcial silenciosa. UI ofrece "Regenerar sugerencia" (US-019) o "Aplicar manualmente" (US-036).                                                                                                                       |

Referencia completa: `management/user-stories/decision-resolutions/US-037-decision-resolution.md`.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-BUDGET-010 (apply AI distribution) · FR-AI-003 (sugerencia IA budget; productor) · FR-AI-010 (persistencia AIRecommendation)                                                                                                                                                                          |
| Use Case(s)            | UC-BUDGET-001 (Aceptar sugerencia IA de presupuesto)                                                                                                                                                                                                                                                  |
| Business Rule(s)       | BR-BUDGET-008 (sugerencia editable) · BR-BUDGET-009 (edición libre) · BR-BUDGET-007 (sin FX) · BR-AI-008 (`ai_generated`) · BR-AI-011 (idioma) · BR-AI-001..003 (HITL)                                                                                                                                  |
| Permission Rule(s)     | Ownership (`Event.owner_id = currentUser.id`) · `OrganizerRoleGuard` · `adminExclusionGuard` (heredados del dispatcher US-025)                                                                                                                                                                          |
| Data Entity / Entities | `BudgetItem` · `AIRecommendation` · `ServiceCategory` · `Budget`                                                                                                                                                                                                                                       |
| API Endpoint(s)        | `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` (provisto por US-025; US-037 aporta handler para `type='budget_suggestion'`)                                                                                                                                                               |
| NFR Reference(s)       | NFR-PERF-001 (P95 < 1.5 s)                                                                                                                                                                                                                                                                            |
| Related ADR(s)         | ADR-AI-001 (LLMProvider abstraction; no se invoca aquí pero la `AIRecommendation` la honra)                                                                                                                                                                                                            |
| Related Document(s)    | `/docs/4 §BR-BUDGET-008/009 §BR-AI-008/011 §BR-AI-001..003` · `/docs/6 §BudgetItem §AIRecommendation` · `/docs/8 §UC-BUDGET-001` · `/docs/9 §FR-BUDGET-010 §FR-AI-003/010` · `/docs/10 §NFR-PERF-001` · `/docs/16 §35.3` · `management/user-stories/US-019-ai-budget-distribution.md` · `US-025` · `US-035` · `US-036` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Auto-aplicación sin acción del usuario (HITL es obligatorio).
* Nuevo path `POST /budget/apply-ai` (descartado; reuso del genérico de US-025).
* Endpoint `/discard` (pertenece a US-025).
* Invocación al `LLMProvider` (productor es US-019; US-037 solo consume el payload persistido).
* Estado `accepted_partial` o cualquier variante del enum (mantener `pending|accepted|discarded`).
* Cambio o conversión de moneda (`BR-BUDGET-007`).
* Hard delete de items reemplazados (se aplica soft delete).
* Auto-regeneración cuando hay categorías inactivas (la UI ofrece CTAs).

### Scope Notes

* US-037 es **handler de dispatcher**, no introduce routing nuevo.
* Cada mutación invalida la query key TanStack `['event', eventId, 'budget']` consumida por US-035.
* La verificación `event.status ∈ {'draft','active'}` es transversal (US-036 D3).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Aplicar sugerencia IA total o editada

**Given** una `AIRecommendation { type='budget_suggestion', status='pending', event_id=eventId, payload.currency_code=event.currency_code }` del organizador dueño
**When** el cliente invoca `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` con body `{ editedPayload?: { categories: [{ service_category_code, planned, label? }, ...] } }`
**Then** el dispatcher de US-025 enruta a `ApplyBudgetSuggestionUseCase` (US-037), que dentro de una sola transacción:
1. Aplica soft delete a los items reemplazables (D2).
2. Inserta N `BudgetItem` con `ai_generated=true`, `committed=0`, `ai_recommendation_id=aiRecommendationId`, `paid=0`, `planned`/`label` desde el (edited)Payload.
3. Actualiza `AIRecommendation { status='accepted', edited=<bool>, accepted_at=NOW(), accepted_by=currentUser.id }`.

Responde `200 OK` con `{ created_items: BudgetItemDto[], replaced_items_count: number, recommendation: AIRecommendationDto }`. El cache `['event', eventId, 'budget']` queda marcado para refetch.

### AC-02: Aceptación parcial (subset)

**Given** un `AIRecommendation` con M entradas en `payload.categories[]`
**When** `editedPayload.categories` contiene un subset (K ≤ M) de las entradas originales (identificadas por `service_category_code`)
**Then** se materializan exactamente K `BudgetItem`; las M-K entradas no incluidas se descartan implícitamente. El `AIRecommendation.status='accepted'` aunque no se hayan aplicado todas las entradas. `edited=true` si K < M o si algún `planned` difiere del original.

### AC-03: Política de reemplazo (D2)

**Given** un evento que ya tiene items con `ai_generated=true` de aplicaciones anteriores (`ai_recommendation_id` previo distinto del actual) y/o items manuales (`ai_generated=false`)
**When** se ejecuta apply
**Then** el use case ejecuta soft delete **solo** sobre los items con `ai_generated=true AND ai_recommendation_id != aiRecommendationId AND deleted_at IS NULL AND event_id = path.eventId`. Los items con `ai_generated=false` se preservan. El response incluye `replaced_items_count`. La UI muestra modal de confirmación antes de invocar cuando el preview detecta `replaced_items_count > 0`.

### AC-04: Bloqueo por estado del evento (D5)

**Given** un evento con `status ∈ {'cancelled','completed'}`
**When** se invoca apply
**Then** responde `409 EVENT_NOT_EDITABLE` con detail del estado. No se persiste ninguna mutación.

### AC-05: Rechazo por categoría inactiva (D6)

**Given** que alguna `service_category_code` referenciada (en payload original o en `editedPayload`) tiene `is_active=false`
**When** se invoca apply
**Then** responde `409 CATEGORY_INACTIVE` con `inactive_categories: [{ service_category_code, name }]`. No se aplica parcialmente. La UI muestra modal con CTAs "Regenerar sugerencia" (deeplink US-019) y "Aplicar manualmente" (deeplink US-036).

### AC-06: Invalidación de cache TanStack

**Given** un apply exitoso
**When** TanStack Query procesa el `onSuccess` del hook
**Then** se ejecuta `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] })`. US-035 refresca la vista con los nuevos items.

### AC-07: Atomicidad (rollback)

**Given** una transacción de apply en curso
**When** cualquier insert, soft delete o update falla a mitad
**Then** la transacción hace ROLLBACK total: NO se crean ítems parciales, NO se eliminan items reemplazables, NO se cambia el `AIRecommendation.status`. El response es 500 con `error_code: 'INTERNAL_ERROR'` y `correlation_id`; el `AIRecommendation` permanece `pending`.

### AC-08: Consistencia de moneda

**Given** un `AIRecommendation` cuyo `payload.currency_code` ya fue establecido por US-019 con la moneda del evento
**When** se invoca apply
**Then** el use case verifica `AIRecommendation.payload.currency_code = event.currency_code`. Si difiere (caso anómalo) responde `409 CURRENCY_MISMATCH`. No se aplica conversión FX.

### AC-09: Accesibilidad del dialog

**Given** la UI muestra `ApplyAIBudgetDialog`
**When** se renderiza
**Then** el dialog expone `role="dialog"`, `aria-labelledby`, `aria-describedby`, focus trap. El estado loading expone `aria-busy="true"`. Los errores 409/400 se anuncian con `aria-live="polite"` cerca del control afectado.

### AC-10: Performance

**Given** un `AIRecommendation` con hasta 12 entradas en `payload.categories[]`
**When** se mide el endpoint
**Then** P95 < 1.5 s (`NFR-PERF-001`) incluyendo la transacción completa (soft deletes + N inserts + update).

---

## ⚠️ Edge Cases

### EC-01: AIRecommendation no `pending`

**Given** un `AIRecommendation` con `status ∈ {'accepted','discarded'}`
**When** se invoca apply
**Then** responde `409 RECOMMENDATION_NOT_PENDING`.

### EC-02: Evento `cancelled` / `completed` (D5)

**Then** 409 `EVENT_NOT_EDITABLE`.

### EC-03: Categoría desactivada (D6)

**Then** 409 `CATEGORY_INACTIVE` con lista.

### EC-04: `editedPayload.categories[].service_category_code` no en payload original

**Then** 400 `INVALID_VALUE` con detail "category not in original payload".

### EC-05: `editedPayload.categories[]` vacío

**Then** 400 `INVALID_VALUE` con detail "no categories selected; use /discard to cancel".

### EC-06: Rollback transaccional

**Given** un fallo de BD a mitad de la transacción
**Then** ROLLBACK total; `AIRecommendation` permanece `pending`.

### EC-07: Re-aplicación de la misma `AIRecommendation` ya accepted

**Given** un `AIRecommendation` cuyo `status='accepted'`
**When** se intenta apply otra vez con el mismo `aiRecommendationId`
**Then** 409 `RECOMMENDATION_NOT_PENDING` (no `ITEM_ALREADY_MATERIALIZED`; esta variante se reserva para una eventual re-creación física del set, fuera de MVP).

### EC-08: Currency mismatch (defensa profunda)

**Then** 409 `CURRENCY_MISMATCH`.

### EC-09: AIRecommendation ajeno (anti-IDOR)

**Given** `AIRecommendation.event_id ≠ path.eventId` o `event.owner_id ≠ currentUser.id`
**Then** 404 (no-revelación).

---

## 🚫 Validation Rules

| ID    | Rule                                                                                            | Message / Behavior                                            |
| ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| VR-01 | `AIRecommendation.event_id = path.eventId` y `event.owner_id = currentUser.id`                   | 404 `NOT_FOUND` (no-revelación)                               |
| VR-02 | `AIRecommendation.status = 'pending'`                                                            | 409 `RECOMMENDATION_NOT_PENDING`                              |
| VR-03 | `editedPayload.categories[].service_category_code` ∈ payload original                            | 400 `INVALID_VALUE`                                           |
| VR-04 | `editedPayload.categories[].planned ≥ 0`                                                          | 400 `INVALID_VALUE`                                           |
| VR-05 | Si `editedPayload.categories[]` está presente, no debe estar vacío                                | 400 `INVALID_VALUE`                                           |
| VR-06 | `event.status ∈ {'draft','active'}` (D5)                                                          | 409 `EVENT_NOT_EDITABLE`                                      |
| VR-07 | Cada `service_category_code` referenciada tiene `is_active = true` (D6)                            | 409 `CATEGORY_INACTIVE` con `inactive_categories[]`           |
| VR-08 | UUIDs válidos en path                                                                            | 400 `INVALID_PARAMS`                                          |
| VR-09 | Sesión válida                                                                                    | 401 `UNAUTHORIZED`                                            |
| VR-10 | `AIRecommendation.payload.currency_code = event.currency_code`                                    | 409 `CURRENCY_MISMATCH` (defensa profunda)                     |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | `EventOwnershipPolicy` + `OrganizerRoleGuard` (heredados del dispatcher de US-025 y revalidados en US-037 sobre `event_id`).          |
| SEC-02 | Atomicidad: `prisma.$transaction` cubre soft-delete de reemplazables + inserts de N items + update del `AIRecommendation`.            |
| SEC-03 | `adminExclusionGuard`: admin → 403.                                                                                                  |
| SEC-04 | No-revelación 404 ante recurso ajeno (incluyendo `AIRecommendation.event_id` desalineado con path).                                  |
| SEC-05 | Logging estructurado sin PII; payload del log: `aiRecommendationId`, `accepted_entries_count`, `replaced_items_count`, `created_items_count`, `correlationId`, `duration_ms`. |
| SEC-06 | Rate limiting `SEC-POL-AI-007` NO aplica aquí porque US-037 no invoca LLMProvider; sí aplica al productor US-019.                     |

### Negative Authorization Scenarios

* Sin sesión → 401.
* Owner del evento sobre `AIRecommendation` ajena → 404.
* Vendor → 403.
* Admin → 403.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: HITL para `AI-003 (budget_suggestion)`.
* Provider Layer: N/A (no se invoca LLMProvider; productor es US-019).
* Human Validation Required: Yes (esta US ES el HITL).
* Persist AIRecommendation: Yes (update `status`, `edited`, `accepted_at`, `accepted_by`).
* Fallback Required: N/A.

### AI Input

* `aiRecommendationId` (path).
* `editedPayload?` (body) opcional.

### AI Output

* `BudgetItem(ai_generated=true)` materializados.
* `AIRecommendation` actualizado.

### Human-in-the-loop Rules

* Esta historia ES el HITL aplicado a Budget. Sin acción explícita del usuario (POST), nunca se materializa.
* `edited=true` cuando el usuario edita `planned` o aplica un subset.

### AI Error / Fallback Behavior

* No aplica (no se invoca LLMProvider).

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Screen / Route      | Vista budget (`/[locale]/organizer/events/:eventId/budget`) con CTA "Aplicar sugerencia IA" cuando existe `AIRecommendation pending`.    |
| Main UI Pattern     | `ApplyAIBudgetDialog`: preview de entradas + edición inline de `planned` por fila + toggle de inclusión por fila + total acumulado.      |
| Primary Action      | "Aplicar al presupuesto".                                                                                                              |
| Secondary Actions   | "Editar antes de aplicar" (entra a modo edición inline), "Descartar" (invoca el `/discard` de US-025).                                  |
| Empty State         | No aplica (la vista de US-035 maneja empty general).                                                                                    |
| Loading State       | Spinner con `aria-busy="true"`; mínimo 300 ms.                                                                                         |
| Error State         | Banner accesible con manejo específico de 409 (RECOMMENDATION_NOT_PENDING, EVENT_NOT_EDITABLE, CATEGORY_INACTIVE, CURRENCY_MISMATCH).   |
| Success State       | Toast con conteo `created_items_count` y `replaced_items_count`; tabla de US-035 refresca.                                              |
| Accessibility Notes | `role="dialog"`, `aria-labelledby`, `aria-describedby`, focus trap. Errores con `aria-live="polite"`.                                   |
| Responsive Notes    | Mobile-first: tabla colapsable; edición inline reusa el patrón de US-036.                                                              |
| i18n Notes          | Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`. El `payload.categories[].notes` ya está localizado por US-019 (BR-AI-011).          |
| Currency Notes      | Moneda del evento; sin conversión FX. Currency CLDR como en US-035.                                                                    |

### Modales

* **Modal de confirmación de reemplazo** (D2): se muestra cuando el preview detecta `replaced_items_count > 0` antes de invocar apply.
  * Copy: "Esto reemplazará X items generados por IA en Y categorías. Tus items manuales se preservan. ¿Continuar?"
* **Modal de error CATEGORY_INACTIVE** (D6): CTAs "Regenerar sugerencia" (US-019) y "Aplicar manualmente" (US-036).

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * Vista budget de US-035 con CTA condicional cuando existe `AIRecommendation pending`.
* Components:
  * `ApplyAIBudgetDialog` (preview + edición inline + toggle por fila).
  * `ReplaceConfirmationDialog` (D2).
  * `CategoryInactiveErrorDialog` (D6).
* State Management:
  * TanStack: `useApplyBudgetSuggestion(aiRecommendationId)` con `onSuccess` que invoca `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] })` (consistente con US-035 D1 y US-036).
* Forms:
  * RHF + Zod (schema espejo del body backend) para `editedPayload`.
* API Client:
  * `aiRecommendationsApi.apply(aiRecommendationId, { editedPayload? })` (provisto por US-025; US-037 lo consume).

### Backend

* Use Case / Service:
  * `ApplyBudgetSuggestionUseCase` (nuevo).
  * Registrado como handler del dispatcher de US-025 para `type='budget_suggestion'`.
* Controller / Route:
  * Reuso del controller de US-025; US-037 NO introduce routing nuevo.
* Authorization Policy:
  * `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard` aplicados en el dispatcher de US-025; US-037 revalida `event_id` del `AIRecommendation` contra `event.owner_id` y `path.eventId`.
* Validation:
  * Zod para `editedPayload` (espejo del body cliente).
* Transaction Required:
  * Sí: `prisma.$transaction([items.softDelete(replaceable), items.create×N, recommendation.update])`.

### Database

* Main Tables:
  * `ai_recommendations` (update `status`, `edited`, `accepted_at`, `accepted_by`).
  * `budget_items` (inserts N + soft-deletes M).
  * `service_categories` (read-only para resolver `service_category_code → id` y verificar `is_active`).
* Constraints:
  * `BudgetItem.ai_generated = true`, `ai_recommendation_id = aiRecommendationId`, `committed = 0`, `paid = 0`.
  * Reuso del soft delete de US-036 (`deleted_at`, `deleted_by`).
* Index Considerations:
  * Reuso. Recomendado para Future: índice parcial sobre `budget_items (event_id, ai_generated, ai_recommendation_id) WHERE deleted_at IS NULL` si el dataset crece.
  * Sin migraciones nuevas.

### API

| Method | Endpoint                                                              | Purpose                                                                                                       |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/ai-recommendations/:aiRecommendationId/apply`                  | Endpoint genérico de US-025. US-037 aporta el handler para `type='budget_suggestion'`.                          |

#### Body

```json
{
  "editedPayload": {
    "categories": [
      { "service_category_code": "catering", "planned": 4500.00, "label": "Catering principal" },
      { "service_category_code": "venue", "planned": 3000.00 }
    ]
  }
}
```

`editedPayload` es opcional; si se omite, se aplica el payload original tal cual.

#### Response (200)

```json
{
  "created_items": [
    {
      "id": "uuid",
      "service_category_id": "uuid",
      "category_name": "Catering",
      "planned": 4500.00,
      "committed": 0,
      "paid": 0,
      "ai_generated": true
    }
  ],
  "replaced_items_count": 2,
  "recommendation": {
    "id": "uuid",
    "status": "accepted",
    "edited": true,
    "accepted_at": "2026-06-27T05:55:00Z"
  }
}
```

#### Catálogo de errores (Documentation Alignment vía US-098)

* `400 INVALID_VALUE` — entradas inválidas.
* `400 INVALID_PARAMS` — UUIDs inválidos.
* `401 UNAUTHORIZED`.
* `403 FORBIDDEN` — vendor o admin.
* `404 NOT_FOUND` — `AIRecommendation` ajena o inexistente.
* `409 RECOMMENDATION_NOT_PENDING`.
* `409 EVENT_NOT_EDITABLE`.
* `409 CATEGORY_INACTIVE` con `inactive_categories[]`.
* `409 CURRENCY_MISMATCH`.
* `422 PAYLOAD_INVALID` — payload del `AIRecommendation` corrupto (defensa profunda).
* `500 INTERNAL_ERROR` — rollback transaccional.

### Observability / Audit

* Correlation ID Required: Yes (heredado).
* Log Event Required: Sí — `budget.ai_suggestion.applied` con `aiRecommendationId`, `event_id`, `user_id`, `accepted_entries_count`, `replaced_items_count`, `created_items_count`, `edited`, `correlation_id`, `duration_ms`. Sin PII.
* AdminAction Required: No.
* AIRecommendation Required: Sí (update).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | Apply as-is (sin `editedPayload`) ⇒ todos los items materializados                 | Integration |
| TS-02 | Apply parcial editado (subset + edits) ⇒ solo K items + `edited=true`              | Integration |
| TS-03 | Reemplazo solo de items `ai_generated=true` previos; manuales preservados (D2)     | Integration |
| TS-04 | Cache TanStack invalidado tras apply                                              | E2E         |
| TS-05 | Atomicidad: fallo simulado a mitad ⇒ ROLLBACK; AIRecommendation queda `pending`    | Integration |

### Negative Tests

| ID    | Scenario                                                                          | Expected Result                          |
| ----- | --------------------------------------------------------------------------------- | ---------------------------------------- |
| NT-01 | `status='accepted'` o `'discarded'`                                               | 409 `RECOMMENDATION_NOT_PENDING`         |
| NT-02 | Recurso ajeno (event_id desalineado o owner distinto)                              | 404 `NOT_FOUND`                          |
| NT-03 | Sin sesión                                                                        | 401                                       |
| NT-04 | Admin                                                                              | 403                                       |
| NT-05 | Vendor                                                                             | 403                                       |
| NT-06 | Event `cancelled`                                                                  | 409 `EVENT_NOT_EDITABLE`                  |
| NT-07 | Event `completed`                                                                  | 409 `EVENT_NOT_EDITABLE`                  |
| NT-08 | Categoría inactiva                                                                 | 409 `CATEGORY_INACTIVE`                   |
| NT-09 | `editedPayload.categories[].service_category_code` no en payload original          | 400 `INVALID_VALUE`                       |
| NT-10 | `editedPayload.categories[]` vacío                                                 | 400 `INVALID_VALUE`                       |
| NT-11 | `planned < 0`                                                                      | 400 `INVALID_VALUE`                       |
| NT-12 | `currency_code` del payload distinto del evento                                    | 409 `CURRENCY_MISMATCH`                   |

### AI Tests

| ID       | Scenario                                                                          | Expected Result                          |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------- |
| AI-TS-01 | Items creados con `ai_generated=true` y `ai_recommendation_id` correcto            | OK                                        |
| AI-TS-02 | `AIRecommendation.status='accepted'`, `accepted_at`, `accepted_by`                  | OK                                        |
| AI-TS-03 | Idioma del payload preservado (BR-AI-011)                                          | OK (no se reescribe `notes`)              |
| AI-TS-04 | `edited=true` cuando hay diff vs payload original o subset                          | OK                                        |
| AI-TS-05 | `edited=false` cuando `editedPayload` omitido                                       | OK                                        |

### Authorization Tests

| ID         | Scenario                              | Expected Result |
| ---------- | ------------------------------------- | --------------- |
| AUTH-TS-01 | Owner del evento                       | 200             |
| AUTH-TS-02 | Otro organizer                         | 404             |
| AUTH-TS-03 | Vendor                                | 403             |
| AUTH-TS-04 | Admin                                 | 403             |
| AUTH-TS-05 | Sin sesión                            | 401             |

### Performance Tests

| ID      | Scenario                                                                          | Expected               |
| ------- | --------------------------------------------------------------------------------- | ---------------------- |
| PERF-01 | Apply con 12 entradas + transacción completa                                       | P95 < 1.5 s            |

### Accessibility Tests

| ID       | Scenario                                                                          | Expected                                  |
| -------- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| A11Y-01  | `ApplyAIBudgetDialog` con `role="dialog"`, focus trap, ESC para cerrar             | jest-axe sin violaciones                  |
| A11Y-02  | Edición inline anuncia errores con `aria-live`                                     | jest-axe sin violaciones                  |
| A11Y-03  | Modales de error con `role="dialog"` y CTAs accesibles                              | jest-axe sin violaciones                  |

### Contract Tests

| ID           | Scenario                                                              | Expected                                |
| ------------ | --------------------------------------------------------------------- | --------------------------------------- |
| CONTRACT-01  | Request body `editedPayload` y response vs OpenAPI snapshot (US-098)   | Match exacto                            |

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Adopción IA en budget (% organizadores que aplican vs descartan).            |
| Expected Impact     | Acelera setup financiero del evento; baseline confiable para US-036 CRUD.    |
| Success Criteria    | ≥ 50% acepta total o parcial; demo end-to-end HITL funcional.                |
| Academic Demo Value | HITL canónico aplicado a finanzas; evidencia de auditoría reconstruible.      |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `ApplyAIBudgetDialog` con preview + edición inline + toggle por fila.
* `ReplaceConfirmationDialog`.
* `CategoryInactiveErrorDialog`.
* Hook `useApplyBudgetSuggestion` con invalidación TanStack.
* i18n: claves `budget.apply_ai.*` en 4 locales.

### Potential Backend Tasks

* `ApplyBudgetSuggestionUseCase` con lógica D2/D3/D4/D5/D6.
* Zod schema de `editedPayload`.
* Registro del handler en el dispatcher de US-025.
* Reuso de `BudgetItemWriteRepository` (US-036) y `AIRecommendationRepository` (US-019).
* Lookup de `ServiceCategory` por `code`.
* Logger estructurado `budget.ai_suggestion.applied`.

### Potential Database Tasks

* Sin migraciones.
* Verificación de plan SQL del soft-delete + inserts batch + update dentro de transacción.

### Potential AI / PromptOps Tasks

* No aplica (no se invoca LLMProvider).

### Potential QA Tasks

* TS, NT, AI-TS, AUTH-TS, PERF, A11Y, CONTRACT.
* Tests de atomicidad (rollback simulado).
* Tests del modal de confirmación de reemplazo.

### Potential DevOps / Config Tasks

* No aplica.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida.
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Funcional: handler integrado al dispatcher de US-025; apply total y parcial funcionan; soft delete de reemplazables; AIRecommendation actualizado.
* [ ] Tests verdes: unit, integration (incluida atomicidad/rollback), E2E, perf, a11y, contract.
* [ ] Cache TanStack `['event', eventId, 'budget']` invalidado tras apply.
* [ ] Logs estructurados `budget.ai_suggestion.applied` emitidos sin PII.
* [ ] Bloqueos (status, event_status, categoría inactiva, currency mismatch) verificados.
* [ ] i18n verificado en `es-LATAM`, `es-ES`, `pt`, `en`.
* [ ] Accesibilidad verificada (`role="dialog"`, focus trap, aria-live).
* [ ] OpenAPI snapshot actualizado por US-098 (handoff).
* [ ] PO valida demo end-to-end (US-019 → US-037 → US-035 → US-036).

---

## 📝 Notes

* US-037 NO introduce routing; el endpoint es de US-025. Cualquier futuro cambio al body/response debe coordinarse con US-025.
* Copy localizado del modal de confirmación de reemplazo (D2) y del modal CATEGORY_INACTIVE (D6) debe vivir en `messages/<locale>.json` con claves `budget.apply_ai.confirm_replace.*` y `budget.apply_ai.category_inactive.*`.
* Documentation Alignment Required (no bloqueantes): docs/16 §35.3 con catálogo de errores específico por type, nota interpretativa en UC-BUDGET-001 §E1 (CATEGORY_INACTIVE), nota en BR-BUDGET-008 referenciando D3, housekeeping NFR-PERF-001.
* Handoff: productor US-019 → dispatcher US-025 → handler US-037 → consumidor cache US-035 → CRUD relacionado US-036.
