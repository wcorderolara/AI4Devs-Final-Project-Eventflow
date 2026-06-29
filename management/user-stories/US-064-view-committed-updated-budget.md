# 🧾 User Story: Surface UI del committed actualizado post BookingIntent (dashboard de presupuesto)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-064 |
| Backlog Item | PB-P1-037 — Disclaimer visible + committed sincronizado |
| Epic | EPIC-CMP-001 |
| Feature | `BudgetSummary` con refresh automático + warning visual + aria-live |
| Module / Domain | Budget / Booking |
| User Role | Organizer |
| Priority | Must Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-28 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-28 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As an** organizador dueño del evento
**I want** ver mi `committed` actualizado automáticamente en el dashboard de presupuesto al confirmar/cancelar BookingIntents, con warning visual si excede el `planned`
**So that** mi vista financiera refleje compromisos en vivo sin acción manual y reciba retroalimentación inmediata cuando me excedo del presupuesto

---

## 🧠 Business Context

### Context Summary

US-064 cierra PB-P1-037 + EPIC-CMP-001. NO añade backend nuevo — reusa `GET /api/v1/events/:id/budget` (PB-P1-022/US-035..038) con refactor minimal del mapper para incluir `planned/committed/diff por categoría + totales + flags over_committed`. Trabajo principal: refactor de hooks `useConfirmBooking` (US-061) y `useCancelBooking` (US-062) para invalidar las queries de Budget post-mutation + componente `BudgetSummary` con `aria-live` y warning visual no bloqueante (BR-BUDGET-004).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Reuso de `GET /api/v1/events/:id/budget` existente con refactor del mapper para incluir summary completo. Sin endpoints nuevos ni migraciones. |
| D2 | TanStack invalidation en hooks `useConfirmBooking` y `useCancelBooking` para `['budget', eventId]`, `['budget.summary', eventId]`, `['event.dashboard', eventId]`. |
| D3 | Shape: `{ totals: {planned, committed, available, over_committed}, items: [{category, planned, committed, diff, over_committed, auto_created}], currency_code, last_updated_at }`. |
| D4 | Auto-refresh automático + botón manual "Actualizar presupuesto" (UX safety net). |
| D5 | `aria-live="polite"` con anuncio comparativo "Presupuesto actualizado: {currency_code} {committed} comprometido de {planned} planeado". |
| D6 | Warning visual no bloqueante: banner amarillo en summary + badges "Excedido" por categoría cuando `over_committed` (BR-BUDGET-004). |

### Related Domain Concepts

* `BudgetSummary` Client Component con `aria-live`.
* `budget.over_committed` flag computed.
* Cache invalidation chain Booking ↔ Budget.

### Assumptions

* US-061 entregó el UPDATE atómico de committed (D3 de US-061).
* US-062 entregó el revert atómico (D8 de US-062).
* `GET /events/:id/budget` existe (PB-P1-022/US-035..038).

### Dependencies

* US-061 (confirm), US-062 (cancel), US-035..038 (Budget endpoints), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-BUDGET-004, FR-BUDGET-005 |
| Use Case(s) | UC-BUDGET-004 |
| Business Rule(s) | BR-BUDGET-003, BR-BUDGET-004, BR-BUDGET-005, BR-BOOKING-008 |
| Permission Rule(s) | Organizer dueño del evento |
| Data Entity / Entities | Budget, BudgetItem, BookingIntent |
| API Endpoint(s) | GET /api/v1/events/:id/budget (reuso con refactor de response) |
| NFR Reference(s) | NFR-PERF-001, NFR-A11Y-001 |
| Related Document(s) | /docs/4 §BR-BUDGET-003..005, /docs/8 §UC-BUDGET-004, /docs/9 §FR-BUDGET-004/005 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* WebSocket / push en tiempo real.
* Histórico de cambios del committed.
* Endpoint nuevo (reuso).
* Auto-edición de planned cuando hay exceso.
* Notificaciones por exceso.

