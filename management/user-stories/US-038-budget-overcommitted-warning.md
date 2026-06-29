# 🧾 User Story: Ver warning con delta y badges per-item cuando committed > total

## 🆔 Metadata

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| ID                 | US-038                                             |
| Epic               | EPIC-BUD-001 — Budget Management & Currency        |
| Backlog Item       | PB-P1-022                                          |
| Feature            | Warning de sobrecompromiso (delta + badges)         |
| Module / Domain    | Budget                                             |
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
**I want** ver el delta exacto del sobrecompromiso y saber qué categorías excedieron su `planned`
**So that** identifique rápidamente dónde ajustar (subir presupuesto o reducir compromisos)

---

## 🧠 Business Context

### Context Summary

US-038 **extiende** el contrato server-side ya entregado por US-035 D4 (`summary.over_committed: boolean`) con tres campos diferenciales catalogados por el backlog PB-P1-022 ("UI muestra mensaje claro y delta") y por la `Assumption` original de US-038 ("badge a nivel item"):

1. `summary.overcommitted_amount: number` — monto bruto del exceso a nivel evento.
2. `items[].over_committed: boolean` — bandera per-item.
3. `items[].overcommitted_amount: number` — monto bruto del exceso por fila.

El cálculo se hace en `GetBudgetUseCase` (US-035) con tolerancia adaptativa por `currency.decimal_places` (D3). La UI extiende `BudgetSummary` y `BudgetItemsTable` (US-035) sin duplicar el banner ya entregado. **No se introduce endpoint nuevo**; se reusa `GET /api/v1/events/:eventId/budget`. **No se persiste** ningún flag en BD: el cálculo es derivado en cada request.

### Related Domain Concepts

* `Budget`, `BudgetItem` (read-only desde esta US).
* `Currency` con `decimal_places` (catálogo para calcular `tolerance`).
* Tolerancia adaptativa = `10^(-decimal_places)` (D3).
* Banner accesible heredado de US-035 AC-03.

### Assumptions

* La tolerancia depende de la moneda del evento (USD/EUR/MXN/COP/GTQ ⇒ 0.01; CLP/JPY ⇒ 1).
* El cálculo es server-side único; la UI **NO** recalcula (consistente con US-035 VR-05).
* `summary.over_committed` ya existe (US-035 D4); US-038 enriquece con monto y per-item.
* US-036 (mutaciones CRUD) y US-039 (BookingIntent confirm) son los disparadores de cambios en el estado del warning; ambos invalidan la query key `['event', eventId, 'budget']`.

### Dependencies

* US-035 — productor del summary y banner (entrega `summary.over_committed`).
* US-036 — CRUD de `BudgetItem` que invalida el cache.
* US-039 — sync de `committed` al confirmar `BookingIntent` (puede activar/desactivar el warning).
* PB-P1-022 — backlog item padre.

### PO/BA Decisions Applied

| ID | Decisión                                                                                                                                                                                                                                                                                  | Resolución |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1 | Alcance: extensión incremental                                                                                                                                                                                                                                                            | US-038 extiende el response de US-035 con `summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`. Sin endpoint nuevo; sin migraciones. |
| D2 | CTAs                                                                                                                                                                                                                                                                                       | Banner: CTA único "Editar items" (scroll/focus a la primera fila `over_committed=true`). Badge per-item: solo informativo, `aria-label` localizado con delta. "Ajustar total" ELIMINADO (total es derivado, D1 de US-035). |
| D3 | Tolerancia                                                                                                                                                                                                                                                                                | Adaptativa: `tolerance = 10^(-currency.decimal_places)`. USD/EUR/MXN/COP/GTQ ⇒ 0.01. CLP/JPY ⇒ 1. Aplica al summary e items por igual. Fallback defensivo `decimal_places = 2` si la moneda no está catalogada, con log warning. |
| D4 | Condición badge per-item                                                                                                                                                                                                                                                                  | `item.over_committed = (item.committed - item.planned) > tolerance`. Misma fórmula que el summary. Caso `item.planned = 0 ∧ item.committed > 0` ⇒ badge.                                                          |

