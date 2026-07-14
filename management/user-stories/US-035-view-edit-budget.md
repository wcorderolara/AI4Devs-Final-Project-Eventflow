# 🧾 User Story: Ver mi presupuesto

## 🆔 Metadata

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| ID                 | US-035                                             |
| Epic               | EPIC-BUD-001 — Budget Management & Currency        |
| Backlog Item       | PB-P1-020                                          |
| Feature            | Vista del presupuesto del evento                    |
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
| Last Updated       | 2026-07-14                                         |
| Revision R1        | 2026-07-14 — Alineación con schema real (Opción A). Ver §Notes. |

---

## 🎯 User Story

**As an** organizador
**I want** ver el estado integral de mi presupuesto por categoría
**So that** entienda en un vistazo planned vs committed vs paid y detecte excesos de compromiso

---

## 🧠 Business Context

### Context Summary

US-035 entrega la **vista** de `UC-BUDGET-003 — Ver presupuesto con warning de exceso`. El backend calcula los totales derivados (`BR-BUDGET-003`: `total = SUM(BudgetItem.planned)`, `committed = SUM(BudgetItem.committed)`), normaliza `paid null → 0`, y expone el flag `over_committed` (`BR-BUDGET-004`/`FR-BUDGET-005`). La UI consume el response y muestra resumen + tabla por categoría sin recalcular el flag localmente. Todas las mutaciones (CRUD de `BudgetItem`) se delegan a US-036; la sugerencia IA, a US-037.

### Related Domain Concepts

* `Budget` (1:1 con `Event`), `BudgetItem` (por categoría), `ServiceCategory`.
* Moneda heredada del evento (`BR-BUDGET-006`); inmutable post-creación (`BR-EVENT-007`).
* `committed` se sincroniza vía `BookingIntent` (`BR-BUDGET-005`, US-038/US-039); fuera del alcance de esta US.

### Assumptions

* `paid` permanece nullable en BD (`BR-BUDGET-002`); el backend normaliza a `0` en el response.
* `total_planned` y `total_committed` pueden mantenerse materializados o calcularse en vivo; decisión del Tech Spec, ambas alternativas compatibles con D1.
* La UI NO recalcula `over_committed`; lee el flag server-side.

### Dependencies

* US-009 — creación del evento (provee `event_id` y moneda).
* US-036 — CRUD de BudgetItem (consumidor de los deeplinks de mutación de esta vista).
* US-037 — sugerencia IA de presupuesto (opcional; CTA condicionado por feature flag).
* PB-P1-020 — backlog item padre (Gestión de presupuesto + BudgetItems).
* PB-P1-016 — HITL para aceptar sugerencias IA (upstream de items con `ai_generated=true`).

### PO/BA Decisions Applied

| ID | Decisión                                                                                                                                                                                                                                                                                  | Resolución |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1 | Alcance solo vista                                                                                                                                                                                                                                                                       | US-035 expone únicamente `GET /api/v1/events/:eventId/budget`. No introduce PATCH/POST/DELETE. AC-02 "Editar total" se elimina (viola `BR-BUDGET-003` y `docs/16 §M06`). Mutaciones delegadas a US-036. |
| D2 | CTA "Sugerir IA"                                                                                                                                                                                                                                                                          | Empty State expone deeplink a US-037 (PB-P1-013) condicionado por feature flag `ai.budget-suggestion.enabled`. US-035 NO invoca IA.                                                                  |
| D3 | Columna `paid` opcional                                                                                                                                                                                                                                                                  | Columna `paid` siempre visible. Backend normaliza `null → 0`. `summary.paid_total = SUM(paid)`. Persistencia BD permanece nullable.                                                                  |
| D4 | Flag `over_committed`                                                                                                                                                                                                                                                                      | Calculado server-side en `GetBudgetUseCase`. Expuesto en `summary.over_committed: boolean`. La UI lee sin recalcular.                                                                                  |

