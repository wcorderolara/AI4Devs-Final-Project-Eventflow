# Technical Specification — US-037: Aceptar distribución IA como BudgetItems editables

## 1. Metadata

| Field                                | Value                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User Story ID                        | US-037                                                                                                                                                             |
| Source User Story                    | `management/user-stories/US-037-accept-ai-budget-distribution.md`                                                                                                   |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-037-decision-resolution.md`                                                                                        |
| Priority                             | P1                                                                                                                                                                 |
| Backlog ID                           | PB-P1-021                                                                                                                                                          |
| Backlog Title                        | Aceptar distribución IA como BudgetItems                                                                                                                          |
| Backlog Execution Order              | 39 (P0: 18 items + P1: 21 items)                                                                                                                                   |
| User Story Position in Backlog Item  | 1 de 1                                                                                                                                                              |
| Related User Stories in Backlog Item | US-037                                                                                                                                                              |
| Epic                                 | EPIC-BUD-001 — Budget Management & Currency                                                                                                                        |
| Backlog Item Dependencies            | PB-P1-013 (US-019 productor), PB-P1-016 (US-025 dispatcher), PB-P1-020 (US-035 vista + US-036 CRUD)                                                                   |
| Feature                              | Aceptación de distribución IA                                                                                                                                       |
| Module / Domain                      | Budget / AI (HITL)                                                                                                                                                  |
| User Story Status                    | Approved with Minor Notes                                                                                                                                          |
| Backlog Alignment Status             | Found                                                                                                                                                              |
| Technical Spec Status                | Ready for Task Breakdown                                                                                                                                            |
| Created Date                         | 2026-06-27                                                                                                                                                          |
| Last Updated                         | 2026-06-27                                                                                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-021 — Aceptar distribución IA como BudgetItems` cierra el ciclo end-to-end del Budget IA. Productor: `PB-P1-013/US-019` (genera el `AIRecommendation { type='budget_suggestion', status='pending' }`). Dispatcher: `PB-P1-016/US-025` (provee el endpoint canónico `POST /api/v1/ai-recommendations/:id/apply` con dispatch por type). Consumidores aguas abajo: `PB-P1-020/US-035` (refresca la vista vía invalidación de cache) y `PB-P1-020/US-036` (CRUD posterior sobre los items materializados).

### Execution Order Rationale

US-037 se ubica después de US-019 (productor), US-025 (dispatcher) y US-035/US-036 (consumidores) porque depende de:
1. La persistencia del `AIRecommendation { type='budget_suggestion' }` con shape `payload.categories[]` (US-019).
2. El endpoint genérico `/ai-recommendations/:id/apply` con dispatch por type (US-025).
3. El `BudgetItemWriteRepository`, `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`, filtro `deleted_at IS NULL` en read repo y la query key TanStack canónica `['event', eventId, 'budget']` (US-035/US-036).

PB-P1-021 ocupa la posición 39 en el Product Backlog Prioritized.

### Related User Stories in Same Backlog Item

| User Story                                                | Role in Backlog Item                                            | Suggested Order |
| --------------------------------------------------------- | --------------------------------------------------------------- | --------------- |
| US-037 — Aplicar sugerencia IA como BudgetItems editables   | Handler para `type='budget_suggestion'` del dispatcher de US-025  | 1               |

---

## 3. Executive Technical Summary

US-037 implementa el handler `ApplyBudgetSuggestionUseCase` que el dispatcher de US-025 invoca cuando `AIRecommendation.type='budget_suggestion'`. NO introduce ruta HTTP nueva: consume `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` (US-025) con body opcional `{ editedPayload?: { categories: [{ service_category_code, planned, label? }] } }`. El handler ejecuta una sola `prisma.$transaction` que (a) realiza soft delete de items reemplazables (D2: `ai_generated=true ∧ ai_recommendation_id ≠ aiRecommendationId ∧ deleted_at IS NULL ∧ event_id = path.eventId`), (b) inserta N `BudgetItem(ai_generated=true, committed=0, paid=0, ai_recommendation_id=aiRecommendationId)` con `service_category_id` resuelto desde `service_category_code` server-side, y (c) actualiza `AIRecommendation { status='accepted', edited, accepted_at, accepted_by }`. Errores tipados cubren D5 (`EVENT_NOT_EDITABLE`), D6 (`CATEGORY_INACTIVE`), defensa profunda (`CURRENCY_MISMATCH`, `PAYLOAD_INVALID`) y D4 (`RECOMMENDATION_NOT_PENDING`). Sin migraciones; reuso íntegro de `BudgetItemWriteRepository` (US-036) y `AIRecommendationRepository` (US-019). Frontend introduce `ApplyAIBudgetDialog` con preview/edición/toggle por fila, dos modales auxiliares (confirmación de reemplazo D2; error CATEGORY_INACTIVE con CTAs a US-019/US-036) y un hook TanStack que invalida `['event', eventId, 'budget']` tras éxito. Sin invocación al LLMProvider en runtime; el rate limit `SEC-POL-AI-007` no aplica aquí (sí en US-019). Acoplamiento con `modules/booking` no requerido; sí con `modules/ai-recommendations` vía adapter del dispatcher.

---

## 4. Scope Boundary

### In Scope

* `ApplyBudgetSuggestionUseCase` con la lógica D1–D6 dentro de una `prisma.$transaction`.
* Zod schemas para el body `editedPayload` (espejo del shape declarado en US-037).
* Registro del handler en el dispatcher de US-025 (`BudgetSuggestionApplyHandler` implementa el port `AIRecommendationApplyHandlerPort` que expone US-025).
* Resolución de `service_category_code → service_category_id` y verificación `is_active=true` (D6).
* Verificación `event.status ∈ {'draft','active'}` (D5).
* Verificación `AIRecommendation.status='pending'`, `event_id` alineado (anti-IDOR) y `currency_code` consistente (defensa profunda D8/AC-08).
* Soft delete transaccional de items reemplazables (D2).
* Update transaccional de `AIRecommendation` (D4).
* Logger estructurado `budget.ai_suggestion.applied`.
* Frontend: `ApplyAIBudgetDialog`, `ReplaceConfirmationDialog`, `CategoryInactiveErrorDialog`, hook `useApplyBudgetSuggestion`, integración con la vista de US-035 y i18n.
* Tests unit/integration (incluida atomicidad y SEC anti-IDOR), E2E, perf, A11Y, contract.