### Scope Notes
* Refresh post-acción (no realtime).

---

## ✅ Acceptance Criteria

### AC-01: Auto-refresh tras confirm
**Given** organizer en `/events/:id/budget`, vendor confirma BookingIntent en otra sesión Y organizer ejecuta otra mutation o refresca
**When** ocurre cualquier evento de invalidate
**Then** `BudgetSummary` re-fetcha y muestra `committed` actualizado.

**Given** organizer cancela BookingIntent confirmado vía US-062 en su misma sesión
**When** la mutation termina
**Then** invalidation automática refresca el committed (debería disminuir).

### AC-02: Visualización completa por categoría y totales
**Given** evento con varios BudgetItems
**When** se renderiza `BudgetSummary`
**Then** muestra por categoría `{planned, committed, diff}` + totales globales `{planned, committed, available, over_committed}` + currency_code. Items ordenados por `committed DESC`.

### AC-03: Warning no bloqueante cuando exceso
**Given** `totals.committed > totals.planned`
**When** se renderiza
**Then** banner amarillo `aria-role="alert"` con texto i18n + monto del exceso. Sin bloqueo de UI. Badges "⚠ Excedido" por categoría.

### AC-04: Aria-live polite con anuncio
**Given** cambio de `committed` detectado por `BudgetSummary`
**When** el componente se re-renderiza
**Then** `<div aria-live="polite" aria-atomic="true">` anuncia "Presupuesto actualizado: {currency} {nuevo_committed} comprometido de {planned} planeado".

### AC-05: Botón manual "Actualizar presupuesto"
**Given** organizer en `BudgetSummary`
**When** hace clic en "Actualizar"
**Then** se re-fetcha la query (safety net independiente de mutations).

---

## ⚠️ Edge Cases

### EC-01: Cancel revierte committed
**Given** vendor confirmó hace 5min y organizer cancela
**When** mutation US-062 termina
**Then** invalidate ⇒ refresh ⇒ committed disminuye (`MAX(0, ...)` ya aplicado en backend).

### EC-02: BudgetItem auto-creado en US-061
**Given** vendor confirmó y backend creó automáticamente BudgetItem (D2 de US-061)
**When** organizer refresca
**Then** aparece nuevo item con badge "Auto-creado".

### EC-03: Sin BudgetItems
**Given** evento sin presupuesto configurado
**When** se renderiza
**Then** empty state "Aún no has configurado el presupuesto" + CTA a US-036 (CRUD BudgetItem).

### EC-04: Evento ajeno
**Given** otro organizer
**When** intenta acceder
**Then** `404 EVENT_NOT_FOUND` (heredado del endpoint base).

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` (heredado) |
| VR-02 | Organizer dueño | `404 EVENT_NOT_FOUND` (heredado) |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión organizer (heredado del endpoint) |
| SEC-02 | Ownership del evento |
| SEC-03 | `404 EVENT_NOT_FOUND` uniforme |
| SEC-04 | Solo lectura (sin side-effects) |

### Negative Authorization Scenarios
* Sin sesión → 401; vendor/admin → 403; ajeno → 404.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

* AI Feature: None
* Provider Layer: Not applicable
* AI Input/Output/HITL/Fallback: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/organizer/events/:id/budget` |
| Main UI Pattern | `BudgetSummary` con tarjeta totales + lista por categoría + warning condicional |
| Primary Action | "Actualizar presupuesto" (manual refresh) |
| Secondary Actions | Deep-link a US-036 (CRUD BudgetItem) |
| Empty State | "Aún no has configurado el presupuesto" + CTA |
| Loading State | Skeleton parcial (solo en initial load; updates usan stale-while-revalidate) |
| Error State | Banner con retry |
| Success State | Cifras actualizadas con anuncio aria-live |
| Accessibility | `aria-live="polite"`, `aria-atomic="true"`, banner `aria-role="alert"` |
| Responsive | Mobile-first: lista vertical en mobile, tabla en desktop |
| i18n | 4 locales (`organizer.budget.summary.*`) |
| Currency | Display `currency_code` del evento en cada monto |