Referencia completa: `management/user-stories/decision-resolutions/US-038-decision-resolution.md`.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-BUDGET-004 (cálculo en vivo) · FR-BUDGET-005 (warning visible)                                                                                                                                                                       |
| Use Case(s)            | UC-BUDGET-003 (Ver presupuesto con warning de exceso)                                                                                                                                                                                  |
| Business Rule(s)       | BR-BUDGET-003 (cálculo de totales) · BR-BUDGET-004 (warning sin bloqueo)                                                                                                                                                              |
| Permission Rule(s)     | Ownership (`Event.owner_id = currentUser.id`) · `OrganizerRoleGuard` · `adminExclusionGuard` (heredados de US-035)                                                                                                                     |
| Data Entity / Entities | `Budget` · `BudgetItem` (read-only) · `Currency` (lookup `decimal_places`)                                                                                                                                                              |
| API Endpoint(s)        | `GET /api/v1/events/:eventId/budget` (reuso de US-035; response extendido por US-038)                                                                                                                                                  |
| NFR Reference(s)       | NFR-PERF-001 (P95 < 1.5 s)                                                                                                                                                                                                            |
| Related ADR(s)         | —                                                                                                                                                                                                                                      |
| Related Document(s)    | `/docs/4 §BR-BUDGET-003/004` · `/docs/6 §Budget §BudgetItem §Currency` · `/docs/8 §UC-BUDGET-003` · `/docs/9 §FR-BUDGET-004/005` · `/docs/10 §NFR-PERF-001` · `/docs/16 §M06` · `management/user-stories/US-035-view-edit-budget.md` · US-036 · US-039 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Bloqueo de gastos (`BR-BUDGET-004`: warning sin bloqueo).
* Persistir `over_committed` en BD (es derivado en cada request).
* CTA "Ajustar total" (`total` es derivado per D1 de US-035).
* Endpoint nuevo.
* Conversión FX o multi-moneda (`BR-BUDGET-007`).

### Scope Notes

* Extensión incremental del contrato de US-035; sin breaking changes para clientes existentes (campos nuevos opcionales).
* Cálculo server-side único; la UI consume sin recalcular.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Shape extendido del response

**Given** un organizador autenticado dueño de un evento con `Budget`
**When** consulta `GET /api/v1/events/:eventId/budget`
**Then** el response 200 (heredado de US-035) incluye además:

```json
{
  "summary": {
    "...": "campos existentes de US-035",
    "overcommitted_amount": 1250.00
  },
  "items": [
    {
      "...": "campos existentes de US-035",
      "over_committed": true,
      "overcommitted_amount": 500.00
    }
  ]
}
```

`overcommitted_amount` es siempre `≥ 0`. Cuando no hay exceso (sumario o item), el valor es `0`.

### AC-02: Cálculo con tolerancia adaptativa

**Given** un evento con `currency_code` de `decimal_places = D` (catálogo `Currency`)
**When** se calcula el warning
**Then** el backend usa `tolerance = 10^(-D)`:
- `summary.over_committed = (total_committed - total_planned) > tolerance`.
- `summary.overcommitted_amount = max(0, total_committed - total_planned)` (sin tolerancia en el monto).
- `item.over_committed = (item.committed - item.planned) > tolerance`.
- `item.overcommitted_amount = max(0, item.committed - item.planned)`.

Si `currency_code` no está catalogada ⇒ `decimal_places = 2` por defecto y se loguea warning.

### AC-03: Badge per-item accesible

**Given** un item con `over_committed = true`
**When** el frontend renderiza la fila
**Then** muestra un badge visual con copy localizado y `aria-label="Categoría sobrecomprometida por {overcommitted_amount} {currency_code}"`. El badge NO tiene CTA propio: se complementa con el botón "Editar" existente de la fila (US-036).

### AC-04: CTA "Editar items" en el banner