### Out of Scope

* Routing HTTP nuevo (descartado por D1; el endpoint es de US-025).
* Endpoint `/discard` (pertenece a US-025).
* Invocación al `LLMProvider` (productor es US-019).
* Hard delete de items reemplazados (soft delete D2).
* Estados nuevos en `AIRecommendation.status` (D4 mantiene `pending|accepted|discarded`).
* Conversión FX o multi-moneda (BR-BUDGET-007).
* Materialización del agregado `summary` (vive en US-035).
* Auto-aplicación sin acción del usuario (HITL obligatorio).
* Aplicación parcial silenciosa cuando hay categorías inactivas (D6 rechaza con 409).
* Locking optimista para concurrencia (last-write-wins; consistente con US-036 EC-08).

### Explicit Non-Goals

* No exponer flags para deshabilitar HITL.
* No mutar `ai_generated` ni reemplazar el `ai_recommendation_id` de items históricos.
* No mover el dispatcher fuera de `modules/ai-recommendations` ni crear un sub-controller específico de Budget.

---

## 5. Architecture Alignment

### Backend Architecture

* **Stack**: Node.js + Express + TypeScript + Prisma + PostgreSQL.
* **Patrón**: Clean / Hexagonal (controller US-025 → dispatcher → handler US-037 → repositorios).
* **Reuso**:
  * `BudgetItemWriteRepository` (US-036): `create`, `softDelete`, query helper para items reemplazables.
  * `BudgetItemReadRepository` (US-035 + extensión de US-036): filtro `deleted_at IS NULL`.
  * `AIRecommendationRepository` (US-019): `findById`, `markAccepted`.
  * `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard` (heredados del dispatcher).
* **Nuevo**:
  * `ApplyBudgetSuggestionUseCase` (en `modules/budget`).
  * Adapter `BudgetSuggestionApplyHandler` que implementa `AIRecommendationApplyHandlerPort` (expuesto por `modules/ai-recommendations`).
  * `ServiceCategoryReadPort` (en `modules/budget`) y adapter en `modules/catalog` (o el módulo que albergue `ServiceCategory`) para `findByCode` y `findManyActiveByCodes`.
* **Cross-module**:
  * `modules/budget` consume puertos hacia `modules/ai-recommendations` (registro del handler en el dispatcher) y `modules/catalog` (lookup de categorías). Sin imports circulares; el dispatcher de US-025 expone el port y conoce el handler vía DI.

### Frontend Architecture

* **Stack**: Next.js App Router + TypeScript + TanStack Query + RHF + Zod + Tailwind + next-intl.
* **Reuso de US-035**: ruta `/[locale]/organizer/events/[eventId]/budget`, query key canónica `['event', eventId, 'budget']`, `BudgetView` para renderizar el resultado tras invalidación.
* **Nuevo**:
  * `ApplyAIBudgetDialog`: preview de entradas + edición inline de `planned` + toggle por fila (incluida/excluida) + total acumulado.
  * `ReplaceConfirmationDialog`: confirmación previa cuando el preview detecta items a reemplazar (`replaced_items_count > 0`).
  * `CategoryInactiveErrorDialog`: copy localizado + CTAs deeplink a US-019 (regenerar) y US-036 (manual).
  * Hook `useApplyBudgetSuggestion(aiRecommendationId)` con `onSuccess` que invalida la query key canónica.
  * `aiRecommendationsApi.apply` (entregado por US-025) consumido por el hook.

### Database Architecture

* **Modelos**: `ai_recommendations`, `budget_items`, `service_categories`. Sin cambios estructurales.
* **Sin migraciones**.
* **Índices**: reuso. Recomendado evaluar índice parcial `(event_id, ai_generated, ai_recommendation_id) WHERE deleted_at IS NULL` si el dataset crece; postergable.

### API Architecture

* **Endpoint reusado** (de US-025): `POST /api/v1/ai-recommendations/:aiRecommendationId/apply`.
* **Catálogo de errores extendido**: `RECOMMENDATION_NOT_PENDING`, `EVENT_NOT_EDITABLE`, `CATEGORY_INACTIVE`, `CURRENCY_MISMATCH`, `PAYLOAD_INVALID`, `INVALID_VALUE`, `INVALID_PARAMS`.

### AI / PromptOps Architecture

* US-037 NO invoca `LLMProvider`. Consume `AIRecommendation.payload` persistido por US-019 (incluye `categories[]` con `notes` ya localizado por `BR-AI-011`).
* `ADR-AI-001` (LLMProvider abstraction) y `BR-AI-011` se honran upstream; US-037 los hereda.

### Security Architecture

* HTTP-only cookies; backend como source of truth.
* RBAC y ownership reusados desde el dispatcher; revalidación local del `event_id` del `AIRecommendation` para anti-IDOR.
* No-revelación 404 en recursos ajenos.
* Logging sin PII.

### Testing Architecture

* Vitest (unit + integration), Supertest contra el dispatcher de US-025 (no se monta servidor adicional), Playwright (E2E), MSW (mocks frontend), jest-axe (A11Y), snapshot contractual contra OpenAPI.

---

## 6. Functional Interpretation

