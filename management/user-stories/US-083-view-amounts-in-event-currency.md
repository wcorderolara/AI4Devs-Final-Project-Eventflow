# 🧾 User Story: Currency display consistente con `<MoneyDisplay>` + inmutabilidad + sin FX

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-083 |
| Backlog Item | PB-P1-048 — Moneda inmutable y display consistente |
| Epic | EPIC-I18N-001 |
| Feature | Helper `formatCurrency` + `<MoneyDisplay>` componente reusable + backend guard inmutabilidad |
| Module / Domain | I18N / Currency |
| User Role | Organizer (visualización) |
| Priority | Must Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-29 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-29 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As an** organizador
**I want** ver todas las cifras (presupuesto, quotes, bookings) en la moneda fija de mi evento con formato consistente según mi locale de UI, y que la moneda no se pueda cambiar después de crear el evento
**So that** no haya confusión con conversiones FX automáticas y mi presupuesto sea predecible (FR-BUDGET-002/007/009 + Decisión PO 8.1 #7)

---

## 🧠 Business Context

### Context Summary

US-083 single-story de PB-P1-048. Helper utility `formatCurrency` SSR-compatible + componente `<MoneyDisplay>` reusable aplicado en todas las superficies con cifras + backend guard que prohibe UPDATE de `event.currency_code`. Sin conversión FX automática (BR-BUDGET-007). 5 currencies obligatorias: GTQ, EUR, MXN, COP, USD.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Helper `formatCurrency(amount, currencyCode, locale)` con `Intl.NumberFormat`. |
| D2 | Backend guard: `updateEventBody.omit({ currency_code })` en US-010. |
| D3 | `<MoneyDisplay>` componente aplicado en todas las superficies con cifras + audit. |
| D4 | Formatting usa user locale (no event.language) — separa contenido vs presentación. |
| D5 | Display símbolo nativo + tooltip ISO + manejo de `$` ambiguo. |
| D6 | Enum de 5 currencies obligatorias (FR-BUDGET-009). |
| D7 | Helper SSR-compatible (Node + browser). |
| D8 | Sin moneda mixta MVP; cada surface event-scoped. |

### Related Domain Concepts

* `events.currency_code` inmutable post-creación.
* Helper `formatCurrency` shared.
* `<MoneyDisplay>` componente reusable.

### Assumptions

* `events.currency_code` ya existe (PB-P0-001).
* Decisión PO 8.1 #7 confirma 5 currencies.

### Dependencies

* US-009 (create con currency), US-010 (refactor para omit currency), todas las US que muestran cifras (US-036/038/052/057/060/061/064/019/etc.).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-BUDGET-002, FR-BUDGET-007, FR-BUDGET-009, FR-EVENT-003 |
| Use Case(s) | UC-EVENT-001, UC-BUDGET-001, UC-BUDGET-004 |
| Business Rule(s) | BR-EVENT-007, BR-BUDGET-006, BR-BUDGET-007, BR-BUDGET-008, BR-BUDGET-009, BR-BUDGET-010 |
| Permission Rule(s) | Organizer (visualización en sus eventos); cualquier visualizador para vendor profile public |
| Data Entity / Entities | Event, Budget, BudgetItem, Quote, BookingIntent |
| API Endpoint(s) | (refactor minimal PATCH /events/:id US-010) |
| NFR Reference(s) | NFR-PERF-001, NFR-A11Y-001 |
| Related Document(s) | /docs/3 §7.15, /docs/9 §FR-BUDGET-002/007/009, /docs/15 i18n strategy, /docs/8.1 #7 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Conversión FX automática.
* Currencies adicionales (más allá de las 5).
* Agregación cross-currency (vistas multi-evento sumadas).
* Edición de currency post-creación.
* Display con format custom por usuario.

### Scope Notes
* Helper + componente + audit + guard.

---

## ✅ Acceptance Criteria

### AC-01: `<MoneyDisplay>` muestra monto con símbolo + tooltip ISO
**Given** BudgetItem con `amount=500.00, currency='GTQ'`, user locale `es-LATAM`
**When** se renderiza
**Then** UI muestra "Q500.00" con `title="GTQ"` y `aria-label="500 Quetzales guatemaltecos"`.

### AC-02: Locale del usuario afecta formato
**Given** mismo monto, user locale `pt`
**When** se renderiza
**Then** UI muestra "Q 500,00" (separador decimal coma).

### AC-03: USD con código si ambiguo
**Given** BookingIntent USD, user locale `en`
**When** se renderiza
**Then** UI muestra "USD 500.00" (símbolo ambiguo desambiguado con código).

### AC-04: Backend rechaza UPDATE currency
**Given** PATCH /events/:id con body `{ currency_code: 'USD' }`
**When** se valida
**Then** `400 INVALID_BODY` (Zod omit). Sin cambio en DB.

### AC-05: Surface audit
**Given** code review
**When** se busca `${amount}` raw display fuera de `<MoneyDisplay>`
**Then** No hay matches (lint rule o test).

---

## ⚠️ Edge Cases

### EC-01: Currency no soportada
**Given** body POST /events con `currency='BRL'`
**When** se valida (US-009)
**Then** `400 INVALID_CURRENCY` (enum).

### EC-02: Amount=0
**Given** monto 0
**When** se renderiza
**Then** "Q0.00" correctamente formateado.

### EC-03: Amount negativo
**Given** monto negativo (no esperado en MVP)
**When** se renderiza
**Then** "-Q500.00" con signo. Sin error.

### EC-04: Decimal precision
**Given** monto con más decimales que el formato
**When** se formatea
**Then** Intl.NumberFormat redondea a 2 decimales por default.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `currency_code` ∈ {GTQ, EUR, MXN, COP, USD} en CREATE | `400 INVALID_CURRENCY` |
| VR-02 | UPDATE event NO acepta `currency_code` field | `400 INVALID_BODY` (Zod omit) |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Heredado de cada surface (Budget owner, Quote owner, etc.) |
| SEC-02 | Backend valida enum |
| SEC-03 | Backend enforce inmutabilidad |

### Negative Authorization Scenarios
* Heredados.

---

## 🤖 AI Behavior

Esta US no invoca AI directamente. Cuando los AI use cases pasan `currency_code` al prompt, deben usar `event.currency_code` (ya inmutable).

* AI Feature: None
* Provider Layer: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | Todas las páginas con cifras (Budget, Quote, BookingIntent, Dashboard) |
| Main UI Pattern | `<MoneyDisplay value={amount} currencyCode={...} />` |
| Primary Action | N/A (display only) |
| Secondary Actions | Tooltip ISO al hover/focus |
| Empty State | "-" o "Q0.00" según contexto |
| Loading State | Skeleton de cifra |
| Error State | "-" si data missing |
| Success State | Cifra formateada |
| Accessibility | `aria-label` con currency name completo |
| Responsive | Mobile-first; cifras no se truncan |
| i18n | Currency names en 4 locales (`common.currency.GTQ` = "Quetzales guatemaltecos", etc.) |
| Currency | El símbolo viene del Intl.NumberFormat |

---

## 🛠 Technical Notes

### Frontend
* Helper: `src/shared/format/money.ts` con `formatCurrency`.
* Componente: `components/common/MoneyDisplay.tsx`.
* Lint rule: ESLint custom o test que verifique no hay `${amount}` raw fuera de MoneyDisplay (opcional).
* Refactor: identificar todos los lugares actuales con display de cifras y migrar a MoneyDisplay.

### Backend
* Refactor `UpdateEventUseCase` DTO US-010: omit currency_code.
* Helper: `src/shared/format/money.ts` (mismo archivo compartido para emails simulados).

### Database
* Sin cambios. `events.currency_code` ya inmutable a nivel DB constraint sería opcional (suficiente con DTO).

### API
Sin endpoints nuevos.

### Observability
* Log estándar.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | formatCurrency GTQ es-LATAM | Unit |
| TS-02 | formatCurrency USD en | Unit |
| TS-03 | formatCurrency EUR pt | Unit |
| TS-04 | `<MoneyDisplay>` renderiza correctamente | Component |
| TS-05 | PATCH /events/:id con currency_code ⇒ 400 | Integration |
| TS-06 | Code audit: no hay raw amount display | Lint/Test |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | currency inválida en POST /events | `400 INVALID_CURRENCY` |
| NT-02 | UPDATE intent currency_code | `400 INVALID_BODY` |

### AI Tests
Not applicable for this story.

### Authorization
Heredado.

### Accessibility
* `aria-label` con currency name completo + axe.

### Performance
* Helper síncrono, latencia despreciable.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | UX consistencia + claridad financiera |
| Expected Impact | Cero confusión FX |
| Success Criteria | 100% cifras via MoneyDisplay + inmutabilidad enforced |
| Academic Demo Value | Demo i18n currency + compliance MVP |

---

## 🧩 Task Breakdown Readiness

* FE: helper `formatCurrency` + `MoneyDisplay` + refactor de surfaces + i18n currency names.
* BE: refactor US-010 omit currency_code + helper shared.
* QA: UT helper + Component test + IT inmutabilidad + audit lint.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Helper formatCurrency operativo (SSR + client).
* [ ] `<MoneyDisplay>` aplicado en todas las surfaces.
* [ ] Backend guard inmutabilidad enforced.
* [ ] Audit verifica no hay raw display.
* [ ] Tests verdes.
* [ ] i18n currency names en 4 locales.

---

## 📝 Notes

* Helper SSR-compatible vital para AI prompts + emails simulados.
* Decisión PO 8.1 #7 (5 currencies + inmutabilidad).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-083-decision-resolution.md`.
