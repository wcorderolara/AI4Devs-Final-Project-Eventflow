# 🧾 User Story: LanguageSelector global en header con persistencia + cookie + re-render inmediato

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-081 |
| Backlog Item | PB-P1-047 — Selector de idioma y configuración del evento |
| Epic | EPIC-I18N-001 — Internationalization & Currency |
| Feature | `LanguageSelector` global en header + reuso `PATCH /users/me` (US-007) + cookie + router.refresh() |
| Module / Domain | I18N |
| User Role | Authenticated + Anonymous |
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

**As a** usuario (autenticado o anónimo)
**I want** un selector de idioma global en el header con cambio inmediato de UI y persistencia en mi perfil (si estoy autenticado)
**So that** la app respete mi preferencia lingüística sin recargar la página y sin perder el cambio entre sesiones (FR-I18N-002 + FR-USER-003)

---

## 🧠 Business Context

### Context Summary

US-081 es 1 de 2 en PB-P1-047. Surface UI global del `LanguageSelector` complementando US-007 (cambio desde profile). 4 idiomas soportados: `es-LATAM` (default), `es-ES`, `pt`, `en`. Re-render via `next-intl` + `router.refresh()` sin reload completo. Anónimos: cookie-only. Authenticated: cookie + PATCH /users/me (optimistic UI).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Reuso `PATCH /api/v1/users/me` de US-007 con field `preferred_language`. US-081 solo añade UI + hook. |
| D2 | Anónimos: cookie-only. Authenticated: cookie + DB persistence. |
| D3 | Re-render: cookie + `router.refresh()` de Next App Router (sin reload). |
| D4 | UI: `LanguageSelector` global en header (dropdown con icono globo + 4 opciones). |
| D5 | Optimistic UI: cookie inmediata + PATCH async + rollback en error. |
| D6 | Default `es-LATAM` (FR-I18N-006). |

### Related Domain Concepts

* `users.preferred_language` enum.
* Cookie `NEXT_LOCALE`.
* `next-intl` middleware.
* `useLocaleSwitcher` hook.

### Assumptions

* US-007 entregó PATCH `/users/me` con `preferred_language` (o se extiende minimal aquí).
* `next-intl` configurado en proyecto Next.js.

### Dependencies

* US-007 (change language from profile), PB-P0-001 (schema users.preferred_language).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-USER-003, FR-I18N-001, FR-I18N-002, FR-I18N-004, FR-I18N-006 |
| Use Case(s) | UC-I18N-001 |
| Business Rule(s) | BR-USER-006 |
| Permission Rule(s) | Cualquier user; anónimos cookie-only |
| Data Entity / Entities | User |
| API Endpoint(s) | PATCH /api/v1/users/me (reuso US-007) |
| NFR Reference(s) | NFR-PERF-001, NFR-A11Y-001 |
| Related Document(s) | /docs/3 §7.15, /docs/9 §FR-I18N, /docs/8 §UC-I18N-001 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Idiomas adicionales (más allá de los 4).
* Auto-detect del browser (FR-I18N-006 default es-LATAM).
* Translations runtime (todas las traducciones son build-time).
* Idioma de Event (US-082).

### Scope Notes
* Header global, re-render inmediato.

---

## ✅ Acceptance Criteria

### AC-01: Authenticated cambia idioma
**Given** organizer autenticado en `es-LATAM`
**When** selecciona `pt` en el `LanguageSelector`
**Then** cookie `NEXT_LOCALE='pt'` + `router.refresh()` + UI se re-renderiza en portugués + PATCH /users/me async actualiza DB.

### AC-02: Anónimo cambia idioma
**Given** visitante anónimo
**When** selecciona `en`
**Then** cookie + re-render. Sin PATCH (no autenticado).

### AC-03: Optimistic rollback en error
**Given** authenticated, PATCH falla (5xx)
**When** se detecta error
**Then** cookie revertida + toast error i18n + UI vuelve al locale anterior.

### AC-04: Default es-LATAM
**Given** nuevo usuario sin `preferred_language` ni cookie
**When** carga la app
**Then** locale = `es-LATAM`.

### AC-05: Selector global visible
**Given** user en cualquier página
**When** observa el header
**Then** `LanguageSelector` visible con locale code actual + dropdown accesible.

---

## ⚠️ Edge Cases

### EC-01: Locale no soportado en cookie
**Given** cookie con valor invalid (ej. 'fr')
**When** middleware lee
**Then** fallback a `es-LATAM` + sobreescribir cookie.

### EC-02: PATCH lento + user cambia otra vez
**Given** PATCH en flight + user selecciona otro locale
**When** ambos PATCH completan
**Then** último gana (race aceptable; UI muestra siempre el último seleccionado).