| Acceptance Criterion                                          | Technical Interpretation                                                                                                                                                                                                                                                                | Impacted Layer(s)                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| AC-01 Aplicar total o editada                                  | Handler dentro de `$transaction`: ownership/event check → resolución categorías → soft delete reemplazables → inserts N → update recommendation. Response `{ created_items, replaced_items_count, recommendation }`.                                                                       | BE, API                          |
| AC-02 Aceptación parcial (subset)                              | `editedPayload.categories` subconjunto del original; entradas no incluidas se descartan. `edited` recalculado por diff.                                                                                                                                                                | BE                                |
| AC-03 Política de reemplazo                                    | Query: `BudgetItemWriteRepository.findReplaceable(eventId, aiRecommendationId)` con predicados D2.                                                                                                                                                                                       | BE, DB                            |
| AC-04 Bloqueo por estado del evento                             | Verificación `event.status ∈ {'draft','active'}` antes de cualquier mutación.                                                                                                                                                                                                            | BE                                |
| AC-05 Rechazo CATEGORY_INACTIVE                                | `ServiceCategoryReadPort.findManyActiveByCodes(codes)` filtra activas; si faltan, 409 con `inactive_categories[]`.                                                                                                                                                                       | BE                                |
| AC-06 Invalidación cache TanStack                              | Hook frontend invoca `queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] })` en `onSuccess`.                                                                                                                                                                          | FE                                |
| AC-07 Atomicidad / rollback                                    | Toda la lógica del handler ocurre dentro de `prisma.$transaction`; errores lanzan rollback.                                                                                                                                                                                              | BE, DB                            |
| AC-08 Consistencia de moneda                                    | Defensa profunda: `recommendation.payload.currency_code === event.currency_code`. Si no, 409 `CURRENCY_MISMATCH`.                                                                                                                                                                       | BE                                |
| AC-09 A11Y del dialog                                          | `role="dialog"`, focus trap, ESC, `aria-busy`, `aria-live` en errores.                                                                                                                                                                                                                  | FE                                |
| AC-10 Performance                                              | Una transacción con N inserts + M soft-deletes + 1 update. PERF-01 con N=12. P95 < 1.5 s.                                                                                                                                                                                                | BE, DB, QA                        |
| EC-01..09                                                     | Cubiertos por validaciones del handler y mensajes de error tipados.                                                                                                                                                                                                                    | BE, FE                            |
| VR-01..10                                                     | Implementadas en Zod schemas + verificaciones del handler.                                                                                                                                                                                                                              | BE                                |
| SEC-01..06                                                    | Reuso de policies/guards + revalidación cross-event en el handler.                                                                                                                                                                                                                     | BE, SEC                           |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/budget` (extensión): agrega el use case write `ApplyBudgetSuggestionUseCase` y el adapter `BudgetSuggestionApplyHandler`.
* `modules/ai-recommendations` (consumidor del handler vía port `AIRecommendationApplyHandlerPort`; expuesto por US-025).
* `modules/catalog` o `modules/service-categories` (proveedor del adapter para `ServiceCategoryReadPort`).

### Use Cases / Application Services

* `ApplyBudgetSuggestionUseCase`:
  1. Recibe `{ aiRecommendationId, currentUser, editedPayload? }`.
  2. Lee `AIRecommendation` por ID:
     - Si no existe → 404 `NOT_FOUND` (no-revelación).
     - Si `type ≠ 'budget_suggestion'` → 422 `PAYLOAD_INVALID` (no debería ocurrir; el dispatcher de US-025 enruta por type).
     - Si `status ≠ 'pending'` → 409 `RECOMMENDATION_NOT_PENDING`.
  3. Lee `event` por `recommendation.event_id`:
     - Si `event.owner_id ≠ currentUser.id` → 404 (no-revelación).
     - Si `event.status ∉ {'draft','active'}` → 409 `EVENT_NOT_EDITABLE`.
  4. Verifica `recommendation.payload.currency_code === event.currency_code`. Si no → 409 `CURRENCY_MISMATCH`.
  5. Determina `entries`:
     - Si `editedPayload` omitido → `entries = recommendation.payload.categories` con `edited = false`.
     - Si presente → validación Zod estricta; subset = todas las entradas referenciadas deben existir en `payload.categories` por `service_category_code`; `edited = (subset.length < payload.categories.length) || any(planned ≠ original.planned) || any(label set)`.
     - Si `editedPayload.categories.length === 0` → 400 `INVALID_VALUE`.
  6. Resuelve `service_category_codes` con `ServiceCategoryReadPort.findManyByCodes(codes)`:
     - Si alguna falta → 422 `PAYLOAD_INVALID`.
     - Si alguna `is_active = false` → 409 `CATEGORY_INACTIVE` con `inactive_categories[]`.
  7. Abre `prisma.$transaction`:
     a. Query `findReplaceable(eventId, aiRecommendationId)` para obtener N items a reemplazar.
     b. `softDeleteMany(replaceable_ids, deletedBy=currentUser.id)`.
     c. `createMany(entries.map(entry => ({ budget_id, service_category_id, label?: entry.label, planned: entry.planned, committed: 0, paid: 0, ai_generated: true, ai_recommendation_id: aiRecommendationId })))`.
     d. `aiRecommendationRepository.markAccepted({ id, edited, accepted_at: NOW(), accepted_by: currentUser.id })`.
  8. Tras commit, lee los items recién creados (mismo `ai_recommendation_id`).
  9. Emite log `budget.ai_suggestion.applied`.
  10. Retorna `{ created_items, replaced_items_count, recommendation }`.

### Controllers / Routes

* **Reuso íntegro del controller de US-025**. US-037 NO declara ruta nueva.
* El dispatcher de US-025 inyecta el `ApplyBudgetSuggestionUseCase` cuando `recommendation.type === 'budget_suggestion'`.

### DTOs / Schemas

```ts
// apps/api/src/modules/budget/dto/edited-payload.body.ts
export const editedBudgetPayloadCategorySchema = z.object({
  service_category_code: z.string().min(1),
  planned: z.number().nonnegative(),
  label: z.string().min(1).max(120).optional(),
}).strict();

export const editedBudgetPayloadSchema = z.object({
  categories: z.array(editedBudgetPayloadCategorySchema).min(1), // vacío rechaza con 400 INVALID_VALUE
}).strict();

