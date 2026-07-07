# Technical Specification — US-070: Recibir aviso in-app de Booking confirmado

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-070                                                                                              |
| Source User Story                    | `management/user-stories/US-070-inapp-notification-booking-confirmed.md`                            |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-070-decision-resolution.md`                        |
| Priority                             | P2                                                                                                  |
| Backlog ID                           | PB-P2-007                                                                                           |
| Backlog Title                        | Notificación de BookingIntent confirmado · `Vendor confirma → notif bilateral organizer + vendor`     |
| Backlog Execution Order              | 7 (séptimo ítem de P2)                                                                              |
| User Story Position in Backlog Item  | 1 de 1                                                                                              |
| Related User Stories in Backlog Item | US-070                                                                                              |
| Epic                                 | EPIC-NOT-001                                                                                        |
| Backlog Item Dependencies            | PB-P1-036 (US-061 `ConfirmBookingIntentUseCase`, entregada)                                        |
| Feature                              | Emitir notificación bilateral al confirmarse BookingIntent                                          |
| Module / Domain                      | Notifications                                                                                       |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-06                                                                                          |
| Last Updated                         | 2026-07-06                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-007 — Notificación de BookingIntent confirmado** (P2, Should Have). Depende de PB-P1-036 (US-061). Formaliza `FR-BOOKING-010` (`docs/9 §495`) y `BR-NOTIF-002` (`docs/4 §389`). Nota Documentation Alignment: PB-P2-007 `Description` menciona sólo organizer; FR-BOOKING-010 exige ambos recipients (D6).

### Execution Order Rationale

Se implementa después de US-061 (upstream) y US-071 (surface organizer aprobada). El patrón es simétrico a US-068/US-069 (Ready for Sprint Planning) con dos particularidades: 2 recipients y dispatch de link por rol.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
| ---------- | -------------------- | --------------- |
| US-070     | Emisor bilateral      | 1               |

---

## 3. Executive Technical Summary

Implementar `OnBookingConfirmedHandler` en el módulo `notifications` e invocarlo sincrónicamente desde `ConfirmBookingIntentUseCase` (US-061) dentro de la misma transacción Prisma. Por cada BookingIntent en `confirmed_intent`:

1. Resolver `recipients = dedup([organizer, vendor])` (D7 self-notification).
2. Guards defensivos (D7): `booking_intent.status='confirmed_intent'`, `event` existe, cada recipient no `deactivated`.
3. Por cada recipient válido:
   - Idempotencia: `SELECT 1 ... WHERE user_id=$1 AND type='booking_confirmed' AND payload->>'booking_intent_id'=$2`.
   - Si no existe:
     * Resolver `language_code` (D5) via `UserRepository.resolveLanguageCode(recipient.user_id, event.language_code)`.
     * Resolver `link` (D3) via `NotificationLinkResolver.resolve(notification, { recipientRole })` → organizer path o vendor path.
     * INSERT `Notification(channel='in_app')` + INSERT `Notification(channel='email_simulated')`.
     * Invocar `SimulatedEmailAdapter.logEmail`.

Ante fallo del INSERT, la tx rollea (Booking no queda `confirmed_intent`; `BudgetItem.committed` no se actualiza — alcance US-061). Sin migración. Reuso máximo de US-034 (`SimulatedEmailAdapter`, `UserRepository.resolveLanguageCode`) y US-071 (`NotificationLinkResolver` extendido con firma `{ recipientRole }`).

---

## 4. Scope Boundary

### In Scope

* Backend: `OnBookingConfirmedHandler` bilateral con dedup, extensión de `NotificationRepository` (`existsBookingConfirmedForRecipient`), extensión del `NotificationLinkResolver` (firma con `recipientRole` + estrategia `booking_confirmed`), catálogos i18n para `booking_confirmed` (4 locales × 2 recipient roles).
* Testing: TS-01..TS-08 + NT-01..NT-04 + AUTH-TS-01 + regresión no-PII + dedup self-notification.
* Documentation Alignment: 4 ítems.

### Out of Scope

* Surface UI organizer (US-071 aprobada).
* Surface UI vendor (Future).
* Mark-as-read (US-072).
* Notif de creación (`pending`) y cancelación del BookingIntent (Future US aunque FR-BOOKING-010 las enumera).
* Actualización de `BudgetItem.committed` (alcance US-061; BR-BOOKING-008).
* Endpoints nuevos.
* Push/SMS/WhatsApp.
* Event bus / outbox.
* Retry asincrónico.
* Cambios de schema Prisma.
* Inclusión de `Quote.total` en payload.

### Explicit Non-Goals

* Modificar `ConfirmBookingIntentUseCase` más allá de invocar el handler.
* Introducir columna `Notification.booking_intent_id`.
* Cambiar el enum `notification_type` (`booking_confirmed` ya existe).
* Alterar la firma existente del `NotificationLinkResolver` de manera incompatible con US-068/US-069/US-071.

---

## 5. Architecture Alignment

### Backend Architecture

* Módulo `notifications` (`docs/14 §443`) aloja el handler.
* Módulo `booking-intent` (`docs/14 §441`) invoca el handler desde `ConfirmBookingIntentUseCase`.
* Reuso: `SimulatedEmailAdapter` (US-034), `NotificationRepository`, `UserRepository.resolveLanguageCode` (US-034), `NotificationLinkResolver` (US-071).
* Sin event bus (`docs/14 §23.1`).

### Frontend Architecture

`No aplica`.

### Database Architecture

* Sólo `notifications` (INSERTs) + lectura de `booking_intents, quotes, quote_requests, events, users, vendor_profiles`.
* Reuso de índices. Sin migración.

### API Architecture

`No aplica` — handler interno. Consumo por organizer vía US-071 canonical.

### AI / PromptOps Architecture

`No aplica`.

### Security Architecture

* Handler como sistema dentro del use case autenticado (US-061 valida sesión de vendor).
* Aislamiento BR-NOTIF-005 (`user_id ∈ {organizer, vendor}`).
* Logs sin PII (SEC-02).
* `Quote.total` y datos financieros protegidos del payload.

### Testing Architecture

* Vitest + Supertest.
* Reuso del harness de US-068/US-069.
* Sin Playwright/Axe.

---

## 6. Functional Interpretation

| Acceptance Criterion              | Technical Interpretation                                                                                                          | Impacted Layer(s)               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC-01 — Emisión bilateral         | Loop por recipient. 4 INSERTs + 2 `[EMAIL]` (recipients distintos) o 2 INSERTs + 1 `[EMAIL]` (self-notification).                | Backend, Database, Observability |
| AC-02 — Idempotencia por recipient | SELECT independiente por recipient.                                                                                                | Backend, Database                |
| AC-03 — Aislamiento               | Guard + test 2 parejas.                                                                                                            | Backend, Security                |
| AC-04 — Idioma por recipient      | `resolveLanguageCode` invocado 2×.                                                                                                | Backend                          |
| AC-05 — Observabilidad + no-PII   | Log estructurado con campos permitidos por recipient.                                                                             | Observability, Security          |
| AC-06 — Rollback ante fallo       | Reuso tx del use case.                                                                                                            | Backend, Database                |
| AC-07 — Defensa                    | Guards por recipient + guards globales (status, event).                                                                            | Backend                          |
| AC-08 — Dedup self-notification   | Comparación `event.owner_id == vendor_profile.user_id` antes del loop → 1 recipient.                                              | Backend                          |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo principal: `notifications` (handler + resolver extension).
* Módulo `booking-intent`: modificar `ConfirmBookingIntentUseCase` para invocar el handler.

### Use Cases / Application Services

* `OnBookingConfirmedHandler`:
  * Input: `{ bookingIntent, quote, quoteRequest, event, vendorProfile, correlationId, tx: PrismaTransaction }`.
  * Pasos:
    1. Guards globales: `bookingIntent.status='confirmed_intent'`, `event` existe.
    2. Construir `recipients = dedupByUserId([{ userId: event.owner_id, role: 'organizer' }, { userId: vendorProfile.user_id, role: 'vendor' }])`. Si `event.owner_id == vendorProfile.user_id`, el resultado es 1 recipient con `role='organizer'` (rol prioritario, D7).
    3. Para cada recipient:
       * Guard: `User(recipient.userId).status != 'deactivated'` → si falla, skip + log warn (parcial).
       * Idempotencia: `NotificationRepository.existsBookingConfirmedForRecipient(recipient.userId, bookingIntent.id, { tx })` → si `true`, skip.
       * `language_code = UserRepository.resolveLanguageCode(recipient.userId, event.language_code)` con fallback `en`.
       * `payload = { bookingIntentId, quoteId, quoteRequestId, eventId, vendorProfileId }`.
       * `link = NotificationLinkResolver.resolve({ type: 'booking_confirmed', payload }, { recipientRole: recipient.role })`.
       * INSERT `Notification(user_id=recipient.userId, type='booking_confirmed', channel='in_app', payload, language_code, link)`.
       * INSERT `Notification(...same..., channel='email_simulated')`.
       * `SimulatedEmailAdapter.logEmail({ to: recipient.userId, subject: T(locale, 'notif.bookingConfirmed.'+recipient.role+'.subject'), body: T(locale, 'notif.bookingConfirmed.'+recipient.role+'.body'), correlationId, locale })`.

* Modificación a `ConfirmBookingIntentUseCase` (US-061): dentro de `prisma.$transaction`, tras persistir la transición a `confirmed_intent` y actualizar `BudgetItem.committed`, invocar el handler.

### Controllers / Routes

`No aplica`.

### DTOs / Schemas

* `Notification.payload` para `type='booking_confirmed'`:
  ```ts
  z.object({
    bookingIntentId: z.string().uuid(),
    quoteId: z.string().uuid(),
    quoteRequestId: z.string().uuid(),
    eventId: z.string().uuid(),
    vendorProfileId: z.string().uuid(),
  })
  ```

### Repository / Persistence

* `NotificationRepository.existsBookingConfirmedForRecipient(recipientUserId, bookingIntentId, opts?: { tx })`:
  ```sql
  SELECT 1 FROM notifications
  WHERE user_id = $1 AND type = 'booking_confirmed' AND payload->>'booking_intent_id' = $2
  LIMIT 1
  ```
* `NotificationRepository.create` reusado con `tx`.

### Validation Rules

* VR-01..VR-04 en el handler.

### Error Handling

* Errores del handler propagan a la tx del use case → rollback.
* Guards defensivos NO propagan: log warn + return (por recipient para skip parcial, global para skip completo).

### Transactions

* Toda la operación comparte la tx del `ConfirmBookingIntentUseCase`.

### Observability

* `correlationId` heredado del request; fallback `req-booking-confirmed-<uuid>`.
* Log `[EMAIL]` por recipient exitoso.
* Log `warn` por skip defensivo con `reason, recipientRole?`.
* Log `info` por dedup self-notification (`event.owner_id == vendor_profile.user_id`).

---

## 8. Frontend Technical Design

`No aplica`.

---

## 9. API Contract Design

`No aplica` — handler interno.

---

## 10. Database / Prisma Design

### Models Impacted

| Model         | Operación | Detalle                                                    |
| ------------- | --------- | ---------------------------------------------------------- |
| Notification  | INSERT    | 2 filas por recipient (2 o 4 total).                        |
| Notification  | SELECT    | Idempotencia por recipient.                                 |
| BookingIntent | SELECT    | Ya cargado por US-061.                                      |
| Quote / QuoteRequest / Event / VendorProfile | SELECT | Ya cargados; reuso.                              |
| User          | SELECT    | `language_preference`, `status` por recipient.              |

### Fields / Columns

Sin cambios.

### Relations

Sin cambios. Relación con `BookingIntent` vive en `payload.bookingIntentId`.

### Indexes

Reuso.

### Constraints

Sin cambios.

### Migrations Impact

**Cero migraciones.**

### Seed Impact

* BR-SEED-006 exige al menos 1 `BookingIntent.confirmed_intent` en seed. Al bootstrap, el handler emite las notifs automáticamente.

---

## 11. AI / PromptOps Design

`No aplica`.

---

## 12. Security & Authorization Design

### Authentication

* Handler dentro del use case autenticado (US-061).

### Authorization

* Sistema.

### Ownership Rules

* `Notification.user_id ∈ {event.owner_id, vendor_profile.user_id}`; guard interno.

### Role Rules

* Handler invocado sólo por `ConfirmBookingIntentUseCase`, que requiere rol vendor con `VendorProfile.status='approved'`.

### Negative Authorization Scenarios

* Guards defensivos (D7).

### Audit Requirements

* No requiere `AdminAction` (BR-BOOKING-008 puede requerirlo pero es alcance US-061).

### Sensitive Data Handling

* Log permitido: `userId, bookingIntentId, quoteId, quoteRequestId, eventId, vendorProfileId, correlationId, recipientRole?`.
* Prohibido: `email, displayName, quote total/breakdown, brief, event notes, vendor name`.

---

## 13. Testing Strategy

### Unit Tests

* UT-01: guards globales (status inválido, event ausente) → skip.
* UT-02: idempotencia por recipient (uno ya existe, otro no).
* UT-03: resolución de idioma per recipient (3 casos × 2 recipients).
* UT-04: `NotificationLinkResolver.resolve` con `recipientRole` para `booking_confirmed` → URL correcta por rol.
* UT-05: payload correcto (5 campos).
* UT-06: dedup self-notification (`event.owner_id == vendor_profile.user_id` → 1 recipient con rol `organizer`).
* UT-07: skip parcial por recipient `deactivated`.

### Integration Tests

* IT-01: BookingIntent válido pasa a `confirmed_intent` → 4 filas `notifications` (2 organizer + 2 vendor) + 2 `[EMAIL]`.
* IT-02: Segundo intento con mismo `booking_intent_id` no crea duplicados por recipient.
* IT-03: Aislamiento con 2 parejas.
* IT-04: Idioma per recipient con locales distintos.
* IT-05: Fallo mock del INSERT → rollback (`booking_intent.status` no cambia; `BudgetItem.committed` no cambia).
* IT-06: `booking_intent.status='pending'` recibido por handler → skip + warning.
* IT-07: Log estructurado sin PII.
* IT-08: Self-notification → 2 filas + 1 `[EMAIL]`.
* IT-09: Vendor `deactivated` → sólo organizer recibe; vendor skip con warn.

### Security Tests

* SEC-T-01: parser log verifica claves permitidas por recipient.
* SEC-T-02: aislamiento (cubierto por IT-03, `@security`).

### E2E Tests

`No aplica`.

### AI Tests / Accessibility Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01: tras seed (BR-SEED-006), organizer demo y vendor demo tienen notif `booking_confirmed`.

### CI Checks

* Lint, type-check, tests. Cobertura ≥ 50%.

---

## 14. Observability & Audit

### Logs

* `[EMAIL]` por recipient exitoso (NFR-OBS-004).
* `warn` por skip defensivo con `reason, recipientRole?`.
* `info` por dedup self-notification.

### Correlation ID

* Heredado del request de US-061.

### AdminAction

`No aplica`.

### Error Tracking

* Errores fatales al middleware estándar.

### Metrics

* Sin métricas dedicadas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reuso del seed de US-061 + BR-SEED-006 (al menos 1 `confirmed_intent`).

### Demo Scenario Supported

* Login como organizer demo → notif `booking_confirmed`. Login como vendor demo → notif `booking_confirmed`.

### Reset / Isolation Notes

* Sin cambios al `SeedResetJob`.

---

## 16. Documentation Alignment Required

| Document / Source                                | Conflict                                                                                          | Current Decision                                                                          | Recommended Action                                                                                                                       | Blocks Implementation? |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| PB-P2-007 `Description`                          | Dice "Organizer recibe notificación"; FR-BOOKING-010 exige ambos.                                  | Both (D6).                                                                                | Corregir `Description` en el backlog.                                                                                                    | No                     |
| `docs/16 §34.3` (tabla `link generation by type`) | Falta fila `booking_confirmed` con dispatch por rol.                                                | D3 extiende la tabla.                                                                     | Agregar fila con lógica por rol y ejemplo de firma extendida del resolver `{recipientRole}`.                                             | No                     |
| PB-P2-007 Traceability                            | Falta enumerar `FR-BOOKING-010, UC-BOOKING-002, BR-BOOKING-002/003, BR-NOTIF-*`.                    | US-070 refinada declara IDs canónicos.                                                    | Ampliar Traceability.                                                                                                                    | No                     |
| `docs/14 §Notifications`                         | Sin `OnBookingConfirmedHandler`.                                                                    | Handler in-tx (D1).                                                                       | Documentar.                                                                                                                              | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                     | Impact                                                    | Mitigation                                                                                                                       |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Fallo del handler in-tx aborta el `confirmed_intent` y la actualización de `BudgetItem.committed`         | Vendor no puede confirmar; rollback en cascada             | Riesgo aceptado (consistencia). Future: outbox pattern.                                                                          |
| Firma extendida del `NotificationLinkResolver` rompe callers existentes                                   | Regresión en US-068/US-069/US-071                          | Parámetro `{recipientRole}` opcional; tests de regresión sobre otros tipos.                                                       |
| Filtro `payload->>'booking_intent_id'` lento                                                              | SELECT lento                                              | Selectividad por `user_id+type`; PERF opcional.                                                                                   |
| `language_preference` faltante en cualquier recipient                                                    | Fallback ladder                                            | UT-03 cubre.                                                                                                                       |
| Self-notification en seed no-realista                                                                     | Prueba de escritorio distorsiona demo                     | UT-06 e IT-08 cubren; producción demo evita el caso.                                                                              |
| Cambio de rutas frontend rompe `link` por rol                                                             | Deep link roto por rol                                     | Centralizado en `LINK_STRATEGY_BY_TYPE`; contract test verifica ambos paths.                                                       |
| Copy diferente por rol duplica catálogos i18n                                                             | Mantenimiento de i18n mayor                               | Estructura `notif.bookingConfirmed.<role>.<key>` × 4 locales; CI check falla si falta.                                            |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas impactados

```
backend/
  src/
    modules/
      notifications/
        application/
          handlers/
            on-booking-confirmed.handler.ts             # nuevo
            on-booking-confirmed.handler.spec.ts        # nuevo
          services/
            notification-link-resolver.ts                # extender (firma + fila booking_confirmed)
        infrastructure/
          repositories/
            notification.repository.ts                   # agregar existsBookingConfirmedForRecipient
        i18n/
          notifications.booking-confirmed.organizer.<locale>.json  # 4 locales
          notifications.booking-confirmed.vendor.<locale>.json     # 4 locales
      booking-intent/
        application/
          use-cases/
            confirm-booking-intent.use-case.ts           # extender para invocar el handler
