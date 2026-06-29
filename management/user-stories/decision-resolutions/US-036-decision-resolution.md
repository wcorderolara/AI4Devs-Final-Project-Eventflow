# PO/BA Decision Resolution — US-036

## Source User Story File
management/user-stories/US-036-crud-budget-items.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-036-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-036                                                                                                         |
| User Story file path                         | `management/user-stories/US-036-crud-budget-items.md`                                                          |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-036-refinement-review.md`                                       |
| Existing decision resolution found           | No                                                                                                             |
| Backlog Item                                 | PB-P1-020 — Gestión de presupuesto + BudgetItems                                                              |
| Epic                                         | EPIC-BUD-001 — Budget Management & Currency                                                                    |
| Estado antes de decisiones                   | Needs Refinement                                                                                               |
| Cantidad de preguntas revisadas              | 5 (Q1, Q2, Q3, Q4, Q5)                                                                                         |
| Decisiones PO/BA tomadas                     | 5                                                                                                              |
| Decisiones técnicas recomendadas             | 0 (resueltas con respaldo en BR-BUDGET-002/005/009, BR-BOOKING-003/007/008, UC-BUDGET-002, US-035 D1)           |
| ¿Desbloquea aprobación?                      | Sí                                                                                                             |
| User Story file updated                      | Yes                                                                                                            |
| Decision Resolution artifact created/updated | Yes                                                                                                            |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-036-decision-resolution.md`                                   |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                                            |

---

## 2. Decisiones Respondidas

## Decisión 1 — `committed` no editable en PATCH

### Pregunta original

> ¿Cómo se trata `committed` en el body del PATCH?

### Respuesta PO/BA

`committed` es system-managed: se actualiza exclusivamente al confirmar/cancelar `BookingIntent` (`BR-BUDGET-005`, `BR-BOOKING-008`, `FR-BUDGET-006`). El endpoint PATCH **rechaza con 400** si `committed` viene en el body. El Zod schema del PATCH NO declara `committed` como campo válido.

### Decisión formal

```text
- El schema Zod de PATCH /api/v1/events/:eventId/budget/items/:itemId NO acepta el campo `committed`.
- Si el body incluye `committed`, el endpoint responde 400 `INVALID_FIELD` con detalle "field 'committed' is not editable".
- `committed` se actualiza únicamente por sync con BookingIntent (US-038 confirmación, US-039 cancelación).
```

### Rationale

1. `BR-BUDGET-005`: "El `committed` de un `BudgetItem` debe actualizarse automáticamente al confirmar un `BookingIntent`".
2. `BR-BOOKING-008`: "Al confirmar un BookingIntent, el `committed` del BudgetItem correspondiente debe actualizarse".
3. `FR-BUDGET-006` ratifica la regla.
4. Rechazar explícitamente con 400 es más testeable y previene drift entre el backend y el flujo `BookingIntent`.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D1.                                                                                                       |
| Acceptance Criteria     | AC-02 reescrito; explicitar rechazo de `committed`.                                                                |
| Validation Rules        | Añadir VR-04: `committed` no editable; 400 `INVALID_FIELD`.                                                        |
| Technical Notes         | Zod schema del PATCH excluye `committed`.                                                                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Política exacta de DELETE

### Pregunta original

> Definir política de DELETE: committed > 0, BookingIntent.pending, paid > 0, filtrado de soft-deleted en US-035.

### Respuesta PO/BA

DELETE realiza **soft delete** (`deleted_at = NOW()`, `deleted_by = currentUser.id`). Se bloquea en tres escenarios para preservar integridad financiera y referencial. Los items soft-deleted **se filtran** del listado y de los totales de US-035.

### Decisión formal