Referencia completa: `management/user-stories/decision-resolutions/US-035-decision-resolution.md`.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-BUDGET-001 (1:1) · FR-BUDGET-004 (cálculo en vivo) · FR-BUDGET-005 (warning) · FR-BUDGET-007 (sin conversión FX) · FR-BUDGET-010 (visualización con moneda)                                                                            |
| Use Case(s)            | UC-BUDGET-003 (Ver presupuesto con warning de exceso)                                                                                                                                                                                  |
| Business Rule(s)       | BR-BUDGET-001 · BR-BUDGET-002 · BR-BUDGET-003 · BR-BUDGET-004 · BR-BUDGET-006 · BR-BUDGET-007 · BR-BUDGET-010                                                                                                                            |
| Permission Rule(s)     | Ownership (`Event.owner_id = currentUser.id`) · `OrganizerRoleGuard` · `adminExclusionGuard`                                                                                                                                            |
| Data Entity / Entities | `Budget` · `BudgetItem` · `ServiceCategory` (para `category_name`)                                                                                                                                                                       |
| API Endpoint(s)        | `GET /api/v1/events/:eventId/budget` (única ruta; mutaciones viven en US-036)                                                                                                                                                            |
| NFR Reference(s)       | NFR-PERF-001 (P95 < 1.5 s endpoints no-IA)                                                                                                                                                                                              |
| Related ADR(s)         | —                                                                                                                                                                                                                                      |
| Related Document(s)    | `/docs/4 §BR-BUDGET-001..010` · `/docs/6 §Budget §BudgetItem` · `/docs/8 §UC-BUDGET-003` · `/docs/9 §FR-BUDGET-001..010` · `/docs/10 §NFR-PERF-001` · `/docs/16 §M06` · `management/user-stories/US-036-crud-budget-items.md`                |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* `PATCH /api/v1/events/:eventId/budget` (descartado; viola `BR-BUDGET-003` y `docs/16 §M06`).
* CRUD de BudgetItem (cubierto por US-036).
* Generación IA de presupuesto (US-037).
* Multi-moneda y conversión FX (`BR-BUDGET-007`).
* Cambio de moneda (`BR-BUDGET-006`: inmutable).
* Edición de `paid` (futuro o vía US-036).
* Gráficos avanzados (tendencias, comparativos por sprint).

### Scope Notes

* Solo lectura: una única ruta `GET /api/v1/events/:eventId/budget`.
* La UI expone deeplinks a US-036 (CRUD) y, condicionalmente, a US-037 (sugerencia IA).
* El cálculo de `over_committed` es server-side; la UI no recalcula.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Vista canónica del presupuesto (R1)

**Given** un organizador autenticado dueño de un evento con `Budget` y al menos un `BudgetItem`
**When** consulta `GET /api/v1/events/:eventId/budget`
**Then** recibe un response 200 con `summary` (`total_planned`, `total_committed`, `over_committed`, `currency_code`) y `items[]` con campos `id`, `label`, `category_code` (nullable), `amount_planned`, `amount_committed`. La UI renderiza tabla + resumen, todos los montos formateados con `Intl.NumberFormat(locale, { style: 'currency', currency: summary.currency_code })`.

### AC-02 (eliminada)

> **Eliminada por D1** — "Editar total" contradice `BR-BUDGET-003` y `docs/16 §M06`. Las mutaciones pertenecen a US-036.

### AC-03: Warning visible de exceso

**Given** un evento donde `summary.over_committed = true`
**When** el frontend renderiza la vista
**Then** muestra un banner accesible (`role="alert"` o `aria-live="polite"`) no bloqueante en la sección de resumen con copy localizado (`budget.overcommit_warning`). El warning NO bloquea ninguna interacción (FR-BUDGET-005, AC-BUDGET-001).

### AC-04: Shape canónico del response (R1)

**Given** una respuesta exitosa de `GET /api/v1/events/:eventId/budget`
**When** el cliente lee el payload
**Then** encuentra:

```json
{
  "summary": {
    "total_planned": 12500.00,
    "total_committed": 9800.00,
    "over_committed": false,
    "currency_code": "USD"
  },
  "items": [
    {
      "id": "uuid",
      "label": "Catering",
      "category_code": "catering",
      "amount_planned": 4500.00,
      "amount_committed": 3800.00
    }
  ]
}
```