**Given** un evento con `summary.over_committed = true`
**When** el frontend renderiza el banner (US-035 AC-03)
**Then** muestra un único CTA "Editar items" que, al activarse, hace scroll suave a la tabla y enfoca la primera fila con `over_committed = true`. Si no hay items individuales `over_committed` (caso: suma de tolerancias sin una fila excedida), el CTA hace scroll a la tabla sin focus específico.

### AC-05: Cache invalidation

**Given** una mutación que cambia `planned` o `committed` (US-036 / US-039)
**When** la mutación se completa
**Then** el cache TanStack `['event', eventId, 'budget']` se invalida (responsabilidad heredada de US-036/US-039); en el siguiente refetch, el delta, los badges y el banner reflejan el estado actualizado.

### AC-06: Performance

**Given** un evento con hasta 30 items
**When** se mide el endpoint extendido
**Then** P95 < 1.5 s (`NFR-PERF-001`) sin regresión respecto a US-035 AC-07.

### AC-07: A11Y

**Given** la UI renderizada con badges per-item y delta en el banner
**When** un screen reader o axe revisa la página
**Then** badges tienen `role="img"` o `role="status"` con `aria-label` localizado, contraste ≥ AA, foco programático funcional para el CTA "Editar items".

---

## ⚠️ Edge Cases

### EC-01: Diferencia dentro de tolerancia (redondeo)

**Given** `total_committed - total_planned = 0.005` con `decimal_places = 2`
**When** se evalúa
**Then** `summary.over_committed = false`, `summary.overcommitted_amount = 0.005` (informativo; redondeable a 0 en UI).

### EC-02: Monedas sin decimales (CLP, JPY)

**Given** un evento con `currency_code = 'CLP'` (`decimal_places = 0`)
**When** `total_committed - total_planned = 0.5`
**Then** `tolerance = 1`; `over_committed = false`. Solo se activa cuando la diferencia supera 1 unidad.

### EC-03: Item con `planned = 0` y `committed > 0`

**Given** un item recién creado o IA confirmado sin asignación de `planned` aún
**When** se evalúa
**Then** `item.over_committed = true` (diferencia = `committed > tolerance`); badge visible.

### EC-04: Evento `cancelled` / `completed`

**Given** un evento en estado `cancelled` o `completed`
**When** se consulta el endpoint
**Then** la respuesta es 200 con cálculo real (heredado de US-035 SEC-04 y US-033 D3); la UI muestra banners read-only de cancelación/completado, pero el warning y los badges siguen siendo visibles para auditoría.

### EC-05: Moneda no catalogada (defensivo)

**Given** un evento con `currency_code` sin entrada en catálogo `Currency`
**When** se evalúa la tolerancia
**Then** se asume `decimal_places = 2`, se loguea warning estructurado (`currency.decimal_places.missing`) y el cálculo procede normalmente.

### EC-06: Sin items

**Given** un evento sin `BudgetItem` (consistente con US-035 EC-01)
**When** se evalúa
**Then** `summary.overcommitted_amount = 0`, `items: []`. Sin badges. El banner no se muestra.

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior                                                  |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| VR-01 | Cálculo server-side; UI no recalcula                              | Consume `summary.overcommitted_amount` e `items[].over_committed` server-side (D1) |
| VR-02 | `currency_code` debe existir en catálogo `Currency`               | Fallback defensivo `decimal_places = 2`; log warning (EC-05)        |
| VR-03 | `overcommitted_amount ≥ 0` en summary e items                     | Garantía por construcción (`max(0, ...)`)                            |
| VR-04 | Cambios en `committed`/`planned` invalidan cache TanStack          | Responsabilidad heredada de US-036/US-039                            |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Reuso íntegro de US-035 SEC-01..05: `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`, no-revelación 404, logging sin PII. |

### Negative Authorization Scenarios

