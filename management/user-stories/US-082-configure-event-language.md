# 🧾 User Story: Configurar idioma del evento (default heredado + editable + impacta AI calls)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-082 |
| Backlog Item | PB-P1-047 — Selector de idioma y configuración del evento |
| Epic | EPIC-I18N-001 |
| Feature | Campo `event.language` en creación + edición + uso en AI calls + UI selector |
| Module / Domain | I18N / Events |
| User Role | Organizer |
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
**I want** configurar el idioma de mi evento al crearlo o editarlo, con default heredado de mi preferencia personal y bloqueado tras `completed/cancelled`
**So that** las salidas IA y notificaciones del evento respeten el idioma adecuado al contexto cultural del evento (FR-I18N-003 + FR-I18N-005)

---

## 🧠 Business Context

### Context Summary

US-082 cierra PB-P1-047. `event.language` configurable en `POST /events` (US-009) y `PATCH /events/:id` (US-010). Default heredado de `organizer.preferred_language`. Inmutable tras `completed/cancelled`. Cada US de AI (US-017..025) usa `event.language` como `locale` param. Sin retroactivo en AIRecommendations ya generadas.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Reuso POST US-009 + PATCH US-010 con field `language` opcional. |
| D2 | Inmutabilidad: editable hasta `status NOT IN ('completed','cancelled')`. |
| D3 | Default: `organizer.preferred_language` heredado al crear; fallback `es-LATAM`. |
| D4 | Validation Zod enum 4 locales. |
| D5 | Cada AI use case (US-017..025) usa `event.language` como `locale` param. |
| D6 | UI: selector en wizard creation + edición inline en detail page. |
| D7 | Sin retroactivo: AIRecommendations ya generadas conservan su idioma original. |

### Related Domain Concepts

* `events.language` enum.
* Heredado de `users.preferred_language`.
* Used by AI use cases.

### Assumptions

* US-009 (create event) + US-010 (edit event) entregados.
* `events.language` column existe (PB-P0-001) o se añade.

### Dependencies

* US-009 (create), US-010 (edit), US-007/US-081 (user preferred_language), todas las US AI (US-017..025), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-I18N-003, FR-I18N-005, FR-I18N-006 |
| Use Case(s) | UC-I18N-002 |
| Business Rule(s) | BR-EVENT-008, BR-AI-011 |
| Permission Rule(s) | Organizer (dueño del evento) |
| Data Entity / Entities | Event, User |
| API Endpoint(s) | POST /api/v1/events (reuso US-009) + PATCH /api/v1/events/:id (reuso US-010) |
| NFR Reference(s) | NFR-PERF-001 |
| Related Document(s) | /docs/3 §7.15, /docs/9 §FR-I18N-003/005, /docs/8 §UC-I18N-002 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Multilingual events (1 evento = 1 idioma).
* Translation runtime de outputs AI.
* Cambio retroactivo de AIRecommendations.
* Auto-detect.

### Scope Notes
* Idioma configurable + inmutable tras cerrar evento.

---

## ✅ Acceptance Criteria

### AC-01: Default heredado al crear
**Given** organizer con `preferred_language='pt'`, body POST sin `language`
**When** se crea evento
**Then** `event.language='pt'`.

### AC-02: Override explícito en creación
**Given** body POST con `language='en'`
**When** se crea
**Then** `event.language='en'` (override).

### AC-03: Edición permitida en planning
**Given** event `status='planning'`, PATCH `language='es-ES'`
**When** se ejecuta
**Then** `event.language='es-ES'` actualizado.

### AC-04: Edición bloqueada en completed
**Given** event `status='completed'`, PATCH `language='en'`
**When** se ejecuta
**Then** `409 EVENT_LANGUAGE_NOT_EDITABLE` con `details.current_status='completed'`.

### AC-05: AI calls usan event.language
**Given** event con `language='pt'`
**When** se invoca AI plan (US-017)
**Then** prompt incluye `locale='pt'` + output AI en portugués.

---

## ⚠️ Edge Cases

### EC-01: Organizer sin preferred_language
**Given** organizer nuevo sin preferred_language, body POST sin language
**When** se crea
**Then** `event.language='es-LATAM'` (FR-I18N-006 default).

### EC-02: Language inválido
**Given** body con `language='fr'`
**When** se valida
**Then** `400 INVALID_LANGUAGE`.

### EC-03: AIRecommendations previos
**Given** AIRecommendations generados en es-LATAM, cambiar event.language a pt
**When** se consulta
**Then** AIRecommendations existentes siguen en es-LATAM (sin regenerate).

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `language` ∈ {es-LATAM, es-ES, pt, en} | `400 INVALID_LANGUAGE` |
| VR-02 | Organizer dueño del evento | `404 EVENT_NOT_FOUND` (heredado US-010) |
| VR-03 | (PATCH) event.status NOT IN (completed, cancelled) | `409 EVENT_LANGUAGE_NOT_EDITABLE` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `organizer` |
| SEC-02 | Ownership del evento (heredado US-010) |
| SEC-03 | Backend valida enum |

