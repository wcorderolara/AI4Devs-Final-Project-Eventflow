# 🧾 User Story: Marcar/desmarcar una Quote como `preferred`

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-058                                                                      |
| Backlog Item       | PB-P1-035 — Comparador lado a lado + marca preferred                        |
| Epic               | EPIC-CMP-001                                                                |
| Feature            | Toggle `is_preferred` con unicidad por (event, category) + notif al vendor   |
| Module / Domain    | Quotes / Booking                                                            |
| User Role          | Organizer                                                                   |
| Priority           | Must Have                                                                   |
| Status             | Approved                                                                    |
| Owner              | Product Owner / Business Analyst                                            |
| Sprint / Milestone | MVP                                                                         |
| Created Date       | 2026-06-09                                                                  |
| Last Updated       | 2026-06-28                                                                  |
| Approved By        | PO/BA Review                                                                |
| Approval Date      | 2026-06-28                                                                  |
| Ready for Development Tasks | Yes                                                                 |

---

## 🎯 User Story

**As an** organizador
**I want** marcar (o desmarcar) una Quote como `preferred` con unicidad por (event, category)
**So that** señale mi preferencia al vendor antes del BookingIntent

---

## 🧠 Business Context

### Context Summary

Toggle idempotente del flag `quotes.is_preferred`. Solo una Quote preferred por `(event_id, service_category_id)` (BR-QUOTE-022). Al marcar `true`, cualquier otra Quote previa que estaba como preferred pasa a `false` atómicamente. Vendor target y vendor anterior reciben notificaciones diferenciadas (`quote.marked_preferred` / `quote.unmarked_preferred`) vía `QuoteEventNotificationService` (US-054/056). Cumple FR-QUOTE-012, UC-QUOTE-007, BR-QUOTE-022.

### PO/BA Decisions Applied

| #  | Decisión |
| -- | -------- |
| D1 | `PATCH /api/v1/quotes/:id/preferred` body `{ is_preferred: boolean }`. Idempotente. |
| D2 | `prisma.$transaction`: SELECT FOR UPDATE + clear preferred previa del mismo `(event, category)` + set nueva + notifs. |
| D3 | Permitido sólo cuando `status IN ('sent','responded')` Y no vencida. Otros ⇒ `409 QUOTE_NOT_PREFERABLE`. |
| D4 | Vendor target: 2 notifs `quote.marked_preferred`. Vendor previo: 2 notifs `quote.unmarked_preferred`. Vía service común. |
| D5 | UNIQUE parcial `(event_id, service_category_id) WHERE is_preferred=true`. Denormalizar `event_id`/`service_category_id` en `quotes` (migración menor) para soportar el constraint nativo. |
| D6 | Unmark con `{ is_preferred: false }` permitido; emite `quote.unmarked_preferred`. |
| D7 | `404 QUOTE_NOT_FOUND` uniforme para ajena/inexistente. |

### Dependencies

* US-057 (comparador), US-052 (Quote), US-054/056 (service común), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-QUOTE-012, FR-NOTIF-001 |
| Use Case(s) | UC-QUOTE-007 |
| Business Rule(s) | BR-QUOTE-022, BR-NOTIF-001 |
| Permission Rule(s) | Organizer dueño del evento |
| Data Entity / Entities | Quote, Notification |
| API Endpoint(s) | PATCH /api/v1/quotes/:id/preferred |
| NFR Reference(s) | NFR-OBS-005, NFR-PERF-001 |

---

## 🧭 Scope Guardrails

### In Scope
* Toggle PATCH idempotente.
* Refactor del service común para soportar 2 nuevos eventos.
* Atomicidad transaccional.
* UI button "preferred" con `aria-pressed`.

### Out of Scope
* Multi-preferred.
* Auto-mark cuando se acepta una Quote (vive en US futura de aceptación).

---

## ✅ Acceptance Criteria

### AC-01: Mark preferred (sin previa)
**Given** Quote `sent`/`responded` no vencida, sin otra preferred en (event, category)
**When** `PATCH /quotes/:id/preferred` con `{ is_preferred: true }`
**Then** UPDATE `is_preferred=true`, INSERT 2 notifs al vendor target (`quote.marked_preferred`), `200 OK`.

### AC-02: Mark preferred (cambio de preferida)
**Given** existe Quote A preferred y se marca Quote B
**When** PATCH B con `true`
**Then** transacción: clear A (`false`) + set B (`true`); INSERT 2 notifs a vendor de B (`quote.marked_preferred`) + 2 notifs a vendor de A (`quote.unmarked_preferred`).