tests/
  integration/
    notifications-booking-confirmed.spec.ts              # IT-01..IT-09
    notifications-no-pii-log-booking-confirmed.spec.ts   # SEC-T-01
```

### Orden de implementación recomendado

1. Extender `NotificationLinkResolver` con firma `{ recipientRole }` y fila `booking_confirmed`. Verificar retrocompatibilidad con tests existentes de US-068/US-069/US-071.
2. Extender `NotificationRepository.existsBookingConfirmedForRecipient`.
3. Catálogos i18n × 4 locales × 2 roles.
4. Implementar `OnBookingConfirmedHandler` con dedup + guards + loop por recipient.
5. Extender `ConfirmBookingIntentUseCase` para invocar el handler.
6. UT-01..UT-07.
7. IT-01..IT-09.
8. SEC-T-01.
9. Documentation Alignment.

### Decisiones que no deben reabrirse

* D1 in-tx, D2 SELECT/INSERT por recipient, D3 payload+link con dispatch, D4 surface Out of Scope, D5 idioma per recipient, D6 recipients bilaterales, D7 defensa + dedup self-notification.

### Lo que no se debe implementar

* Event bus, endpoint nuevo, frontend, migración, retry asincrónico.
* Notif de creación/cancelación de BookingIntent (Future US).
* Modificaciones a `BudgetItem.committed` (US-061).

### Asunciones a preservar

* MVP single-process, `SimulatedEmailAdapter`, `NotificationLinkResolver`, `resolveLanguageCode` disponibles.
* Firma del `NotificationLinkResolver` con `{recipientRole}` opcional para retrocompatibilidad.

---

## 19. Task Generation Notes

### Suggested task groups

1. Backend — foundations (repository ext + resolver ext + i18n × 2 roles).
2. Backend — handler.
3. Backend — integration en `ConfirmBookingIntentUseCase`.
4. Testing UT + IT (con casos multi-recipient y self-notification).
5. Security — SEC-T-01.
6. Documentation Alignment (4 ítems).

### Required QA tasks

* UT + IT + dedup self-notification + regresión no-PII + regresión del resolver.

### Required security tasks

* Aislamiento + no-PII.

### Required seed/demo tasks

* Reuso.

### Required documentation tasks

* 4 ítems.

### Dependencies between tasks

```
Resolver ext (retrocompatible) → tests de regresión US-068/US-069/US-071
Repository ext + i18n → Handler → Wiring en ConfirmBookingIntentUseCase → IT
```

### Consolidated tasks.md guidance

Opcional: PB-P2-007 tiene una sola US.

---

## 20. Technical Spec Readiness

| Check                                                    | Status |
| -------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                            | Pass   |
| Decision Resolution reviewed if present                  | Pass   |
| Scope clear                                              | Pass   |
| Architecture alignment clear                             | Pass   |
| API impact clear                                         | N/A    |
| DB impact clear                                          | Pass   |
| AI impact clear                                          | N/A    |
| Security impact clear                                    | Pass   |
| Testing strategy clear                                   | Pass   |
| Ready for Development Task Breakdown                     | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

D1–D7 materializadas. Reuso máximo (SimulatedEmailAdapter, NotificationLinkResolver extendido, resolveLanguageCode). Sin migración/endpoint/frontend. 4 alineaciones documentales no bloqueantes. Riesgo de regresión en el resolver mitigado por parámetro opcional retrocompatible.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-007/US-070-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-007
Execution Order: 7 (séptimo ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-007, P2, posición 1 de 1).
Decision Resolution artifact used: Yes.
Documentation alignment warnings: 4 ítems no bloqueantes (§16).
