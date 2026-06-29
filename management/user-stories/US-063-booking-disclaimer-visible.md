# 🧾 User Story: Disclaimer visible y aceptado al crear/confirmar BookingIntent (componente compartido + audit)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-063 |
| Backlog Item | PB-P1-037 — Disclaimer visible + committed sincronizado |
| Epic | EPIC-CMP-001 |
| Feature | `BookingDisclaimer` componente compartido + audit fields + enforcement bilateral server-side |
| Module / Domain | Booking / Compliance |
| User Role | Organizer / Vendor |
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

**As a** usuario (organizer o vendor) que crea o confirma un BookingIntent
**I want** ver un disclaimer claro y aceptarlo explícitamente con checkbox + enforcement server-side bilateral
**So that** EventFlow tenga trazabilidad legal de que ambas partes entendieron que el acuerdo final ocurre fuera de la plataforma sin penalización (Decisión PO 8.1 #5 + FR-BOOKING-006)

---

## 🧠 Business Context

### Context Summary

US-063 es 1 de 2 en PB-P1-037. Consolida el disclaimer del flujo BookingIntent:
1. Introduce `BookingDisclaimer` componente compartido reusable en US-060 y US-061.
2. Refactoriza US-061 D8 para añadir enforcement server-side (paridad con US-060).
3. Persiste audit fields en `booking_intents`: `disclaimer_accepted_at_create/confirm` + `disclaimer_copy_version_create/confirm`.
4. Estandariza copy v1 en 4 locales.
5. Log estructurado `disclaimer.accepted` por cada aceptación.

US-064 cerrará PB-P1-037 con la visibilidad del committed en dashboard.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Enforcement server-side bilateral. Refactor US-061 D8: el body de confirm pasa a requerir `disclaimer_accepted: true`. |
| D2 | Persistencia: 2 columnas timestamp + 2 columnas version (`disclaimer_accepted_at_create/confirm`, `disclaimer_copy_version_create/confirm`). Migración menor con backfill. |
| D3 | Copy v1 en 4 locales: "El acuerdo final, el pago y cualquier contrato ocurren fuera de EventFlow. La plataforma no procesa pagos ni cobra penalizaciones. Al continuar, confirmas que entiendes y aceptas estas condiciones." |
| D4 | `BookingDisclaimer` Client Component compartido con `mode='create'|'confirm'`. Reusable en US-060/US-061. |
| D5 | Log `disclaimer.accepted` con `userId, bookingIntentId, action, agreementCopyVersion, acceptedAt`. |
| D6 | Sin disclaimer en cancel (US-062). |
| D7 | Constante `BOOKING_DISCLAIMER_COPY_VERSION = 'v1'`. Versionado para auditoría futura. |

### Related Domain Concepts

* `booking_intents.disclaimer_accepted_at_create/confirm`, `disclaimer_copy_version_create/confirm`.
* `BookingDisclaimer` shared Client Component.
* Audit log `disclaimer.accepted`.

### Assumptions

* US-060 y US-061 entregados (esta US refactoriza ambos).
* PB-P0-001 schema base existe.

### Dependencies

* US-060 (create), US-061 (confirm), US-062 (cancel — sin disclaimer per D6), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-BOOKING-006, FR-BOOKING-007 |
| Use Case(s) | UC-BOOKING-001, UC-BOOKING-002 |
| Business Rule(s) | BR-BOOKING-006, BR-BOOKING-009 |
| Permission Rule(s) | Cross-role (organizer + vendor target) |
| Data Entity / Entities | BookingIntent |
| API Endpoint(s) | Embedded en US-060 `POST /organizer/booking-intents` + US-061 `POST /vendor/booking-intents/:id/confirm` |
| NFR Reference(s) | NFR-OBS-005 |
| Related Document(s) | /docs/3, /docs/9 §FR-BOOKING-006/007, /docs/4 §BR-BOOKING-006/009 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Contratos digitales firmados.
* Versionado dinámico del copy (sólo v1 en MVP).
* Disclaimer en cancel.
* Workflow de revocación de aceptación.

### Scope Notes
* Sólo texto + checkbox + audit.

---

## ✅ Acceptance Criteria

### AC-01: Disclaimer en create + audit
**Given** organizer abre `CreateBookingDialog` (US-060)
**When** ve el modal
**Then** el `BookingDisclaimer mode='create'` se renderiza con texto v1 + checkbox + label. CTA "Crear" deshabilitado hasta marcar checkbox. Al confirmar, body incluye `disclaimer_accepted: true`. Backend persiste `disclaimer_accepted_at_create=NOW(), disclaimer_copy_version_create='v1'` + emite log `disclaimer.accepted action=create`.

### AC-02: Disclaimer en confirm + audit (refactor US-061)
**Given** vendor abre `ConfirmBookingDialog` (US-061)
**When** ve el modal
**Then** el `BookingDisclaimer mode='confirm'` se renderiza. CTA "Confirmar" deshabilitado hasta marcar checkbox. Backend pasa a requerir `disclaimer_accepted: true` en body. Persiste `disclaimer_accepted_at_confirm=NOW(), disclaimer_copy_version_confirm='v1'` + emite log `disclaimer.accepted action=confirm`.

### AC-03: Componente compartido
**Given** desarrollo de US-060/US-061
**When** se importa `BookingDisclaimer`
**Then** ambos dialogs lo consumen con el mismo componente.

### AC-04: Backfill BookingIntents existentes
**Given** BookingIntents pre-migración
**When** se aplica DB-002
**Then** `disclaimer_accepted_at_create = created_at`; `disclaimer_accepted_at_confirm = confirmed_at` si `status='confirmed_intent'`. `disclaimer_copy_version_*='v1'`.

---

## ⚠️ Edge Cases

### EC-01: Sin checkbox marcado
**Given** dialog abierto sin marcar checkbox
**When** intenta enviar
**Then** CTA deshabilitada (client). Si bypass ⇒ `400 DISCLAIMER_REQUIRED` (server enforcement bilateral).

### EC-02: Bypass del checkbox via API directo (vendor confirm)
**Given** vendor intenta confirmar sin `disclaimer_accepted: true`
**When** llega request al backend
**Then** `400 DISCLAIMER_REQUIRED` (paridad con US-060).

### EC-03: Texto del disclaimer no localizado
**Given** locale no soportado
**When** se renderiza
**Then** fallback a `es-LATAM` con badge "Translation pending" (existing fallback pattern).

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | (US-060 + US-061) body requiere `disclaimer_accepted === true` | `400 DISCLAIMER_REQUIRED` |
| VR-02 | Frontend bloquea CTA hasta checkbox marcado | UI lock |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Cross-role (organizer + vendor target via guards de US-060/US-061) |
| SEC-02 | Server-side enforcement bilateral (no confiar en frontend) |
| SEC-03 | Audit trail completo (timestamps + version) |

### Negative Authorization Scenarios
* Heredados de US-060 y US-061.

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
| Screen / Route | Modales de create (US-060) y confirm (US-061) |
| Main UI Pattern | `BookingDisclaimer` shared component (texto + checkbox + version badge) |
| Primary Action | Heredado del dialog parent ("Crear" / "Confirmar"), deshabilitado hasta checkbox marcado |
| Secondary Actions | "Cancelar" del dialog parent |
| Empty State | No aplica |
| Loading State | Heredado |
| Error State | Texto rojo si server retorna `400 DISCLAIMER_REQUIRED` |
| Success State | Heredado |
| Accessibility | Checkbox con label asociado; texto del disclaimer con `aria-describedby`; navegación por teclado |
| Responsive | Mobile-first |
| i18n | 4 locales (`booking.disclaimer.v1.body`, `booking.disclaimer.v1.checkbox`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `BookingDisclaimer` (nuevo, Client Component). Refactor de `CreateBookingDialog` (US-060) y `ConfirmBookingDialog` (US-061) para consumirlo.
* State: Local del componente padre (`agreementAccepted: boolean`).
* Forms: Checkbox required.
* API: Embedded en US-060/US-061.

### Backend
* Use Case: Refactor de `CreateBookingIntentUseCase` + `ConfirmBookingIntentUseCase` para persistir audit fields.
* Controller / Route: Embedded en US-060/US-061 (refactor body DTO del confirm).
* Validation: Zod refactor.
* Transaction: Heredada.

### Database
* Tablas: `booking_intents` (4 columnas nuevas).
* Migración: añadir + backfill.

### Constants
* `src/shared/booking/disclaimer.ts`: `export const BOOKING_DISCLAIMER_COPY_VERSION = 'v1';`

### Observability
* Log: `disclaimer.accepted` con `userId`, `bookingIntentId`, `action`, `agreementCopyVersion`, `acceptedAt`.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Create: checkbox + audit persisted + log emitted | Integration |
| TS-02 | Confirm: checkbox + audit persisted + log emitted (refactor US-061) | Integration |
| TS-03 | Componente compartido renderiza correctamente en ambos dialogs | E2E |
| TS-04 | Backfill: BookingIntents existentes tienen audit fields poblados | Migration test |
| TS-05 | Regresión: US-053..062 siguen funcionando con audit fields nuevos | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Create sin `disclaimer_accepted` | `400 DISCLAIMER_REQUIRED` (ya en US-060) |
| NT-02 | Confirm sin `disclaimer_accepted` | `400 DISCLAIMER_REQUIRED` (nuevo, refactor US-061) |
| NT-03 | UI: checkbox no marcado | CTA disabled |
| NT-04 | UI: locale no soportado | Fallback a es-LATAM |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Cross-role (organizer + vendor) ven y aceptan disclaimer | Visible y enforced |

### Accessibility
* Componente accesible (axe + RTL): checkbox + label + texto.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Cumplimiento legal MVP + manejo de expectativas |
| Expected Impact | Mitigación de riesgo legal y disputas |
| Success Criteria | 100% de BookingIntents creados/confirmados tienen audit fields completos |
| Academic Demo Value | Compliance + componente reusable + versionado |

---

## 🧩 Task Breakdown Readiness

* FE: `BookingDisclaimer` shared component + refactor 2 dialogs + i18n 4 locales.
* BE: Refactor `CreateBookingIntentUseCase` + `ConfirmBookingIntentUseCase` (+ DTO confirm) para persistir audit + log. Constante version.
* DB: Migración 4 columnas + backfill + verificación.
* QA: UT, IT regresión integral (US-053..062 + new audit), AUTH, A11Y, Backfill test.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] `BookingDisclaimer` shared operativo en create y confirm.
* [ ] Refactor US-061 con enforcement server-side completo.
* [ ] Migración + backfill aplicados sin pérdida de datos.
* [ ] Audit fields persistidos en cada create/confirm.
* [ ] Log `disclaimer.accepted` por cada acción.
* [ ] i18n 4 locales validados por legal.
* [ ] Tests verdes + regresión US-060..062.
* [ ] PO valida demo.

---

## 📝 Notes

* Copy validado por legal (acción documental no bloqueante).
* `BOOKING_DISCLAIMER_COPY_VERSION = 'v1'`. Bumps futuros requieren ADR.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-063-decision-resolution.md`.