```text
Política de DELETE /api/v1/events/:eventId/budget/items/:itemId:

1. Bloqueo por `committed > 0`:
   - Status 409 `ITEM_HAS_COMMITMENT`.
   - Mensaje: "Existe un compromiso financiero vinculado al BookingIntent confirmado. Cancela el BookingIntent antes de eliminar el item."

2. Bloqueo por `BookingIntent` en estado `pending` apuntando a la categoría del item dentro del mismo evento:
   - Status 409 `ITEM_HAS_PENDING_INTENT`.
   - Mensaje: "Existe una intención de booking en curso. Cancela el BookingIntent antes de eliminar el item."
   - La verificación es scoped a `(event_id, service_category_id)` consistente con BR-BOOKING-007.

3. Bloqueo por `paid > 0`:
   - Status 409 `ITEM_HAS_PAID_AMOUNT`.
   - Mensaje: "El item registra un monto pagado; no puede eliminarse para preservar auditoría."

4. Caso exitoso:
   - Soft delete: `deleted_at = NOW()`, `deleted_by = currentUser.id`.
   - Status 204 No Content.
   - El item con `deleted_at IS NOT NULL` se EXCLUYE del listado y de los agregados (`summary.total_planned`, `summary.total_committed`, `summary.paid_total`, `summary.over_committed`) en US-035.

5. Hard delete:
   - NO se expone en MVP.
   - Posible mantenimiento técnico futuro (consistente con BR-PRIVACY-011 para attachments).
```

### Rationale

1. **Integridad referencial**: items soft-deleted preservan trazabilidad con `BookingIntent`/`Quote` históricos.
2. **MVP-first conservador**: bloquear `BookingIntent.pending` evita orphan intents que podrían confirmarse después y referenciar un item inexistente.
3. **Auditoría**: bloquear con `paid > 0` previene pérdida de evidencia financiera (alineado con principio "Academic evidence must remain traceable").
4. **Consistencia con tareas**: US-033 (D3) ya filtra tareas soft-deleted; aplicamos el mismo patrón a budget items.
5. **Patrón soft delete**: alineado con `BR-PRIVACY-011` (attachments), `BR-REVIEW-005` (reviews), `BR-EVENTTYPE-007` (event types).

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PO/BA Decisions Applied | Agregar D2.                                                                                                                                                                                       |
| Acceptance Criteria     | AC-03 reescrito; añadir AC-04, AC-05 para `pending` y `paid > 0`.                                                                                                                                |
| Edge Cases              | EC-01 reescrito; añadir EC-02 (pending intent), EC-03 (paid > 0), EC-04 (filtrado en US-035).                                                                                                     |
| Validation Rules        | Añadir VR-09: `itemId` no soft-deleted al hacer PATCH/DELETE (las operaciones sobre items ya eliminados devuelven 404).                                                                            |
| Technical Notes         | Repositorio agrega `deleted_at` y `deleted_by`; consultas a US-035 filtran `deleted_at IS NULL`; uso case verifica `committed > 0`, `BookingIntent pending` (cross-module query), `paid > 0`.       |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional. El cross-module query a `BookingIntent` debe documentarse en el Technical Spec para mantener acoplamiento controlado entre `modules/budget` y `modules/booking`.

---

## Decisión 3 — Bloqueo de mutaciones en `cancelled` y `completed`

### Pregunta original

> ¿Las mutaciones se permiten o se bloquean en eventos `completed`?

### Respuesta PO/BA

Las mutaciones POST/PATCH/DELETE **se bloquean** en eventos `cancelled` (alineado con `UC-BUDGET-002 §E2`) y también en eventos `completed` (extensión por consistencia con US-014/US-015 read-only). El endpoint responde 409 `EVENT_NOT_EDITABLE` con detalle del estado.

### Decisión formal

```text
Las mutaciones POST/PATCH/DELETE sobre /api/v1/events/:eventId/budget/items[/itemId] están permitidas solo cuando `event.status ∈ {'draft', 'active'}`.

- event.status = 'cancelled' ⇒ 409 `EVENT_NOT_EDITABLE` con detail "Event is cancelled".
- event.status = 'completed' ⇒ 409 `EVENT_NOT_EDITABLE` con detail "Event is completed".
- event.status = 'draft' ⇒ permitido.
- event.status = 'active' ⇒ permitido.

La verificación ocurre en el use case tras `EventOwnershipPolicy.assertOwner`.

El endpoint GET de US-035 sigue devolviendo 200 con cálculo real (D3 de US-035; no se ramifica por estado).
```