---

## 🛠 Technical Notes

### Frontend
* Components: `BudgetSummary` (Client Component), `BudgetSummaryCard` (totales), `BudgetItemRow` (por categoría), `BudgetOverCommittedBanner`.
* State Management: TanStack Query con queryKey `['budget.summary', eventId]`.
* Hooks: extender `useConfirmBooking` (US-061) y `useCancelBooking` (US-062) con invalidaciones.
* API: Reuso `budgetApi.getSummary(eventId)`.

### Backend
* Use Case / Service: `GetBudgetSummaryUseCase` (extender existente o nuevo wrapper).
* Controller / Route: Reuso `GET /api/v1/events/:id/budget` con response shape extendida.
* Authorization: Heredada.
* Validation: Heredada.
* Transaction: No.

### Database
* Tablas: `budgets` (read), `budget_items` (read).
* Indexes: `(budget_id, service_category_id)` ya existe (US-035..038).

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/events/:id/budget` | Reuso con response shape extendida |

#### Response 200 (refactor)
```json
{
  "event_id": "<uuid>",
  "currency_code": "GTQ",
  "totals": {
    "planned": "50000.00",
    "committed": "32000.00",
    "available": "18000.00",
    "over_committed": false
  },
  "items": [
    {
      "id": "<uuid>",
      "service_category_id": "<uuid>",
      "category_name_i18n": {...},
      "planned": "10000.00",
      "committed": "12000.00",
      "diff": "-2000.00",
      "over_committed": true,
      "auto_created": false
    }
  ],
  "last_updated_at": "2026-..."
}
```

### Observability
* Correlation ID: Yes
* Log Event: No (solo log estándar de request)

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Confirm BookingIntent ⇒ refresh automático muestra nuevo committed | E2E |
| TS-02 | Cancel BookingIntent confirmado ⇒ refresh muestra committed disminuido | E2E |
| TS-03 | over_committed ⇒ banner + badges visibles | E2E |
| TS-04 | Botón manual "Actualizar" re-fetcha | E2E |
| TS-05 | Aria-live anuncia cambio | A11Y E2E |
| TS-06 | Empty state cuando sin BudgetItems | Integration |
| TS-07 | Auto-created item del US-061 muestra badge | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Evento ajeno | `404 EVENT_NOT_FOUND` |
| NT-02 | Sin sesión | `401` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño | 200 |
| AUTH-TS-02 | Organizer ajeno | 404 |

### Accessibility
* `aria-live`, `aria-role="alert"` en warning, contraste WCAG AA.

### Performance
* `< 500ms` p95 del endpoint.
* Invalidation < 1s percibido.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Confianza financiera del organizador |
| Expected Impact | Vista financiera en vivo + retroalimentación de exceso |
| Success Criteria | Refresh percibido < 1s + warning visible 100% cuando aplique |
| Academic Demo Value | Integración cross-domain Booking → Budget completa |

---

## 🧩 Task Breakdown Readiness

* FE: `BudgetSummary` + componentes + extensión de hooks de mutation + i18n.
* BE: Refactor mapper del response del endpoint existente + UT.
* QA: Tests E2E + A11Y + regresión US-035..038.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] `BudgetSummary` operativo con auto-refresh tras confirm/cancel.
* [ ] Warning visual no bloqueante cuando over_committed.
* [ ] aria-live anuncia cambios.
* [ ] Botón manual "Actualizar" funcional.
* [ ] Response del endpoint contiene shape completa.
* [ ] Tests E2E + A11Y verdes + regresión US-035..038.
* [ ] i18n 4 locales.

---

## 📝 Notes

* WebSocket / push en tiempo real considerado para futuro post-MVP.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-064-decision-resolution.md`.
