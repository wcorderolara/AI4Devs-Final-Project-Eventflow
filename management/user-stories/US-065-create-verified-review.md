# 🧾 User Story: Crear reseña verificada (1-5, 30 días post-event + denormalize atómico)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-065 |
| Backlog Item | PB-P1-038 — Crear reseña verificada (1–5) |
| Epic | EPIC-REV-001 — Reviews & Moderation |
| Feature | Endpoint `POST /organizer/reviews` + denormalize atómico de VendorProfile + notif al vendor |
| Module / Domain | Reviews |
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

**As an** organizador con `BookingIntent.confirmed_intent` con un vendor y evento `completed` dentro de los últimos 30 días
**I want** crear una reseña verificada (rating 1-5, comentario opcional ≤2000 chars) que se publique inmediatamente y dispare denormalize atómico de rating en el `VendorProfile`
**So that** mi experiencia sea visible en el perfil del vendor y otros organizadores puedan tomar decisiones informadas

---

## 🧠 Business Context

### Context Summary

US-065 cierra PB-P1-038 y abre EPIC-REV-001. Núcleo del cierre del ciclo demo MVP (organizer → vendor confirmado → reseña verificada). Decisión PO 8.1 #1: escala 1-5 donde 5=mejor. Ventana 30 días post `event.completed_at`. Una sola review por `(event, vendor)`. Inmutable post-publicación (FR-REVIEW-007). Sin moderación previa (status inicial `published`) — moderación reversible vía US-066/067.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Comentario opcional `[0..2000]`; ausente o vacío ⇒ `null`. |
| D2 | Status inicial `published` (sin moderación previa MVP). |
| D3 | Ventana 30 días post `event.completed_at`. Server-side enforcement. |
| D4 | Denormalize atómico de `VendorProfile.rating_avg + reviews_count` con recálculo total (no incremental). |
| D5 | 2 Notifications atómicas al vendor (`review.published`) vía `QuoteEventNotificationService` extendido a 9 eventos. |
| D6 | `403 NOT_ELIGIBLE` con `details.reason` ∈ `{no_booking, event_not_completed, window_expired, already_reviewed}`. `404 NOT_FOUND` solo cuando event/vendor inexistentes. |
| D7 | Soft delete: `status ∈ {published, hidden, deleted}`. Cambio dispara recálculo denormalize. |
| D8 | Body: `{ event_id, vendor_profile_id, rating: 1..5, comment? }`. DTO `.strict()`. |
| D9 | Endpoint `POST /api/v1/organizer/reviews`. |

### Related Domain Concepts

* `reviews.status`, `rating`, `comment`.
* `VendorProfile.rating_avg`, `reviews_count` (denormalize).
* `QuoteEventNotificationService` extendido a 9 eventos.
* `BookingIntent.confirmed_intent` como precondición de elegibilidad.

### Assumptions

* US-061 confirmó BookingIntent.
* `events.completed_at` lo setea job de US-015 (auto-complete 2 días post `event_date`).
* `VendorProfile` tiene columnas `rating_avg numeric(3,2)` y `reviews_count integer NOT NULL DEFAULT 0`.

### Dependencies

* US-061 (BookingIntent confirmed_intent), US-015 (job auto-complete event), US-049..062 (service común a extender a 9 eventos), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-REVIEW-001, FR-REVIEW-002, FR-REVIEW-003, FR-REVIEW-007, FR-REVIEW-008, FR-VENDOR-013, FR-NOTIF-001, FR-NOTIF-004 |
| Use Case(s) | UC-REVIEW-001 |
| Business Rule(s) | BR-REVIEW-001, BR-REVIEW-002, BR-REVIEW-003, BR-REVIEW-007, BR-REVIEW-008, BR-REVIEW-009, BR-BOOKING-010, BR-NOTIF-001/002 |
| Permission Rule(s) | Organizer dueño + BookingIntent confirmed_intent + ventana 30 días |
| Data Entity / Entities | Review, BookingIntent, Quote, Event, VendorProfile, Notification |
| API Endpoint(s) | POST /api/v1/organizer/reviews |
| NFR Reference(s) | NFR-PERF-001, NFR-OBS-005 |
| Related Document(s) | /docs/4 §BR-REVIEW-001..009, /docs/8 §UC-REVIEW-001, /docs/9 §FR-REVIEW-001..008/FR-VENDOR-013, /docs/8.1 #1 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Reseñas anónimas.
* Moderación automática IA.
* Edición de reseña post-publicación (FR-REVIEW-007).
* Respuesta del vendor (FR-REVIEW-008; futuro).
* Recordatorios automáticos para reseñar.
* Reseñas con fotos/media.

### Scope Notes
* Verificación estricta + ventana 30 días.

---

## ✅ Acceptance Criteria