### Rationale

1. `UC-BUDGET-002 §E2`: bloquea `cancelled`.
2. US-014 EC-01 (cancelled read-only) y US-015 (completed read-only) establecen la convención transversal.
3. Aplicar el mismo bloqueo en `completed` previene mutaciones post-cierre y mantiene la trazabilidad académica.
4. MVP-first: una sola regla (`status ∈ {'draft','active'}`) en lugar de matrices complejas.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D3.                                                                                                       |
| Acceptance Criteria     | Añadir AC-06: bloqueo en `cancelled` y `completed`.                                                                |
| Edge Cases              | Añadir EC-05 (cancelled), EC-06 (completed).                                                                       |
| Validation Rules        | Añadir VR-10: `event.status ∈ {'draft','active'}` para POST/PATCH/DELETE.                                          |
| Security & Authorization | Añadir SEC-06: el estado del evento es checked en el use case, no en el guard (la autorización sigue siendo por ownership/rol). |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional. Documentation Alignment Required: extender `UC-BUDGET-002 §E2` para incluir `completed`.

---

## Decisión 4 — Regla `paid ≤ committed` eliminada en MVP

### Pregunta original

> ¿Se mantiene la regla cruzada `paid ≤ committed` de VR-02?

### Respuesta PO/BA

Se **elimina** la regla cruzada en MVP. La única regla dura sobre `paid` es `paid ≥ 0`. La UI puede mostrar warning advisory si `paid > committed` o si `paid > planned`, alineado con el patrón de warning de `over_committed` en US-035, pero el backend NO rechaza la mutación por esta condición.

### Decisión formal

```text
- VR-02 (original) eliminada.
- Nueva VR-02: `planned ≥ 0`.
- Nueva VR-02b: `paid ≥ 0` (sin cross-constraint con `committed`/`planned`).
- La UI MAY mostrar warnings advisory:
  - "Paid mayor que committed" cuando `paid > committed`.
  - "Paid mayor que planned" cuando `paid > planned`.
  Ambos warnings son no bloqueantes y se pintan client-side en la fila de la tabla; NO afectan el backend ni el response.
```

### Rationale

1. No existe BR explícita que respalde `paid ≤ committed`. La regla original VR-02 era una asunción técnica no documentada.
2. Casos reales: pagos anticipados (`paid > 0` con `committed = 0`) o ajustes contables fuera del flujo BookingIntent.
3. MVP-first: minimizar reglas que requieren mantenimiento manual.
4. Auditabilidad: dejar que el frontend muestre warnings advisory mantiene la consistencia con el patrón `over_committed` de US-035 sin sobre-restringir el dominio.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D4.                                                                                                       |
| Validation Rules        | Reescribir VR-02 sin cross-constraint.                                                                            |
| UX / UI Notes           | Añadir nota: warnings advisory en la tabla cuando `paid > committed` o `paid > planned`.                          |
| Test Scenarios          | Añadir TS para `paid > committed` aceptado por backend + warning visible en UI.                                   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Editabilidad de `service_category_id` y múltiples items por categoría

### Pregunta original

> ¿`service_category_id` es editable? ¿Múltiples items por categoría permitidos?

### Respuesta PO/BA

**`service_category_id` es editable solo si `committed = 0`**. Cuando `committed > 0`, la categoría queda anclada para evitar drift con `BookingIntent.confirmed_intent` que referencia la categoría original. **Múltiples items por categoría son permitidos** (alineado con domain model 1:N y `BR-BUDGET-009` edición libre).

### Decisión formal

```text
1. PATCH puede modificar `service_category_id`:
   - Permitido cuando `committed = 0`.
   - Rechazado con 409 `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED` cuando `committed > 0`.
   - Cuando se cambia la categoría, `ai_generated` se preserva (no se reinicia).

2. Múltiples BudgetItem por (event, service_category_id) están permitidos.
   - No hay constraint de unicidad por categoría en la BD.
   - El usuario puede crear varios items con la misma categoría (ej. "Catering principal" y "Catering postres").
   - La UI puede usar el campo opcional `label` para distinguirlos visualmente.

3. La validación `service_category_id` existe y está activa (VR-03) se mantiene.
```