### AC-03: Unmark
**Given** Quote preferred
**When** PATCH con `{ is_preferred: false }`
**Then** UPDATE `false`; INSERT 2 notifs al vendor (`quote.unmarked_preferred`); `200 OK`.

### AC-04: Idempotencia
**Given** Quote ya `is_preferred=true`
**When** PATCH con `{ is_preferred: true }`
**Then** no-op; `200 OK` sin notifs nuevas.

---

## ⚠️ Edge Cases

### EC-01: Quote expirada o estado inválido
**Given** Quote `expired`/`rejected`/`accepted`/`draft`
**When** PATCH `true`
**Then** `409 QUOTE_NOT_PREFERABLE` con `details.current_status`.

### EC-02: Quote ajena
`404 QUOTE_NOT_FOUND` uniforme.

### EC-03: UUID malformado
`400 INVALID_UUID`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID | `400 INVALID_UUID` |
| VR-02 | Organizer dueño del evento | `404 QUOTE_NOT_FOUND` |
| VR-03 | `status IN ('sent','responded')` Y no vencida | `409 QUOTE_NOT_PREFERABLE` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión organizer + ownership |
| SEC-02 | `404 QUOTE_NOT_FOUND` uniforme |
| SEC-03 | Service común para notifs |

### Negative Auth
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
| Screen / Route | Comparador (`/organizer/events/:id/quotes/compare`) y detalle de Quote |
| Main UI Pattern | `PreferredToggleButton` (star icon) con `aria-pressed` |
| Primary Action | "Marcar preferred" / "Quitar preferred" |
| Loading State | Spinner en botón |
| Error State | Banner con código i18n |
| Success State | Star llena + toast |
| Accessibility | `aria-pressed`, label dinámico |
| i18n | 4 locales (`organizer.quote.preferred.*`) |

---

## 🛠 Technical Notes

### Frontend
* Components: `PreferredToggleButton`.
* State: TanStack mutation + invalidación.
* API: `quotesApi.preferred(id, isPreferred)`.

### Backend
* Use Case: `MarkQuotePreferredUseCase`.
* Controller / Route: `PATCH /api/v1/quotes/:id/preferred`.
* Authorization: Organizer + ownership.
* Validation: Zod body.
* Transaction Required: Sí.

### Database
* Migración menor: denormalizar `event_id` + `service_category_id` en `quotes` (rellenar desde `quote_requests`) + UNIQUE parcial `(event_id, service_category_id) WHERE is_preferred=true`.

### API
| Method | Endpoint | Purpose |
|---|---|---|
| PATCH | `/api/v1/quotes/:id/preferred` | Toggle preferred |

### Observability
* Correlation ID: Yes
* Log: `quote.preferred.toggled` con `previous_value`, `new_value`, `unmarked_quote_id?`

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Mark sin previa: 2 notifs al target | Integration |
| TS-02 | Mark con previa: 2 notifs target + 2 unmark previa | Integration |
| TS-03 | Unmark: 2 notifs unmark | Integration |
| TS-04 | Idempotencia: PATCH valor actual = no-op | Integration |
| TS-05 | UNIQUE parcial enforced (intento concurrente) | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Quote `expired` | `409 QUOTE_NOT_PREFERABLE` |
| NT-02 | Quote ajena | `404 QUOTE_NOT_FOUND` |
| NT-03 | UUID malformado | `400 INVALID_UUID` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño | 200 |
| AUTH-TS-02 | Ajeno | 404 |
| AUTH-TS-03 | Vendor/Admin | 403 |
| AUTH-TS-04 | Sin sesión | 401 |

### Accessibility
* `aria-pressed` testeado con axe + RTL.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Conversión a Booking |
| Expected Impact | Señal clara al vendor |
| Success Criteria | Funcional + atomicidad |
| Academic Demo Value | Decisión visible + bilateral notif |

---

## 🧩 Task Breakdown Readiness

* FE: PreferredToggleButton + i18n.
* BE: DTO, UseCase, Controller, Logger, refactor service común.
* DB: Migración denormalize + UNIQUE parcial.
* QA: UT, IT, AUTH, A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional + atomicidad.
* [ ] Service común extendido con 2 eventos nuevos.
* [ ] UNIQUE parcial enforced.
* [ ] Tests verdes.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-058-decision-resolution.md`.