`category_code` puede ser `null` (schema actual `BudgetItem.categoryCode: String?`). Los totales se leen de `Budget.totalPlanned`/`totalCommitted` (materializados por PB-P0-001). `currency_code` mirror de `Event.currency`.

### AC-05: i18n y currency formatting CLDR

**Given** un cliente que envía `Accept-Language` ∈ `{es-LATAM, es-ES, pt, en}` (default `es-LATAM`)
**When** la UI renderiza summary y tabla
**Then** todas las etiquetas localizables (`budget.label`, `budget.column.planned`, `budget.column.committed`, `budget.column.paid`, `budget.overcommit_warning`, `budget.empty_cta_create`, `budget.empty_cta_ai`) se obtienen del catálogo i18n. Los montos se formatean con `Intl.NumberFormat(locale, { style: 'currency', currency: summary.currency_code })`. No se aplica conversión automática de moneda (`BR-BUDGET-007`).

### AC-06: Independencia del cálculo respecto a `event.status`

**Given** un evento en estado `draft`, `active`, `cancelled` o `completed`
**When** el dueño consulta el endpoint
**Then** el cálculo (`summary`, `items[]`) no se ramifica por estado del evento. La autorización 200/401/403/404 tampoco depende del estado. La UI muestra banners read-only para `cancelled`/`completed` (heredados de US-014/US-015).

### AC-07: Performance

**Given** un evento con 30 `BudgetItem` y registros de seed estándar
**When** se mide el endpoint bajo condiciones normales de demo
**Then** el P95 del response (incluyendo cálculo del `summary`) se mantiene < 1.5 s (`NFR-PERF-001`).

### AC-08: Accesibilidad de tabla y warning

**Given** la vista renderizada
**When** un screen reader o axe revisa la página
**Then** la tabla expone `role="table"`, `<caption>` localizado, encabezados `<th scope="col">`, contraste ≥ AA en el banner de warning y orden de tabulación coherente. Skeleton expone `aria-busy="true"` durante la carga.

---

## ⚠️ Edge Cases

### EC-01: Sin BudgetItems (Empty State)

**Given** un evento con `Budget` pero sin `BudgetItem`
**When** se abre la vista
**Then** se muestra Empty State con dos CTAs: "Crear primera categoría" (deeplink a US-036) y "Sugerir IA" (deeplink a US-037, condicionado por feature flag `ai.budget-suggestion.enabled`). El response devuelve `items: []` con `summary` en ceros y `over_committed: false`.

#### Handling
* Empty state localizado en 4 locales.
* CTAs como `<Link>` (Next.js); sin invocar el endpoint de US-036 desde US-035.

### EC-02: `summary.over_committed = true`

**Given** un presupuesto donde `total_committed > total_planned`
**When** se renderiza la vista
**Then** banner visible y no bloqueante (AC-03); todas las celdas y CTAs permanecen operativos.

### EC-03 (eliminada por R1)

> **Eliminada por R1 (2026-07-14)** — El schema real (`BudgetItem`) no expone la columna `paid`. Esta funcionalidad queda diferida a una US futura P2 que agregará `paid` + `ai_generated` + FK `service_category_id`. Ver §22 de la Tech Spec.

### EC-04: Evento `cancelled`

**Given** un evento `cancelled` con `Budget`
**When** el dueño abre la vista
**Then** respuesta 200 con cálculo real; la UI muestra banner read-only de cancelación (heredado de US-014 EC-01); botones de mutación deshabilitados.

### EC-05: Evento `completed`

**Given** un evento `completed`
**When** el dueño abre la vista
**Then** respuesta 200 con cálculo real; la UI muestra banner "Evento completado"; botones de mutación deshabilitados.

### EC-06: Moneda inmutable