### Negative Authorization Scenarios
* Sin sesión → 401; otro organizer → 404; vendor/admin → 403.

---

## 🤖 AI Behavior

Esta US no invoca AI directamente, pero **configura el contrato** que cada US AI subsiguiente debe respetar.

* AI Feature: None (solo configuración)
* Provider Layer: Sin cambios — cada use case AI extrae event.language como locale
* Human Validation Required: No
* Persist AIRecommendation: No
* Fallback Required: No

### AI Input
Cada AI use case debe incluir `locale: event.language` en el prompt context.

### AI Output
AI output respeta el locale.

### Human-in-the-loop Rules
N/A.

### AI Error / Fallback Behavior
Si AI provider no soporta el locale, fallback template estático en es-LATAM (per AI use case).

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | Event creation wizard (US-009) + Event detail page (US-010) |
| Main UI Pattern | Selector dropdown con 4 locales nativos; precargado con default del organizer |
| Primary Action | Seleccionar idioma |
| Secondary Actions | "Usar mi preferencia" (reset al default) |
| Empty State | N/A |
| Loading State | Spinner durante PATCH |
| Error State | Banner i18n por código (`INVALID_LANGUAGE`, `EVENT_LANGUAGE_NOT_EDITABLE`) |
| Success State | Toast + UI actualizada |
| Accessibility | Dropdown accesible (heredado de pattern US-081) |
| Responsive | Mobile-first |
| i18n | 4 locales (`organizer.event.language.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `EventLanguageSelector` (reuso patrón LanguageSelector de US-081, scoped a Event).
* State: form field controlled.
* Forms: RHF + Zod en wizard US-009 y modal de edición US-010.
* API: reuso `eventsApi.create/update` con field `language`.

### Backend
* Use Cases: refactor minimal en `CreateEventUseCase` (US-009) + `UpdateEventUseCase` (US-010) para manejar `language` (default + validation + inmutabilidad).
* DTOs: extender bodies.
* Authorization: heredada US-009/010.
* Transaction: heredada.

### Database
* Tablas: `events.language` enum. Verificar columna existe (PB-P0-001); si no, migración menor.

### API

Sin endpoints nuevos. Refactor minimal de:
- `POST /api/v1/events` (US-009): body acepta `language`.
- `PATCH /api/v1/events/:id` (US-010): body acepta `language`.

### Observability
* Log: `event.language.set` (en create) + `event.language.changed` (en update) con `eventId, fromLanguage, toLanguage, organizerId`.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Default heredado en create | Integration |
| TS-02 | Override explícito en create | Integration |
| TS-03 | Edición permitida en planning | Integration |
| TS-04 | Edición bloqueada en completed | Integration |
| TS-05 | AI use case usa event.language | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Language inválido | `400 INVALID_LANGUAGE` |
| NT-02 | Edición en completed/cancelled | `409 EVENT_LANGUAGE_NOT_EDITABLE` |
| NT-03 | Organizer ajeno | `404 EVENT_NOT_FOUND` |

### AI Tests
TS-05 verifica binding entre event.language y AI prompt locale.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño | 200/201 |
| AUTH-TS-02 | Organizer ajeno | 404 |
| AUTH-TS-03 | Vendor/Admin | 403 |
| AUTH-TS-04 | Sin sesión | 401 |

### Accessibility
* Dropdown accesible.

### Performance
* Heredado US-009/010.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Calidad UX i18n + AI relevance |
| Expected Impact | AI outputs en idioma correcto del evento |
| Success Criteria | 100% AI calls usan event.language |
| Academic Demo Value | Demo i18n multidimensional (user + event) |

---

## 🧩 Task Breakdown Readiness

* FE: `EventLanguageSelector` + integración wizard + edit form + i18n.
* BE: Refactor minimal CreateEventUseCase + UpdateEventUseCase + DTOs.
* DB: Verificar/migrar `events.language`.
* QA: UT + IT (incluye verificación AI binding) + AUTH + A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Field language en create/update event.
* [ ] Default heredado + inmutabilidad enforcement.
* [ ] AI use cases usan event.language verificado.
* [ ] Tests verdes.
* [ ] i18n labels.

---

## 📝 Notes

* Cada US AI (US-017..025) debe actualizarse para extraer event.language.
* US-082 cierra PB-P1-047 y avanza EPIC-I18N-001.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-082-decision-resolution.md`.