Heredados de US-035:
* Sin sesión → 401.
* Organizer A consultando evento de Organizer B → 404.
* Vendor → 403.
* Admin → 403.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | Vista budget (`/[locale]/organizer/events/:eventId/budget`, entregada por US-035).                                 |
| Main UI Pattern     | Banner existente de US-035 enriquecido con delta; badges por fila en `BudgetItemsTable` de US-035.                  |
| Primary Action      | "Editar items" (en el banner; scroll/focus a la primera fila `over_committed`).                                     |
| Secondary Actions   | Botón "Editar" por fila (existente, US-036).                                                                       |
| Empty State         | No aplica.                                                                                                          |
| Loading State       | Heredado de US-035 (skeleton + `aria-busy`).                                                                       |
| Error State         | Heredado de US-035.                                                                                                 |
| Success State       | Banner + badges visibles; delta y `overcommitted_amount` localizados.                                                |
| Accessibility Notes | Badge per-item con `role="img"` o `role="status"` + `aria-label` localizado; contraste AA; foco programático del CTA. |
| Responsive Notes    | Heredados de US-035; badge se mantiene visible en mobile (texto truncable, tooltip accesible).                       |
| i18n Notes          | Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`. Formato CLDR del delta con `Intl.NumberFormat`.                  |
| Currency Notes      | `overcommitted_amount` formateado con `Intl.NumberFormat(locale, { style: 'currency', currency: summary.currency_code })`. |

### Copy localizado (claves nuevas)

* `budget.overcommit.delta_label`: "Excede por {amount}" (banner).
* `budget.overcommit.item_badge`: "Sobrecomprometido" (badge per-item visual).
* `budget.overcommit.item_aria_label`: "Categoría sobrecomprometida por {amount}".
* `budget.overcommit.cta_edit_items`: "Editar items".

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * Reuso de la página de US-035.
* Components:
  * `BudgetSummary` (US-035) — **extender** para renderizar `overcommitted_amount` debajo del banner cuando `over_committed = true`.
  * `BudgetItemsTable` (US-035) — **extender** con badge por fila cuando `item.over_committed = true`.
  * `OvercommitWarning` (US-035) — **extender** con CTA "Editar items" y delta visible.
* State Management:
  * `useEventBudget` (US-035) ya consume los campos extendidos.
  * Invalidación heredada de US-036/US-039.
* Forms:
  * No aplica.
* API Client:
  * Reuso de `budgetApi.get(eventId)` (US-035).

### Backend

* Use Case / Service:
  * `GetBudgetUseCase` (US-035) — **extender** para calcular `tolerance`, `overcommitted_amount` summary, `over_committed` per-item y `overcommitted_amount` per-item.
* Controller / Route:
  * Reuso íntegro de `GET /api/v1/events/:eventId/budget` (US-035).
* Authorization Policy:
  * Reuso íntegro.
* Validation:
  * Reuso íntegro.
* Transaction Required:
  * No (lectura única).

### Database

* Main Tables:
  * `budget` (no cambios).
  * `budget_items` (no cambios).
  * `currencies` (lookup read-only para `decimal_places`).
* Constraints / Indexes:
  * Sin migraciones.
  * Reuso del índice canónico `budget.event_id` unique.
* Seed Impact:
  * Garantizar evento demo con `over_committed = true` y al menos un item con `committed > planned + tolerance`.

### API

| Method | Endpoint                                  | Purpose                                                                                                                |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/events/:eventId/budget`           | Reuso US-035; response extendido con `summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`. |

### Observability / Audit

* Correlation ID Required: Yes (heredado).
* Log Event Required: Sí — extender el log `budget.viewed` (US-035) con `overcommitted_amount` y `over_committed_items_count`. Sin PII.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                  | Type        |
| ----- | ----------------------------------------------------------------------------------------- | ----------- |
| TS-01 | `summary.over_committed = true` ⇒ banner muestra delta                                     | E2E         |
| TS-02 | `item.over_committed = true` ⇒ badge visible en la fila                                    | E2E         |
| TS-03 | Tolerancia boundary: diff = tolerance ⇒ sin warning; diff = tolerance + ε ⇒ con warning    | Unit        |
| TS-04 | `currency_code = 'CLP'` (decimal_places=0) ⇒ tolerance = 1                                  | Unit + Integration |
| TS-05 | `item.planned = 0 ∧ item.committed > 0` ⇒ badge                                            | Integration |
| TS-06 | Cache invalidation tras mutación de US-036 actualiza delta y badges                        | E2E         |
| TS-07 | Evento `cancelled`/`completed` ⇒ 200 con cálculo real + banner read-only                    | Integration |