**Given** un evento con `currency_code` definido durante la creación
**When** se renderiza el encabezado
**Then** el `currency_code` se muestra como atributo de solo lectura; ningún componente expone control de edición.

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior                                                  |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| VR-01 | `eventId` debe pertenecer al organizador autenticado              | 403/404 vía `EventOwnershipPolicy` con no-revelación                |
| VR-02 | `eventId` debe ser UUID válido                                    | 400 con esquema Zod del path param                                  |
| VR-03 | Solicitud sin sesión válida                                       | 401                                                                 |
| VR-04 | NO se acepta cambio de moneda en este endpoint                    | Read-only (`BR-BUDGET-006`)                                         |
| VR-05 | UI NO recalcula `over_committed` localmente                       | Consume `summary.over_committed` server-side (D4)                   |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Reuso de `EventOwnershipPolicy` y `OrganizerRoleGuard`. Solo el `owner` accede.                                                       |
| SEC-02 | `adminExclusionGuard`: admin → 403. Admin consume surface auditado (US-016).                                                          |
| SEC-03 | No-revelación 404 ante recurso ajeno.                                                                                                 |
| SEC-04 | El estado del evento NO altera el contrato de autorización (D3 de US-033, consistencia transversal).                                  |
| SEC-05 | Logging estructurado `budget.viewed` sin PII; montos como atributos numéricos sensibles a auditoría (`docs/19 §logging policy`).      |

### Negative Authorization Scenarios

* Sin sesión → 401.
* Organizer A consultando evento de Organizer B → 404 (no-revelación).
* Vendor → 403.
* Admin → 403 (`adminExclusionGuard`).

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

* El CTA "Sugerir IA" del Empty State es un deeplink a US-037; la generación AI-003 y su HITL viven en US-037.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events/:eventId/budget`                                                                       |
| Main UI Pattern     | Card de summary + tabla `BudgetItemsTable` por categoría + banner de warning si `over_committed`.                    |
| Primary Action      | No aplica (visualización). Botones por fila (`Editar`, `Eliminar`) son deeplinks a US-036.                          |
| Secondary Actions   | "Crear primera categoría" (deeplink US-036), "Sugerir IA" (deeplink US-037, condicional por feature flag).          |
| Empty State         | `BudgetItems: []` ⇒ ilustración + copy + dos CTAs (US-036 y, condicional, US-037).                                  |
| Loading State       | Skeleton de summary y tabla con `aria-busy="true"`; visibilidad mínima 300 ms.                                      |
| Error State         | Banner reusable de US-014; las cards no rompen el resto del dashboard.                                              |
| Success State       | Summary + tabla + warning condicional.                                                                              |
| Accessibility Notes | `role="table"`, `<caption>` localizado, `<th scope="col">`, contraste AA del warning, `aria-live="polite"` opcional. |
| Responsive Notes    | Mobile-first; tabla con scroll horizontal en breakpoints angostos.                                                   |
| i18n Notes          | Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`. Currency formatting CLDR.                                       |
| Currency Notes      | Moneda heredada del evento (`summary.currency_code`); inmutable; sin conversión FX (`BR-BUDGET-007`).                |

### UI States por Event Status

* `draft` / `active`: vista completa con CTAs activos.
* `cancelled`: banner read-only de US-014 EC-01; CTAs deshabilitados; datos visibles para auditoría.
* `completed`: banner "Evento completado"; CTAs deshabilitados; datos visibles.

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * `apps/web/app/[locale]/organizer/events/[eventId]/budget/page.tsx`.
* Components:
  * `BudgetView`, `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`, `EmptyBudgetState`.
* State Management:
  * `useEventBudget(eventId)` con TanStack query key `['event', eventId, 'budget']`.
* Forms:
  * No aplica (la edición vive en US-036).
* API Client:
  * `budgetApi.get(eventId)` retorna `{ summary, items[] }`.

### Backend

* Use Case / Service:
  * `GetBudgetUseCase` retorna `{ summary, items[] }`; calcula `over_committed`; normaliza `paid null → 0`.
* Controller / Route:
  * `GET /api/v1/events/:eventId/budget`.
* Authorization Policy:
  * `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard`.
* Validation:
  * UUID de `eventId` (Zod path param).
* Transaction Required:
  * No (lectura).

### Database

* Main Tables:
  * `budget` (1:1 con `events` por `event_id` único), `budget_items` (N:1 con `budget`), `service_categories` (referenciada para `category_name`).
* Constraints:
  * `BR-BUDGET-001` (1:1 evento↔budget).
* Index Considerations:
  * Reuso de índices existentes; ninguna migración nueva.