export const applyBudgetSuggestionBodySchema = z.object({
  editedPayload: editedBudgetPayloadSchema.optional(),
}).strict();
```

Response: reuso de `BudgetItemDto` (US-035) y `AIRecommendationDto` (US-019). Composición:

```ts
export const applyBudgetSuggestionResponseSchema = z.object({
  created_items: z.array(budgetItemDto),
  replaced_items_count: z.number().int().nonnegative(),
  recommendation: aiRecommendationDto,
});
```

### Repository / Persistence

* `BudgetItemWriteRepository` (US-036) extendido con:
  * `findReplaceable({ eventId, aiRecommendationId }): Promise<{ id: string }[]>` con predicado D2.
  * `createMany(items): Promise<BudgetItem[]>` (Prisma `createMany` + segundo `findMany` por `ai_recommendation_id` para obtener IDs si `createMany` no los retorna por defecto).
  * `softDeleteMany(itemIds, deletedBy): Promise<void>`.

* `AIRecommendationRepository` (US-019) extendido con:
  * `markAccepted({ id, edited, acceptedAt, acceptedBy }): Promise<AIRecommendation>`.

* `ServiceCategoryReadPort` (nuevo en `modules/budget`):
  * `findManyByCodes(codes: string[]): Promise<ServiceCategory[]>`.
  * Adapter en `modules/catalog` consulta `prisma.serviceCategory.findMany({ where: { code: { in: codes } } })`.

### Validation Rules

| ID    | Implementación                                                                                  |
| ----- | ----------------------------------------------------------------------------------------------- |
| VR-01 | Verificación `recommendation.event_id === path.eventId` y `event.owner_id === currentUser.id`. |
| VR-02 | `recommendation.status === 'pending'`.                                                          |
| VR-03 | Cada `service_category_code` ∈ `payload.categories` original.                                    |
| VR-04 | Zod `planned: z.number().nonnegative()`.                                                         |
| VR-05 | Zod `editedPayload.categories.min(1)`.                                                            |
| VR-06 | `event.status ∈ {'draft','active'}`.                                                              |
| VR-07 | Filtro `is_active = true` en `ServiceCategory`.                                                  |
| VR-08 | Zod UUIDs en path (manejado por el controller de US-025).                                         |
| VR-09 | `authRequired` (middleware del controller de US-025).                                              |
| VR-10 | Verificación `recommendation.payload.currency_code === event.currency_code`.                      |

### Error Handling

* Errores tipados como `DomainError` con `error_code`, `httpStatus`, `details?`.
* Middleware de error transforma a `{ error_code, message, details? }` consistente con `docs/16 §error format`.
* Rollback automático por `prisma.$transaction` ante cualquier throw.

### Transactions

* **Sí**: una única `prisma.$transaction([softDeleteMany?, createMany, markAccepted])` que cubre todas las mutaciones.
* Aislamiento por defecto (read committed) suficiente para MVP.

### Observability

* Logger estructurado `budget.ai_suggestion.applied`:

  ```json
  {
    "event": "budget.ai_suggestion.applied",
    "aiRecommendationId": "<uuid>",
    "eventId": "<uuid>",
    "userId": "<uuid>",
    "accepted_entries_count": 5,
    "replaced_items_count": 3,
    "created_items_count": 5,
    "edited": true,
    "correlationId": "<id>",
    "duration_ms": 142
  }
  ```
* Métricas: reuso del histogram `http_request_duration_seconds{route="/ai-recommendations/:id/apply"}` (provisto por US-025). Sin métricas nuevas.

---

## 8. Frontend Technical Design

### Routes / Pages

* Reuso de `/[locale]/organizer/events/[eventId]/budget` (US-035) con CTA "Aplicar sugerencia IA" condicional cuando existe `AIRecommendation { type='budget_suggestion', status='pending' }`.

### Components

* `ApplyAIBudgetDialog` (nuevo):
  * Preview de `payload.categories` con campos `service_category_code`, `name` (resuelto), `percentage`, `amount`, `notes`.
  * Toggle por fila (incluir/excluir) → si quedan 0 incluidas, el botón "Aplicar" se deshabilita.
  * Edición inline de `planned` con Zod cliente.
  * Total acumulado de `planned` mostrado al pie.
* `ReplaceConfirmationDialog` (nuevo):
  * Se abre cuando el preview detecta `replaced_items_count > 0`.
  * Copy localizado con conteo y lista de categorías afectadas.
  * CTAs "Continuar" (invoca apply) y "Cancelar".
* `CategoryInactiveErrorDialog` (nuevo):
  * Se abre cuando el response es 409 `CATEGORY_INACTIVE`.
  * Lista de `inactive_categories`.
  * CTAs "Regenerar sugerencia" (deeplink a US-019) y "Aplicar manualmente" (deeplink a US-036).

### Forms

* RHF + Zod (espejo de `editedBudgetPayloadSchema`).
* Validación cliente para `planned ≥ 0`, mínimo una fila incluida.

### State Management

* Hook `useApplyBudgetSuggestion(aiRecommendationId)`:
  * `mutationFn = (body) => aiRecommendationsApi.apply(aiRecommendationId, body)`.
  * `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId, 'budget'] })`.
  * Mapeo `error_code → copy localizado`.
  * Manejo dedicado del 409 `CATEGORY_INACTIVE` para abrir `CategoryInactiveErrorDialog`.

### Data Fetching

* Lectura: `useEventBudget(eventId)` (US-035) ya consume el listado; el preview puede leer el `AIRecommendation` desde un hook adicional `useAIRecommendation(aiRecommendationId)` (provisto por US-019 / US-025).
* Escritura: `aiRecommendationsApi.apply` (US-025).

### Loading / Empty / Error / Success States

* **Loading**: spinner con `aria-busy="true"`; mínimo 300 ms.
* **Empty**: cubierto por US-035 (no aplica a US-037).
* **Error**: 409/400/500 mapeados a copy específico.
* **Success**: toast con `created_items_count` y `replaced_items_count`; cierre del dialog; refresh automático vía invalidación.

### Accessibility

* `role="dialog"`, `aria-labelledby`, `aria-describedby`, focus trap, ESC.
* `aria-busy="true"` durante loading.
* `aria-live="polite"` para anuncios de error.
* Test con jest-axe.

### i18n

* Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`.
* Claves nuevas en `messages/<locale>.json`:
  * `budget.apply_ai.dialog_title`, `budget.apply_ai.cta_apply`, `budget.apply_ai.cta_cancel`.
  * `budget.apply_ai.confirm_replace.title`, `budget.apply_ai.confirm_replace.body`, `budget.apply_ai.confirm_replace.cta_continue`.
  * `budget.apply_ai.category_inactive.title`, `budget.apply_ai.category_inactive.body`, `budget.apply_ai.category_inactive.cta_regenerate`, `budget.apply_ai.category_inactive.cta_manual`.
  * `budget.apply_ai.success_toast` con interpolación `{created_count}`, `{replaced_count}`.
  * Mapeo `error_code → texto`.