### AC-01: Creación válida + denormalize atómico
**Given** organizer dueño de evento completado hace 15 días, con `BookingIntent.confirmed_intent` con vendor X, sin review previa por (event, X), body `{ event_id, vendor_profile_id, rating: 4, comment: "Excelente servicio." }`
**When** `POST /api/v1/organizer/reviews`
**Then** en `prisma.$transaction`:
- INSERT review `status='published', author_user_id=currentUser.id`,
- recálculo `vendor_profiles.rating_avg = AVG(rating)` + `reviews_count = COUNT(*)` (solo published),
- INSERT 2 Notifications al vendor (`review.published`),
- log `review.published`,
- responde `201 Created` con review completa.

### AC-02: Comentario opcional
**Given** body sin `comment` o `comment=""`
**When** se crea
**Then** persiste `comment=null`; resto idéntico.

### AC-03: Unicidad por (event, vendor)
**Given** ya existe review para `(event, vendor_profile)`
**When** intenta crear otra
**Then** `403 NOT_ELIGIBLE` con `details.reason='already_reviewed'`. No-op DB.

### AC-04: Inmutabilidad post-publicación
**Given** review publicada
**When** organizer intenta `PATCH /reviews/:id` o similar
**Then** endpoint inexistente (`404`). FR-REVIEW-007 enforcement por ausencia de endpoint.

---

## ⚠️ Edge Cases

### EC-01: Sin BookingIntent confirmed_intent
**Given** organizer sin BookingIntent confirmed con vendor
**When** intenta crear
**Then** `403 NOT_ELIGIBLE` con `details.reason='no_booking'`.

### EC-02: Evento no completado
**Given** `event.completed_at IS NULL`
**When** intenta crear
**Then** `403 NOT_ELIGIBLE` con `details.reason='event_not_completed'`.

### EC-03: Ventana expirada (> 30 días post-completed)
**Given** evento completado hace 31 días
**When** intenta crear
**Then** `403 NOT_ELIGIBLE` con `details.reason='window_expired'`.

### EC-04: Rating fuera de rango
**Given** body `rating=6` o `0` o `3.5`
**When** validación
**Then** `400 INVALID_BODY` con detail `rating must be integer 1..5`.

### EC-05: Comment > 2000 chars
**Given** body `comment.length=2001`
**When** validación
**Then** `400 INVALID_COMMENT_LENGTH`.

### EC-06: Event/Vendor inexistente
**Given** UUIDs inexistentes
**When** se busca
**Then** `404 NOT_FOUND` uniforme (no revela cuál falta).

### EC-07: Organizer ajeno al evento
**Given** evento de otro organizer
**When** intenta crear
**Then** `404 NOT_FOUND` uniforme.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `rating` integer 1..5 | `400 INVALID_BODY` |
| VR-02 | `comment` opcional [0..2000] | `400 INVALID_COMMENT_LENGTH` |
| VR-03 | `event_id`/`vendor_profile_id` UUID | `400 INVALID_UUID` |
| VR-04 | DTO `.strict()` | `400 INVALID_BODY` |
| VR-05 | Organizer dueño del evento | `404 NOT_FOUND` |
| VR-06 | Event y Vendor existen | `404 NOT_FOUND` |
| VR-07 | BookingIntent confirmed_intent existe (event, vendor) | `403 NOT_ELIGIBLE` reason='no_booking' |
| VR-08 | event.completed_at IS NOT NULL | `403 NOT_ELIGIBLE` reason='event_not_completed' |
| VR-09 | NOW() <= completed_at + 30 days | `403 NOT_ELIGIBLE` reason='window_expired' |
| VR-10 | Sin review previa por (event, vendor) | `403 NOT_ELIGIBLE` reason='already_reviewed' |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `organizer` |
| SEC-02 | Ownership del evento |
| SEC-03 | Verificación bilateral (event+vendor) por BookingIntent confirmado |
| SEC-04 | `404 NOT_FOUND` uniforme para ownership/inexistente |
| SEC-05 | `403 NOT_ELIGIBLE` con details.reason solo para flujos de elegibilidad propia |
| SEC-06 | Sin endpoint de edición (FR-REVIEW-007) |

### Negative Authorization Scenarios
* Sin sesión → 401; vendor/admin → 403; ajeno → 404; sin booking → 403 NOT_ELIGIBLE.

---

## 🤖 AI Behavior

This story does not invoke AI directly. No hay moderación automática IA.

* AI Feature: None
* Provider Layer: Not applicable
* AI Input/Output/HITL/Fallback: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/organizer/events/:id/reviews/new?vendorId=:vp` |
| Main UI Pattern | `ReviewForm` con `StarRating` (1-5) + textarea opcional |
| Primary Action | "Publicar reseña" |
| Secondary Actions | "Cancelar" |
| Empty State | No aplica |
| Loading State | Spinner CTA |
| Error State | Banner i18n por código (`NOT_ELIGIBLE` con sub-razón) |
| Success State | Toast + redirect al perfil del vendor |
| Accessibility | `StarRating` con `role="radiogroup"`, `aria-valuenow`, navegación teclado |
| Responsive | Mobile-first |
| i18n | 4 locales (`organizer.review.create.*`, `organizer.review.eligibility.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `ReviewForm`, `StarRating` (accesible), `ReviewEligibilityBanner` (informativo si no eligible).
* State: TanStack mutation + invalidación.
* Forms: RHF + Zod.
* API: `organizerApi.reviews.create({event_id, vendor_profile_id, rating, comment?})`.