### API

| Method | Endpoint                              | Purpose                                                                       |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| GET    | `/api/v1/events/:eventId/budget`       | Vista del presupuesto: summary derivado + items por categoría + flag warning.  |

#### Response shape (canónico, R1)

```json
{
  "summary": {
    "total_planned": 12500.00,
    "total_committed": 9800.00,
    "over_committed": false,
    "currency_code": "USD"
  },
  "items": [
    {
      "id": "uuid",
      "label": "Catering",
      "category_code": "catering",
      "amount_planned": 4500.00,
      "amount_committed": 3800.00
    }
  ]
}
```

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Sí — `budget.viewed` con `eventId`, `userId`, `currency_code`, `total_planned`, `total_committed`, `paid_total`, `over_committed`, `items_count`, `correlationId`. Sin PII.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                  | Type        |
| ----- | ----------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Ver budget completo con summary y items                                                   | API         |
| TS-02 | Warning visible cuando `summary.over_committed = true`                                    | Integration |
| TS-03 | Empty state con CTAs (US-036 visible; US-037 condicional por feature flag)                 | E2E         |
| TS-04 | Normalización de `paid null → 0`                                                          | Integration |
| TS-05 | i18n + currency CLDR en `es-LATAM`, `es-ES`, `pt`, `en`                                    | E2E         |
| TS-06 | `cancelled` y `completed` ⇒ 200 con cálculo real y banner read-only                        | Integration |

### Negative Tests

| ID    | Scenario                                                                                  | Expected Result                  |
| ----- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| NT-01 | Intento de PATCH /budget                                                                  | 404 (endpoint no existe)         |
| NT-02 | Recurso ajeno                                                                             | 404 (no-revelación)              |
| NT-03 | Sin sesión                                                                                | 401                              |
| NT-04 | Admin sobre el endpoint                                                                   | 403                              |
| NT-05 | `eventId` no UUID                                                                         | 400                              |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                              | Expected Result |
| ---------- | ------------------------------------- | --------------- |
| AUTH-TS-01 | Owner consulta su evento              | 200             |
| AUTH-TS-02 | Otro organizer consulta evento ajeno  | 404             |
| AUTH-TS-03 | Vendor sobre el endpoint              | 403             |
| AUTH-TS-04 | Admin sobre el endpoint               | 403             |
| AUTH-TS-05 | Solicitud sin sesión                  | 401             |

### Performance Tests

| ID      | Scenario                                                                          | Expected Result               |
| ------- | --------------------------------------------------------------------------------- | ----------------------------- |
| PERF-01 | 30 BudgetItems + cálculo de summary en una sola query                              | P95 < 1.5 s (NFR-PERF-001)    |

### Accessibility Tests

| ID       | Scenario                                                                                  | Expected Result                                  |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A11Y-01  | Tabla expone `role="table"`, `<caption>`, `scope="col"`                                    | `jest-axe` sin violaciones                       |
| A11Y-02  | Banner de warning con `role="alert"` o `aria-live="polite"`                                 | Lectura correcta por screen reader               |
| A11Y-03  | Skeleton con `aria-busy="true"` durante loading                                            | `jest-axe` sin violaciones                       |

### Contract Tests

| ID           | Scenario                                                              | Expected Result                                |
| ------------ | --------------------------------------------------------------------- | ---------------------------------------------- |
| CONTRACT-01  | Shape `{ summary, items[] }` vs OpenAPI snapshot                       | Match exacto (handoff a US-098)                |

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Control de costos del organizador; tiempo a detección de exceso.             |
| Expected Impact     | Visibilidad financiera; reducción de overcommit no detectado en demo.        |
| Success Criteria    | Endpoint cumple P95 < 1.5 s (NFR-PERF-001); cobertura ≥ 50% en TS/NT/PERF/A11Y; demo muestra warning cuando se compromete > planeado. |
| Academic Demo Value | Demo de control financiero end-to-end con warning visible.                   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `BudgetView`, `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`, `EmptyBudgetState`.
* `useEventBudget(eventId)` hook + query key.
* i18n: claves `budget.*` en 4 locales.
* Deeplinks a US-036 (CRUD) y US-037 (sugerencia IA, condicional por feature flag).
* Estados visuales para `cancelled` y `completed`.