### Rationale

1. **`BR-BUDGET-009`**: "Edición libre" sugiere PATCH liberal; sin embargo, cambiar categoría con `committed > 0` rompería la referencia del BookingIntent.
2. **`BR-BOOKING-007`**: "Solo puede existir un BookingIntent confirmado por (evento, categoría)". Cambiar la categoría de un item con commitment podría dejar el BookingIntent huérfano.
3. **Domain model**: `BudgetItem.budget_id → Budget` y `BudgetItem.service_category_id → ServiceCategory`. No hay unique constraint por (`budget_id`, `service_category_id`), permitiendo múltiples items.
4. **MVP-first**: la regla "cambiar solo si committed = 0" es simple y testeable.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D5.                                                                                                       |
| Acceptance Criteria     | Reescribir AC-02 con campos permitidos incluyendo `service_category_id?` condicional a `committed = 0`.            |
| Edge Cases              | Añadir EC-07: cambio de categoría con `committed > 0` ⇒ 409.                                                       |
| Validation Rules        | Añadir VR-05: `service_category_id` editable solo si `committed = 0`.                                              |
| Business Context        | Aclarar `Assumptions`: múltiples items por categoría permitidos; uso opcional de `label` para distinguir.          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                          | Decisión                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | `committed` en PATCH                          | Rechazo 400 `INVALID_FIELD`. Zod schema NO declara `committed`.                                                                                    | Tech+PO | Sí                     | No                   |
|  2 | Política de DELETE                            | Soft delete con bloqueo por `committed > 0` (409 ITEM_HAS_COMMITMENT), `BookingIntent.pending` (409 ITEM_HAS_PENDING_INTENT), `paid > 0` (409 ITEM_HAS_PAID_AMOUNT). Items soft-deleted filtrados de US-035. | PO | Sí | No |
|  3 | Bloqueo en `completed`                        | Mutaciones bloqueadas en `cancelled` y `completed` con 409 EVENT_NOT_EDITABLE.                                                                     | PO      | Sí                     | Doc Alignment        |
|  4 | Regla `paid ≤ committed`                      | Eliminada en MVP. Solo `paid ≥ 0`. UI muestra warnings advisory client-side.                                                                       | PO      | Sí                     | No                   |
|  5 | `service_category_id` editable + multi-items   | Editable solo si `committed = 0` (409 CATEGORY_LOCKED si committed > 0). Múltiples items por categoría permitidos.                                  | PO      | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Status` → `Ready for Approval`.
- `Last Updated` → `2026-06-27`.
- Añadir `Backlog Item: PB-P1-020`.
- Título refinado: "Crear, editar y eliminar BudgetItem por categoría".

### Business Context
- `Context Summary` reformulado con CRUD libre (BR-BUDGET-009), committed system-managed (BR-BUDGET-005), soft delete con filtrado en US-035.
- `Assumptions`: `paid` opcional normalizado a 0 en US-035; `ai_generated = false` en POST; preservado en PATCH; múltiples items por categoría permitidos.
- `Dependencies`: añadir US-035 (consumidor cache), PB-P1-020, US-038/US-039 (sync committed).

### PO/BA Decisions Applied
- Sección nueva con D1–D5 formalizadas.

### Traceability
- `FRD Requirement(s)`: FR-BUDGET-001, FR-BUDGET-003, FR-BUDGET-007, FR-BUDGET-008.
- `Use Case(s)`: UC-BUDGET-002.
- `Business Rule(s)`: BR-BUDGET-002, BR-BUDGET-005, BR-BUDGET-007, BR-BUDGET-009, BR-AI-008, BR-BOOKING-007.
- `Permission Rule(s)`: Ownership + OrganizerRoleGuard + adminExclusionGuard.
- `Data Entity / Entities`: BudgetItem, Budget, ServiceCategory, BookingIntent (cross-module check).
- `API Endpoint(s)`: POST/PATCH/DELETE /api/v1/events/:eventId/budget/items[/:itemId].
- `NFR Reference(s)`: NFR-PERF-001.
- `Related Document(s)`: docs/4 §BR-BUDGET-* §BR-BOOKING-007, docs/6 §BudgetItem, docs/8 §UC-BUDGET-002, docs/9 §FR-BUDGET-*, docs/10 §NFR-PERF-001, docs/16 §M06, US-035.

### Scope Guardrails
- `Explicitly Out of Scope`: bulk/batch updates (Future), edición de `committed`, hard delete, captura de pago, workflow de aprobación interna.

### Acceptance Criteria
- AC-01 reescrito: POST con shape, `ai_generated=false`, normalización `paid`, 201 + invalidación de cache.
- AC-02 reescrito: PATCH con campos `planned`, `paid`, `service_category_id?`, `label?`. Rechazo de `committed` (400). `ai_generated` preservado.
- AC-03 reescrito: soft delete, 204, filtrado en US-035.
- AC-04 nuevo: bloqueo DELETE con `committed > 0` (409 ITEM_HAS_COMMITMENT).
- AC-05 nuevo: bloqueo DELETE con `BookingIntent.pending` (409 ITEM_HAS_PENDING_INTENT) y con `paid > 0` (409 ITEM_HAS_PAID_AMOUNT).
- AC-06 nuevo: bloqueo en `cancelled` y `completed` (409 EVENT_NOT_EDITABLE).
- AC-07 nuevo: PATCH de `service_category_id` solo si `committed = 0`; warning advisory en UI cuando `paid > committed`.
- AC-08 nuevo: invalidación TanStack `['event', eventId, 'budget']`.
- AC-09 nuevo: A11Y inline edit con anuncios de errores.
- AC-10 nuevo: P95 < 1.5 s (NFR-PERF-001).

### Edge Cases
- EC-01 reescrito (committed > 0).
- EC-02 nuevo: BookingIntent.pending.
- EC-03 nuevo: paid > 0 con committed = 0 (DELETE bloqueado).
- EC-04 nuevo: items soft-deleted filtrados en US-035.
- EC-05 nuevo: event `cancelled` ⇒ 409.
- EC-06 nuevo: event `completed` ⇒ 409.
- EC-07 nuevo: cambio de categoría con committed > 0 ⇒ 409.
- EC-08 nuevo: dos pestañas editando el mismo item (concurrencia: última escritura gana; documentar).

### Validation Rules
- VR-01 `planned ≥ 0`.
- VR-02 `paid ≥ 0` (sin cross-constraint).
- VR-03 categoría existente y activa.
- VR-04 `committed` no editable (D1).
- VR-05 `service_category_id` editable solo si `committed = 0` (D5).
- VR-06 `eventId` y `itemId` UUID válidos.
- VR-07 `itemId` pertenece al budget del `eventId` (anti-IDOR).
- VR-08 sin sesión → 401.
- VR-09 operaciones sobre items soft-deleted ⇒ 404.
- VR-10 `event.status ∈ {'draft','active'}` para POST/PATCH/DELETE (D3).

### Authorization & Security Rules
- SEC-01 EventOwnershipPolicy + OrganizerRoleGuard.
- SEC-02 adminExclusionGuard.
- SEC-03 no-revelación 404.
- SEC-04 itemId cross-event check (anti-IDOR).
- SEC-05 logging sin PII.
- SEC-06 estado del evento checked en use case (no en guard).

### Technical Notes
- Backend: `CreateBudgetItemUseCase`, `UpdateBudgetItemUseCase`, `DeleteBudgetItemUseCase` con `BudgetItemRepository`. Cross-module check de `BookingIntent.pending` por (event_id, service_category_id) consistente con BR-BOOKING-007. Zod schemas para body de POST/PATCH (sin `committed`).
- Frontend: integración con `BudgetItemsTable` de US-035 (RHF + Zod inline edit); modal de confirmación para DELETE con copy de error localizado. Cache invalidation tras cada mutación.
- API: paths bajo `/budget/items/*` (docs/16 §M06).
- Observability: logs estructurados `budget.item.created`, `budget.item.updated`, `budget.item.deleted` con `eventId`, `userId`, `itemId`, `service_category_id`, `event_code` cuando aplica, `correlationId`. Sin PII.

### Test Scenarios
- Functional: TS-01 CRUD básico, TS-02 DELETE bloqueado por committed>0, TS-03 cache invalidation, TS-04 ai_generated preservado, TS-05 multi-items por categoría, TS-06 paid > committed aceptado (D4).
- Negative: NT-01..NT-10 (planned negativo, categoría inexistente, ajeno, no-auth, admin, committed editable rechazado, cancelled, completed, pending intent, paid > 0 al DELETE).
- AUTH-TS-01..05.
- PERF-01.
- A11Y-01..03.
- CONTRACT-01.

### Definition of Ready
- Marcar `[x] PO/BA validó`.

### Definition of Done
- Añadir: cache invalidation verificada, contract test verde, logs emitidos, A11Y verificada, snapshot OpenAPI (US-098 handoff), políticas de bloqueo (committed/pending/paid/event status) testadas.

### Notes
- Reemplazar "bulk update" por nota Out of Scope (Future).
- Agregar handoff a US-035 (invalida `['event', eventId, 'budget']`).

---

## 5. Documentation Alignment Required

| Documento / Fuente                          | Conflicto detectado                                                                                          | Decisión vigente                                                                              | Acción recomendada                                                                                              | ¿Bloquea aprobación? |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/8 §UC-BUDGET-002 §E2`                  | E2 solo bloquea `cancelled`; D3 extiende a `completed`.                                                       | D3 (este artefacto).                                                                          | Añadir nota interpretativa o crear ADR. No bloquea.                                                              | No                   |
| `docs/16 §M06 Budget` (Items)                | Falta documentar request/response shapes y catálogo de errores (`ITEM_HAS_COMMITMENT`, `ITEM_HAS_PENDING_INTENT`, `ITEM_HAS_PAID_AMOUNT`, `EVENT_NOT_EDITABLE`, `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED`, `INVALID_FIELD`). | D1, D2, D3, D5.                                                                              | Actualizar `docs/16 §M06` y `§error format`. Snapshot OpenAPI por US-098. No bloquea.                            | No                   |
| `docs/10-Non-Functional-Requirements.md`     | Algunas US usan `NFR-PERF-API-001` (ID inexistente).                                                          | `NFR-PERF-001`.                                                                                | Housekeeping en backlog. Ya alineado en US-032/033/035.                                                          | No                   |
| `docs/4 §BR-BUDGET-002`                      | "`paid` opcional MVP" sin precisar tratamiento; US-035 D3 normaliza null→0 en serialización.                  | US-035 D3.                                                                                    | Ya cubierto por la tarea DOC de US-035.                                                                          | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                         |
| User Story file path                         | `management/user-stories/US-036-crud-budget-items.md`                                       |
| Decision Resolution artifact created/updated | Yes                                                                                         |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-036-decision-resolution.md`                |
| New User Story status                        | Ready for Approval                                                                          |
| Remaining blockers                           | No                                                                                          |
| Reason                                       | 5/5 decisiones bloqueantes (Q1–Q5) resueltas con respaldo en BR-BUDGET-002/005/009, BR-BOOKING-003/007/008, UC-BUDGET-002 y docs/16. 4 Documentation Alignment Required no bloqueantes. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`

Las 5 decisiones están formalizadas, consistentes con `BR-BUDGET-002/005/009`, `BR-BOOKING-007/008`, `UC-BUDGET-002` y D1 de US-035. La US queda actualizada en sitio con AC, EC, VR y SEC ampliados.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo actualizado management/user-stories/US-036-crud-budget-items.md.
2. Ejecutar `eventflow-user-story-refinement` para revalidación opcional.
3. Ejecutar `eventflow-user-story-approval`.
4. Tras aprobación, ejecutar `eventflow-user-story-technical-spec` y `eventflow-user-story-to-development-tasks`.
```

---

User Story file updated: Yes
Path: management/user-stories/US-036-crud-budget-items.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-036-decision-resolution.md
Next step: Run `eventflow-user-story-approval` or run `eventflow-user-story-refinement` again if a second validation pass is desired.