---

## 9. API Contract Design

| Method | Endpoint                                                              | Purpose                                                                                                       | Auth Required | Request                                                | Response                                                                                            | Error Cases                                                                                                                                  |
| ------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/ai-recommendations/:aiRecommendationId/apply`                  | Endpoint genérico (US-025). US-037 aporta el handler para `type='budget_suggestion'`.                          | Sí (cookie)   | Body: `{ editedPayload? }` (Zod estricto, opcional)     | `200 { created_items: BudgetItemDto[], replaced_items_count: number, recommendation: AIRecommendationDto }` | 400 `INVALID_VALUE`/`INVALID_PARAMS`; 401; 403; 404 `NOT_FOUND`; 409 `RECOMMENDATION_NOT_PENDING`/`EVENT_NOT_EDITABLE`/`CATEGORY_INACTIVE`/`CURRENCY_MISMATCH`; 422 `PAYLOAD_INVALID`; 500 `INTERNAL_ERROR` |

### Documentation Alignment Required

Actualizar `docs/16 §35.3` con el catálogo de errores específico para `type='budget_suggestion'`. Snapshot OpenAPI por US-098 (Future).

---

## 10. Database / Prisma Design

### Models Impacted

* `AIRecommendation` (update `status`, `edited`, `accepted_at`, `accepted_by`).
* `BudgetItem` (inserts N + soft-deletes M).
* `ServiceCategory` (read-only).

### Fields / Columns

* Sin nuevos campos. Reuso de columnas existentes (PB-P0-001 + extensiones de US-019 para `AIRecommendation` y US-036 para `BudgetItem.deleted_at`/`deleted_by`).

### Relations

* Sin cambios. `BudgetItem.ai_recommendation_id → AIRecommendation.id`.

### Indexes

* Reuso. Postergable: índice parcial `(event_id, ai_generated, ai_recommendation_id) WHERE deleted_at IS NULL` en `budget_items` si PERF-01 lo requiere.

### Constraints

* Reuso.

### Migrations Impact

**Ninguna**.

### Seed Impact

* Recomendado: garantizar al menos un `AIRecommendation { type='budget_suggestion', status='pending' }` en el seed de US-019 para demoar US-037 sin necesidad de invocar LLMProvider.

---

## 11. AI / PromptOps Design

No aplica directamente en runtime. US-037 consume `AIRecommendation.payload` ya persistido por US-019 sin tocar el `LLMProvider`.

* `BR-AI-011` (idioma) ya respetado por US-019; US-037 no recalcula `notes`.
* `BR-AI-001..003` (HITL): esta US ES el HITL canónico para AI-003.
* `BR-AI-008` (`ai_generated`): items creados con `ai_generated=true` siempre.
* `SEC-POL-AI-007` (rate limit a LLM): NO aplica porque no se invoca al provider.

---

## 12. Security & Authorization Design

### Authentication

* HTTP-only cookie (middleware del controller de US-025).

### Authorization

* `OrganizerRoleGuard`, `EventOwnershipPolicy`, `adminExclusionGuard` (heredados del dispatcher).
* Revalidación local del `event_id` del `AIRecommendation` contra `event.owner_id` y `path.eventId` para defensa profunda anti-IDOR.

### Ownership Rules

* Backend como source of truth. Se ejecuta ANTES de cualquier lectura de payload del `AIRecommendation`.

### Role Rules

* Vendor → 403.
* Admin → 403.
* Sin sesión → 401.

### Negative Authorization Scenarios

| Escenario                                          | Resultado                              |
| -------------------------------------------------- | -------------------------------------- |
| Sin sesión                                         | 401                                    |
| Owner del evento sobre AIRecommendation ajena       | 404                                    |
| Vendor                                              | 403                                    |
| Admin                                               | 403                                    |
| UUIDs inválidos                                    | 400 `INVALID_PARAMS` (US-025)          |
| AIRecommendation no `pending`                       | 409 `RECOMMENDATION_NOT_PENDING`       |
| Event `cancelled`/`completed`                       | 409 `EVENT_NOT_EDITABLE`               |
| Categoría inactiva                                  | 409 `CATEGORY_INACTIVE`                |
| Currency mismatch                                   | 409 `CURRENCY_MISMATCH`                |

### Audit Requirements

* No es acción admin; sin `AdminAction`.
* Log estructurado del apply para auditoría.

### Sensitive Data Handling

* No expone PII; montos numéricos auditables.
* `userId` opaco.

---

## 13. Testing Strategy

### Unit Tests

| ID    | Scenario                                                                                       | Layer       |
| ----- | ---------------------------------------------------------------------------------------------- | ----------- |
| UT-01 | Zod `applyBudgetSuggestionBodySchema` con `.strict()` rechaza campos no permitidos              | BE          |
| UT-02 | Zod rechaza `categories[]` vacío                                                                | BE          |
| UT-03 | `edited=false` cuando `editedPayload` omitido                                                   | BE          |
| UT-04 | `edited=true` cuando subset o algún `planned` difiere                                            | BE          |
| UT-05 | `findReplaceable` excluye items `ai_generated=false`                                             | BE          |
| UT-06 | `findReplaceable` excluye items con `ai_recommendation_id === aiRecommendationId` actual         | BE          |
| UT-07 | Handler retorna 409 cuando `recommendation.status='accepted'` o `'discarded'`                    | BE          |
| UT-08 | Handler retorna 409 con `inactive_categories[]` cuando alguna categoría está desactivada         | BE          |
| UT-09 | Handler verifica `currency_code` y retorna 409 si difiere                                        | BE          |
| UT-10 | Handler verifica `event.status` y retorna 409 EVENT_NOT_EDITABLE                                | BE          |
| UT-11-FE | `useApplyBudgetSuggestion` invalida `['event', eventId, 'budget']` tras éxito                | FE          |
| UT-12-FE | `ApplyAIBudgetDialog` deshabilita "Aplicar" cuando 0 filas incluidas                          | FE          |
| UT-13-FE | `CategoryInactiveErrorDialog` renderiza `inactive_categories` y dispara CTAs deeplink         | FE          |

### Integration Tests

| ID    | Scenario                                                                            | Layer       |
| ----- | ----------------------------------------------------------------------------------- | ----------- |
| IT-01 | Apply as-is happy path → 200; status=accepted; items creados; cache invalidable      | BE + DB     |
| IT-02 | Apply parcial editado → solo K items; edited=true                                    | BE + DB     |
| IT-03 | Reemplazo D2: items ai_generated=true previos soft-deleted; manuales preservados     | BE + DB     |
| IT-04 | Atomicidad: fallo simulado a mitad → ROLLBACK; recommendation queda pending          | BE + DB     |
| IT-05 | Recommendation status=accepted → 409 RECOMMENDATION_NOT_PENDING                       | BE + DB     |
| IT-06 | Recommendation ajeno → 404 NOT_FOUND                                                  | BE + DB     |
| IT-07 | Event cancelled/completed → 409 EVENT_NOT_EDITABLE                                    | BE + DB     |
| IT-08 | Categoría desactivada → 409 CATEGORY_INACTIVE con lista                               | BE + DB     |
| IT-09 | Currency mismatch (caso forzado) → 409 CURRENCY_MISMATCH                              | BE + DB     |
| IT-10 | editedPayload.categories vacío → 400 INVALID_VALUE                                    | BE + API    |
| IT-11 | editedPayload con service_category_code no en payload original → 400 INVALID_VALUE    | BE + API    |
| IT-12 | Regresión soft delete: items soft-deleted no aparecen en GET /budget (US-035)         | BE + DB     |

### API Tests

Cubiertos por Integration Tests (Supertest sobre el controller del dispatcher).

### E2E Tests

| ID    | Scenario                                                                                       | Tipo       |
| ----- | ---------------------------------------------------------------------------------------------- | ---------- |
| E2E-01 | Organizer abre dialog, aplica as-is, ve tabla actualizada en US-035                            | Playwright |
| E2E-02 | Organizer edita planned + excluye una fila + aplica → solo subset materializado                | Playwright |
| E2E-03 | Modal de confirmación de reemplazo aparece cuando hay items previos AI                          | Playwright |
| E2E-04 | CATEGORY_INACTIVE: modal de error con CTAs deeplink                                            | Playwright |

### Security Tests

| ID         | Scenario                                  | Expected                              |
| ---------- | ----------------------------------------- | ------------------------------------- |
| SEC-T-01   | Sin sesión                                | 401                                   |
| SEC-T-02   | AIRecommendation ajena                    | 404 NOT_FOUND                         |
| SEC-T-03   | Vendor                                    | 403                                   |
| SEC-T-04   | Admin                                     | 403                                   |
| SEC-T-05   | UUID inválido                              | 400 INVALID_PARAMS                    |

### Accessibility Tests

| ID       | Scenario                                                                                  | Tipo                        |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| A11Y-01  | `ApplyAIBudgetDialog` cumple ARIA + focus trap                                             | jest-axe + @testing-library |
| A11Y-02  | `ReplaceConfirmationDialog` accesible                                                     | jest-axe                    |
| A11Y-03  | `CategoryInactiveErrorDialog` accesible                                                   | jest-axe                    |

### AI Tests

| ID       | Scenario                                                                                  | Expected                          |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------- |
| AI-TS-01 | Items creados con `ai_generated=true` y `ai_recommendation_id` correcto                    | OK                                |
| AI-TS-02 | `AIRecommendation { status='accepted', accepted_at, accepted_by, edited }`                  | OK                                |
| AI-TS-03 | `notes` del payload preservado (BR-AI-011)                                                 | OK                                |
| AI-TS-04 | `edited` correcto según subset/edición                                                     | OK                                |

### Seed / Demo Tests

| ID         | Scenario                                                                                                | Tipo    |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------- |
| SEED-T-01  | Seed contiene al menos un `AIRecommendation { type='budget_suggestion', status='pending' }` operativo    | Vitest  |

### Performance Tests

| ID      | Scenario                                                                                  | Expected               |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------- |
| PERF-01 | Apply con 12 entradas + transacción completa                                               | P95 < 1.5 s            |

### Contract Tests

| ID           | Scenario                                                                | Expected                                |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------- |
| CONTRACT-01  | Request body `editedPayload` y response vs OpenAPI snapshot              | Match exacto (handoff US-098)           |

### CI Checks

* Vitest (unit + integration) verde.
* Playwright (E2E) verde sobre seed.
* Cobertura ≥ 50% en `modules/budget` (consistente con MVP §12.4).
* Lint, typecheck y build sin errores.

---

## 14. Observability & Audit

### Logs

* `budget.ai_suggestion.applied` con los campos del §7.
* Sin PII; montos numéricos auditables.

### Correlation ID

* Heredado del middleware global.

### AdminAction

No aplica.

### Error Tracking

* Errores tipados se loguean con `error_code` y `correlationId`. Errores 5xx con stack truncado.

### Metrics

* Reuso del histogram existente. Sin métricas nuevas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reuso del seed de US-019.
* Recomendado garantizar:
  * Al menos un `AIRecommendation { type='budget_suggestion', status='pending' }` con `payload.categories[]` con 5–8 entradas.
  * Al menos un evento demo con items `ai_generated=true` de una recomendación anterior para demoar el reemplazo (D2).
  * Al menos un evento con `service_category` desactivada para demoar CATEGORY_INACTIVE (opcional; puede mockear en E2E).

### Demo Scenario Supported

* Apply as-is, apply parcial editado, modal de reemplazo, modal CATEGORY_INACTIVE.

### Reset / Isolation Notes

Sin notas adicionales.

---

## 16. Documentation Alignment Required

| Document / Source                          | Conflict                                                                                                          | Current Decision                                                                              | Recommended Action                                                                                                                              | Blocks Implementation? |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `docs/16 §35.3`                             | Catálogo de errores no detalla códigos específicos por `type='budget_suggestion'`.                                | D2/D5/D6 introducen códigos nuevos.                                                            | Actualizar `docs/16 §35.3` con catálogo extendido. Snapshot OpenAPI por US-098. No bloquea.                                                      | No                     |
| `docs/8 §UC-BUDGET-001 §E1`                 | "Categoría inexistente → 400" no cubre categoría desactivada.                                                       | D6 (decision resolution US-037) introduce 409 CATEGORY_INACTIVE.                              | Añadir nota interpretativa o crear ADR. No bloquea.                                                                                             | No                     |
| `docs/4 §BR-BUDGET-008`                     | "Editable antes de guardarse" no detalla shape de edición.                                                          | D3 (decision resolution US-037).                                                              | Nota interpretativa en BR-BUDGET-008 referenciando D3.                                                                                          | No                     |
| `docs/10`                                   | Algunas US usan `NFR-PERF-API-001` (ID inexistente).                                                                | `NFR-PERF-001`. Ya alineado en US-032..036.                                                   | Housekeeping en backlog.                                                                                                                       | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                              | Impact                                          | Mitigation                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Acoplamiento entre `modules/budget` y `modules/ai-recommendations` rompe la hexagonalidad.                          | Dependencias circulares; mantenimiento complejo.| `modules/ai-recommendations` expone `AIRecommendationApplyHandlerPort`; `modules/budget` provee adapter `BudgetSuggestionApplyHandler`. DI cablea sin imports cruzados directos. |
| Acoplamiento con `modules/catalog` para `ServiceCategoryReadPort`.                                                  | Igual al anterior.                              | Mismo patrón port/adapter.                                                                                                                  |
| Rollback parcial si Prisma falla a mitad de createMany.                                                              | Inconsistencia de datos.                        | Toda la lógica en `$transaction`. IT-04 valida rollback.                                                                                    |
| Si admin desactiva categoría justo entre US-019 y US-037, demo se ve interrumpida.                                    | UX confuso en demo.                              | D6 ofrece CTAs claros; seed garantiza ruta feliz; documentación clara en demo runbook.                                                       |
| Concurrencia: dos pestañas aplican la misma recomendación.                                                            | 409 en el segundo apply.                        | Documentado en EC-07 / D4. UX: deshabilitar el botón tras submit; backend retorna 409 idempotente.                                          |
| Performance: `createMany` + `softDeleteMany` + `update` en una transacción puede crecer mal con N grande.            | NFR-PERF-001 incumplido.                        | N ≤ 12 en MVP (categorías canónicas). PERF-01 valida. Postergable índice parcial.                                                          |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / Carpetas probablemente impactadas

**Backend** (`apps/api`):

* `src/modules/budget/dto/edited-payload.body.ts` — **nuevo**.
* `src/modules/budget/dto/apply-budget-suggestion-response.dto.ts` — **nuevo**.
* `src/modules/budget/ports/service-category-read.port.ts` — **nuevo**.
* `src/modules/budget/use-cases/apply-budget-suggestion.use-case.ts` — **nuevo**.
* `src/modules/budget/adapters/budget-suggestion-apply-handler.ts` — **nuevo** (implementa el port de US-025).
* `src/modules/budget/repositories/budget-item-write.repository.ts` — **extender** con `findReplaceable`, `createMany`, `softDeleteMany`.
* `src/modules/ai-recommendations/ports/ai-recommendation-apply-handler.port.ts` — **verificar** (provisto por US-025; agregar entrada para `type='budget_suggestion'` si no existe).
* `src/modules/ai-recommendations/repositories/ai-recommendation.repository.ts` — **extender** con `markAccepted`.
* `src/modules/catalog/adapters/service-category-read.adapter.ts` — **nuevo** (implementa el port de budget).
* `src/shared/logging/budget-ai-events.ts` — **nuevo** (schema `budget.ai_suggestion.applied`).
* `tests/modules/budget/**` — **nuevo** (UT + IT).

**Frontend** (`apps/web`):

* `components/events/budget/ApplyAIBudgetDialog.tsx` — **nuevo**.
* `components/events/budget/ReplaceConfirmationDialog.tsx` — **nuevo**.
* `components/events/budget/CategoryInactiveErrorDialog.tsx` — **nuevo**.
* `hooks/useApplyBudgetSuggestion.ts` — **nuevo**.
* `lib/api/aiRecommendationsApi.ts` — **verificar** (provisto por US-025).
* `messages/{es-LATAM,es-ES,pt,en}.json` — **añadir** claves `budget.apply_ai.*`.
* `tests/components/events/budget/**` — **nuevo**.
* `e2e/budget-apply-ai.spec.ts` — **nuevo**.

**Documentación**:

* `docs/16-API-Design-Specification.md §35.3` — añadir catálogo extendido (DOC, no bloqueante).
* `docs/8-Use-Cases-Specification.md §UC-BUDGET-001 §E1` — nota interpretativa CATEGORY_INACTIVE (DOC).
* `docs/4-Business-Rules-Document.md §BR-BUDGET-008` — nota interpretativa shape `editedPayload` (DOC).

### Orden recomendado de implementación

1. Backend foundations:
   * Zod schemas (`editedPayload` body, response).
   * `ServiceCategoryReadPort` + adapter.
   * Extensión de `BudgetItemWriteRepository`.
   * Extensión de `AIRecommendationRepository` (`markAccepted`).
2. Use case:
   * `ApplyBudgetSuggestionUseCase` con la lógica transaccional D1–D6.
3. Adapter de handler:
   * `BudgetSuggestionApplyHandler` implementa `AIRecommendationApplyHandlerPort` y registra en el DI container.
4. Logger:
   * `budget.ai_suggestion.applied`.
5. Frontend:
   * Hook `useApplyBudgetSuggestion` con invalidación.
   * `ApplyAIBudgetDialog`.
   * `ReplaceConfirmationDialog`.
   * `CategoryInactiveErrorDialog`.
   * Integración con vista de US-035.
   * i18n.
6. Tests por capa: UT → IT (atomicidad/SEC) → A11Y → E2E → PERF → CONTRACT.
7. Documentación (housekeeping al final).

### Decisiones que no deben reabrirse

* D1: reuso del endpoint genérico de US-025; sin ruta nueva.
* D2: soft delete solo de items `ai_generated=true` con `ai_recommendation_id` previo y distinto.
* D3: body shape `editedPayload` con subset implícito = descarte.
* D4: `status='accepted'` único; sin estados nuevos.
* D5: bloqueo en `cancelled`/`completed`.
* D6: rechazo total con 409 `CATEGORY_INACTIVE`.

### Qué NO debe implementarse

* Endpoint nuevo `/budget/apply-ai`.
* Hard delete.
* Invocación al `LLMProvider`.
* Locking optimista para concurrencia.
* Mutación de `ai_generated`.
* Aplicación parcial cuando hay categorías inactivas (D6 rechaza).

### Asunciones a preservar

* US-019 garantiza `payload.currency_code === event.currency_code` y `categories[].service_category_code` referenciando categorías activas al momento de generar. La defensa profunda en US-037 cubre el caso de drift.
* `BudgetItem.ai_recommendation_id` permite reconstruir el historial de cuál recomendación produjo cuáles items.
* US-025 expone `AIRecommendationApplyHandlerPort` con resolución por `type`. Si US-025 estuviera incompleta, el adapter de US-037 debe ser registrado manualmente en un dispatcher mínimo dentro de `modules/budget`.

---

## 19. Task Generation Notes

### Suggested Task Groups

| Grupo | Cantidad estimada | Notas                                                                                                                                                                |
| ----- | :---------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB    | 0                 | Sin migraciones.                                                                                                                                                    |
| BE    | 8                 | DTOs (1), ServiceCategoryReadPort + adapter (1), repository extension (1), AIRecommendationRepository extension (1), use case (1), adapter handler (1), DI wiring (1), AIRecommendationApplyHandlerPort verificación (1). |
| API   | 0                 | Cubierto por BE (reuso del controller de US-025).                                                                                                                    |
| SEC   | 0                 | Reuso íntegro.                                                                                                                                                       |
| OBS   | 1                 | Logger `budget.ai_suggestion.applied`.                                                                                                                              |
| FE    | 6                 | Hook, 3 dialogs, integración con vista de US-035, i18n.                                                                                                              |
| SEED  | 1                 | Garantizar AIRecommendation pending + items previos para reemplazo.                                                                                                  |
| QA    | 7                 | UT, IT (con SEC), PERF, A11Y, CONTRACT, E2E, SEED test.                                                                                                              |
| AI    | 0                 | No aplica (no se invoca LLMProvider).                                                                                                                                |
| OPS   | 0                 | Sin cambios.                                                                                                                                                         |
| DOC   | 3                 | `docs/16 §35.3`, `docs/8 §UC-BUDGET-001 §E1`, `docs/4 §BR-BUDGET-008`.                                                                                                |

**Total estimado**: ~26 tareas.

### Required QA Tasks

* UT de Zod schemas, predicados D2/D5/D6, edited flag.
* IT de happy path, parcial, reemplazo, atomicidad, todos los 409, regresión soft delete en US-035.
* SEC-T anti-IDOR.
* PERF-01.
* A11Y para 3 dialogs.
* CONTRACT-01.
* E2E del ciclo demo.

### Required Security Tasks

Sin tareas dedicadas: reuso íntegro. Pruebas en QA.

### Required Seed / Demo Tasks

* Verificar/garantizar seed con AIRecommendation pending operativo + ruta de reemplazo.

### Required Documentation Tasks

* DOC-01: docs/16 §35.3 (catálogo de errores por type).
* DOC-02: docs/8 §UC-BUDGET-001 §E1 (CATEGORY_INACTIVE).
* DOC-03: docs/4 §BR-BUDGET-008 (shape editedPayload).

### Dependencies Between Tasks

```
DTOs (BE-001) ──┐
ServiceCategoryReadPort + adapter (BE-002) ──┤
Repository extensions (BE-003, BE-004) ──────┼─→ ApplyBudgetSuggestionUseCase (BE-005)
                                              └─→ BudgetSuggestionApplyHandler (BE-006)
BE-006 + DI wiring (BE-007) → API operativo
BE-005 → OBS-001 (logger)
BE-005 → FE-001 (hook)
FE-001 → FE-002..004 (dialogs) → FE-005 (integración) → FE-006 (i18n)
SEED-001 (paralelo) → QA-006 (E2E) / QA-007 (seed test)
BE-001..007 → QA-001..005
DOC-01..03 (paralelos, no bloquean)
```

### Consolidated `tasks.md` para el Backlog Item

Sí, al cerrar US-037 conviene generar `management/development-tasks/P1/PB-P1-021/tasks.md` con el flujo end-to-end del item.

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                               | Pass   |
| Decision Resolution reviewed if present                     | Pass   |
| Scope clear                                                 | Pass   |
| Architecture alignment clear                                | Pass   |
| API impact clear                                            | Pass   |
| DB impact clear                                             | Pass   |
| AI impact clear                                             | Pass (HITL handler) |
| Security impact clear                                       | Pass   |
| Testing strategy clear                                      | Pass   |
| Ready for Development Task Breakdown                        | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-037 entrega un handler implementation-ready para el dispatcher de US-025: una sola `prisma.$transaction` que cubre soft-delete de reemplazables + N inserts + update del `AIRecommendation`. Las 6 decisiones (D1–D6) están materializadas mediante Zod estricto + verificaciones explícitas dentro del use case. El acoplamiento entre `modules/budget`, `modules/ai-recommendations` y `modules/catalog` se preserva hexagonal mediante port/adapter. Sin endpoints nuevos, sin migraciones, sin LLMProvider en runtime. Las 4 Documentation Alignment Required son housekeeping no bloqueante. Próximo paso: `eventflow-user-story-to-development-tasks` consumiendo este archivo.