### Backend
* Use Case: `CreateReviewUseCase` con `prisma.$transaction`.
* Controller / Route: `POST /api/v1/organizer/reviews`.
* Authorization: organizer + ownership + elegibilidad.
* Validation: Zod `.strict()` + service layer.
* Transaction: Sí.
* Service: extender `QuoteEventNotificationService` con `'review.published'`.

### Database
* Tablas: `reviews` (insert), `vendor_profiles` (update denormalize), `booking_intents` (read), `quotes` (read), `events` (read), `notifications` (write).
* Constraint: UNIQUE `(event_id, vendor_profile_id)` (parcial WHERE status != 'deleted' opcional).
* Indexes: `(vendor_profile_id, status)`, `(event_id, vendor_profile_id) UNIQUE`.
* Verificar columnas: `events.completed_at`, `vendor_profiles.rating_avg`, `reviews_count`.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/organizer/reviews` | Crear reseña verificada con denormalize atómico |

#### Request body
```json
{
  "event_id": "<uuid>",
  "vendor_profile_id": "<uuid>",
  "rating": 4,
  "comment": "Excelente servicio."
}
```

#### Response 201
```json
{
  "id": "<uuid>",
  "event_id": "<uuid>",
  "vendor_profile_id": "<uuid>",
  "author_user_id": "<uuid>",
  "rating": 4,
  "comment": "Excelente servicio.",
  "status": "published",
  "created_at": "2026-..."
}
```

### Observability
* Correlation ID: Yes
* Log: `review.published` con `reviewId`, `vendorProfileId`, `eventId`, `organizerUserId`, `rating`.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Crear válida + denormalize correcto (rating_avg/reviews_count) | Integration |
| TS-02 | Comment opcional persiste null | Integration |
| TS-03 | Notif vendor: 2 Notifications atómicas | Integration |
| TS-04 | Regresión service común: 8 eventos previos siguen funcionando | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Sin BookingIntent | `403 NOT_ELIGIBLE` reason='no_booking' |
| NT-02 | Event no completed | `403 NOT_ELIGIBLE` reason='event_not_completed' |
| NT-03 | Ventana expirada | `403 NOT_ELIGIBLE` reason='window_expired' |
| NT-04 | Review duplicada | `403 NOT_ELIGIBLE` reason='already_reviewed' |
| NT-05 | Rating 6 / 0 / 3.5 | `400 INVALID_BODY` |
| NT-06 | Comment > 2000 | `400 INVALID_COMMENT_LENGTH` |
| NT-07 | UUID malformado | `400 INVALID_UUID` |
| NT-08 | Event/Vendor inexistente | `404 NOT_FOUND` |
| NT-09 | Organizer ajeno | `404 NOT_FOUND` |
| NT-10 | Sin sesión | `401` |
| NT-11 | Vendor/Admin | `403` |
| NT-12 | Body con campo extra | `400 INVALID_BODY` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño + elegible | 201 |
| AUTH-TS-02 | Organizer dueño no elegible | 403 NOT_ELIGIBLE |
| AUTH-TS-03 | Organizer ajeno | 404 |
| AUTH-TS-04 | Vendor | 403 |
| AUTH-TS-05 | Admin | 403 |
| AUTH-TS-06 | Sin sesión | 401 |

### Accessibility
* `StarRating` accesible (radiogroup) + textarea con label + axe + keyboard nav.

### Performance
* `< 500ms` p95.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Confianza + calidad del directorio + cierre del ciclo MVP |
| Expected Impact | Reseñas verificadas que respaldan decisiones futuras |
| Success Criteria | ≥ 30% bookings con reseña; rating_avg coherente |
| Academic Demo Value | Cierre del ciclo demo organizer → vendor → review |

---

## 🧩 Task Breakdown Readiness

* FE: `ReviewForm` + `StarRating` accesible + `ReviewEligibilityBanner` + i18n.
* BE: DTO + UseCase atómico + Controller + extender service común + Logger.
* DB: Verificar/migrar UNIQUE + columnas denormalize.
* QA: UT, IT (denormalize + regresión), AUTH, A11Y, Concurrencia (UNIQUE), Security.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con elegibilidad bilateral.
* [ ] Denormalize atómico de VendorProfile.
* [ ] UNIQUE (event, vendor) enforced.
* [ ] 2 Notifications atómicas vía service común extendido a 9 eventos.
* [ ] StarRating accesible (axe + keyboard).
* [ ] Tests verdes + regresión US-053..064.
* [ ] i18n 4 locales.
* [ ] PO valida demo del cierre del ciclo.

---

## 📝 Notes

* Decisión PO 8.1 #1 (escala 1-5).
* US-066 (flag/report) y US-067 (admin moderate) cerrarán EPIC-REV-001.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-065-decision-resolution.md`.