### Negative Tests

| ID    | Scenario                                                                                  | Expected Result                  |
| ----- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| NT-01 | Diferencia centavos < tolerance                                                            | Sin warning                       |
| NT-02 | `currency_code` no catalogada                                                              | Fallback decimal_places=2 + log warning |

### Authorization Tests

Heredados de US-035 (AUTH-TS-01..05).

### Performance Tests

| ID      | Scenario                                                                          | Expected               |
| ------- | --------------------------------------------------------------------------------- | ---------------------- |
| PERF-01 | Endpoint extendido con 30 items                                                    | P95 < 1.5 s; sin regresión vs US-035 |

### Accessibility Tests

| ID       | Scenario                                                                                  | Expected                                  |
| -------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| A11Y-01  | Badge per-item con `role="img"`/`role="status"` y `aria-label` localizado                  | jest-axe sin violaciones                  |
| A11Y-02  | CTA "Editar items" con foco programático y contraste AA                                     | jest-axe + manual                         |
| A11Y-03  | Delta en el banner con `Intl.NumberFormat` y anuncio `aria-live`                            | jest-axe                                  |

### Contract Tests

| ID           | Scenario                                                                | Expected                                |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------- |
| CONTRACT-01  | Shape extendido vs OpenAPI snapshot                                       | Match exacto (handoff US-098)           |

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Control financiero del organizador; tiempo a detección de overcommit.        |
| Expected Impact     | Alerta granular: identificación rápida de categorías excedidas.              |
| Success Criteria    | Demo end-to-end: crear commitment > planned en una categoría ⇒ badge visible inmediatamente tras refetch. |
| Academic Demo Value | Visualización de regla de negocio con granularidad por categoría.            |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Extensión de `BudgetSummary` con render del delta.
* Extensión de `BudgetItemsTable` con badge per-item accesible.
* Extensión de `OvercommitWarning` con CTA "Editar items" + scroll/focus.
* i18n: claves `budget.overcommit.*` en 4 locales.

### Potential Backend Tasks

* Extensión de `GetBudgetUseCase` con cálculo de `tolerance` desde `Currency.decimal_places` y campos nuevos.
* Lookup `Currency.decimal_places` (Read repository del catálogo).
* Fallback defensivo + log warning.
* Extensión del DTO Zod del response.
* Extensión del log estructurado `budget.viewed`.

### Potential Database Tasks

* Verificación que `currencies.decimal_places` existe; si falta, abrir tarea (no bloqueante).
* Sin migraciones.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* TS, NT, PERF, A11Y, CONTRACT.

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

* [ ] Response extendido (`summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`) operativo.
* [ ] Tests verdes: unit, integration, E2E, perf, a11y, contract.
* [ ] Tolerancia adaptativa por `currency.decimal_places` verificada en USD (0.01) y CLP (1).
* [ ] CTA "Editar items" con scroll/focus operativo en mobile y desktop.
* [ ] i18n verificado en 4 locales con formateo CLDR del delta.
* [ ] A11Y verificada (badge + CTA).
* [ ] Log `budget.viewed` extendido con `overcommitted_amount` y `over_committed_items_count` sin PII.
* [ ] OpenAPI snapshot actualizado por US-098 (handoff).
* [ ] PO valida demo end-to-end (commitment > planned + tolerance ⇒ badge + delta visibles).

---

## 📝 Notes

* US-038 es una **extensión incremental** de US-035; no duplica el banner ni introduce endpoint nuevo.
* Documentation Alignment Required (no bloqueantes): `docs/16 §M06` con shape extendido, nota interpretativa en `BR-BUDGET-004` referenciando D3, verificación de `currencies.decimal_places` en `docs/6` / PB-P0-001, housekeeping `NFR-PERF-001`.
* Handoff transversal: US-035 (productor), US-036 (CRUD invalidación), US-039 (BookingIntent invalidación), US-038 (este enriquecimiento), US-098 (snapshot OpenAPI).