### EC-03: Sin cookies habilitadas
**Given** browser bloquea cookies
**When** user cambia
**Then** UI cambia para la sesión actual (in-memory); siguiente carga vuelve al default.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `preferred_language` ∈ {es-LATAM, es-ES, pt, en} | `400 INVALID_LANGUAGE` |
| VR-02 | (Authenticated) PATCH requiere sesión válida | `401` (heredado de US-006/007) |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Anónimos pueden cambiar locale via cookie (sin persistencia) |
| SEC-02 | Authenticated: cookie + DB sync via PATCH (heredado US-007) |
| SEC-03 | Cookie con flags `Path=/`, `MaxAge=1y`, `SameSite=Lax` (no Secure en dev) |
| SEC-04 | Backend valida enum (no acepta locales arbitrarios) |

### Negative Authorization Scenarios
* Anónimo intenta PATCH /users/me → 401 (correcto; solo cambia cookie).

---

## 🤖 AI Behavior

This story does not invoke AI directly. Sin embargo, el locale seleccionado se usa por FR-I18N-005 en llamadas AI subsiguientes.

* AI Feature: None
* Provider Layer: Not applicable
* AI Input/Output/HITL/Fallback: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | Header global (todas las páginas) |
| Main UI Pattern | `LanguageSelector` dropdown con icono globo (🌐) + locale code + lista de 4 opciones con labels nativos |
| Primary Action | Seleccionar idioma |
| Secondary Actions | Cerrar dropdown |
| Empty State | N/A |
| Loading State | Spinner pequeño durante PATCH async |
| Error State | Toast con rollback |
| Success State | UI re-renderizada en nuevo locale |
| Accessibility | `role="listbox"` para dropdown + `role="option"` para items + keyboard nav + announcement aria-live |
| Responsive | Mobile-first: ícono compacto en mobile, label completo en desktop |
| i18n | 4 locales (labels: "Español (LATAM)", "Español (España)", "Português", "English") |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `LanguageSelector` (Client Component); ubicado en `components/layout/Header.tsx`.
* State: `useLocaleSwitcher` hook con TanStack mutation + cookie manipulation + router.refresh().
* Forms: N/A (selector simple).
* API: reuso `usersApi.updateMe({ preferred_language })` de US-007.

### Backend
* Sin endpoints nuevos. Reuso `PATCH /api/v1/users/me` (US-007).
* Si US-007 no incluye `preferred_language` en DTO: extender refactor minimal.

### Database
* Tablas: `users.preferred_language` (heredada US-007). Sin migraciones nuevas.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| PATCH | `/api/v1/users/me` | (reuso US-007) Update `preferred_language` |

### Observability
* Correlation ID: Yes
* Log: `i18n.locale.changed` con `userId?, fromLocale, toLocale, anonymous`.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Authenticated cambia es-LATAM → pt: cookie + DB + UI | Integration |
| TS-02 | Anónimo cambia: cookie + UI sin PATCH | Integration |
| TS-03 | Optimistic rollback en error PATCH | E2E |
| TS-04 | Default es-LATAM para usuario nuevo | Integration |
| TS-05 | LanguageSelector visible en todas las páginas | E2E |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | PATCH con language inválido | `400 INVALID_LANGUAGE` |
| NT-02 | Cookie con valor invalid | Fallback a es-LATAM |
| NT-03 | Sin cookies habilitadas | UI cambia sesión actual |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Authenticated PATCH | 200 |
| AUTH-TS-02 | Anónimo intenta PATCH | 401 (UI no lo dispara) |

### Accessibility
* Dropdown accesible con keyboard + screen reader.

### Performance
* Re-render `< 200ms` percibido (cookie + router.refresh).

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | UX i18n + accesibilidad multilingüe |
| Expected Impact | Usuarios LATAM/PT/EN cambian idioma fácilmente |
| Success Criteria | UI cambia en `< 200ms` + persistencia para authenticated |
| Academic Demo Value | Demo i18n con 4 idiomas |

---

## 🧩 Task Breakdown Readiness

* FE: `LanguageSelector` + `useLocaleSwitcher` hook + integración header + i18n labels.
* BE: Reuso (no nuevos endpoints).
* QA: UT, IT, AUTH, A11Y, E2E rollback.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] `LanguageSelector` global operativo.
* [ ] Re-render < 200ms.
* [ ] Optimistic + rollback verificado.
* [ ] Default es-LATAM.
* [ ] Tests verdes.
* [ ] i18n labels nativos.

---

## 📝 Notes

* Si US-007 no incluye `preferred_language` en PATCH /users/me, esta US lo extiende minimal.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-081-decision-resolution.md`.