### Potential Backend Tasks

* `GetBudgetUseCase` con cálculo de `summary` (`total_planned`, `total_committed`, `paid_total`, `over_committed`).
* Normalización `paid null → 0` en serialización.
* Validación Zod del path param `eventId`.
* Log estructurado `budget.viewed`.

### Potential Database Tasks

* Verificación del plan SQL `EXPLAIN ANALYZE` contra dataset de 30 items.
* Sin migraciones; reuso de schema existente.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests unitarios e integration de cálculo de summary y `over_committed`.
* Tests de autorización (AUTH-TS-01..05).
* Test PERF (PERF-01).
* Tests A11Y (A11Y-01..03).
* Contract test (CONTRACT-01).

### Potential DevOps / Config Tasks

* Feature flag `ai.budget-suggestion.enabled` (reuso del sistema de feature flags existente).

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

* [ ] Funcional: endpoint devuelve `{ summary, items[] }` con `over_committed` server-side y normalización `paid null → 0`.
* [ ] Tests verdes: unit, integration, E2E, perf, a11y y contract.
* [ ] i18n verificado en `es-LATAM`, `es-ES`, `pt`, `en` con currency CLDR.
* [ ] Accesibilidad verificada (`role="table"`, `<caption>`, banner accesible).
* [ ] Query key TanStack `['event', eventId, 'budget']` documentada.
* [ ] Log estructurado `budget.viewed` emitido sin PII.
* [ ] Deeplinks a US-036 (y US-037 si feature flag) verificados.
* [ ] OpenAPI snapshot actualizado por US-098 (handoff).
* [ ] PO valida la demo end-to-end (vista con warning, empty state con CTAs, mutación vía US-036, refresco automático).

---

## 📝 Notes

### Revision R1 — 2026-07-14 (Schema alignment, Opción A)

* **Motivo:** el schema Prisma real entregado por PB-P0-001 (`BudgetItem` con `label`, `categoryCode?`, `amountPlanned`, `amountCommitted` y sin `paid`, `ai_generated`, ni FK `service_category_id`) no permite cumplir el shape original del contrato.
* **Cambios normativos:**
  - AC-01 y AC-04 reescritos con el nuevo shape.
  - EC-03 eliminado (no aplica sin columna `paid`).
  - D3 (normalización `paid null → 0`) **marcada N/A** hasta que exista la columna en BD.
  - `currency_code` mirror de `Event.currency` (enum `CurrencyCode`).
  - Totales leídos directamente de `Budget.totalPlanned` / `Budget.totalCommitted` (materializados).
* **Diferido a P2 (US paralela):** adición de `paid` (nullable), `ai_generated`, FK `service_category_id → ServiceCategory`, backfill y ajuste de US-036 + seed.
* **Aprobación pendiente:** PO/BA debe reconfirmar formalmente antes de merge.
* Ver `management/technical-specs/P1/PB-P1-020/US-035-technical-spec.md §22`.

### Notas originales

* Las políticas para alcance (solo vista), origen server-side de `over_committed`, y CTAs de Empty State están formalizadas en D1/D2/D4 (`management/user-stories/decision-resolutions/US-035-decision-resolution.md`). D3 aplicará cuando exista la columna `paid` (post-R1).
* Documentation Alignment Required (no bloqueantes): actualización de `docs/16 §M06` con shape extendido (`summary`, `over_committed`, `paid_total`); nota interpretativa en `BR-BUDGET-002` referenciando D3; corrección del ID `NFR-PERF-001` en backlog (housekeeping).
* Handoff a US-036: la UI expone deeplinks a CTAs `Editar`/`Eliminar` por fila y `Crear primera categoría` desde Empty State; el cache TanStack `['event', eventId, 'budget']` debe invalidarse desde US-036 tras cada mutación para que esta vista refleje el cambio.
* Currency formatting CLDR vía `Intl.NumberFormat(locale, { style: 'currency', currency: summary.currency_code })`. Sin conversión automática (`BR-BUDGET-007`).
