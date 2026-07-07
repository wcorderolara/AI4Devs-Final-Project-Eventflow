# Technical Specification — US-069: Recibir aviso in-app de nueva Quote

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-069                                                                                              |
| Source User Story                    | `management/user-stories/US-069-inapp-notification-new-quote.md`                                    |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-069-decision-resolution.md`                        |
| Priority                             | P2                                                                                                  |
| Backlog ID                           | PB-P2-006                                                                                           |
| Backlog Title                        | Notificación de Quote enviada · `Organizer recibe aviso in-app + email simulado`                     |
| Backlog Execution Order              | 6 (sexto ítem de P2)                                                                                |
| User Story Position in Backlog Item  | 1 de 1                                                                                              |
| Related User Stories in Backlog Item | US-069                                                                                              |
| Epic                                 | EPIC-NOT-001                                                                                        |
| Backlog Item Dependencies            | PB-P1-031 (US-052 `RespondToQuoteRequestUseCase`, entregada)                                        |
| Feature                              | Emitir notificación in-app y email simulado al organizer cuando el vendor envía Quote                |
| Module / Domain                      | Notifications                                                                                       |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-06                                                                                          |
| Last Updated                         | 2026-07-06                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-006 — Notificación de Quote enviada** (P2, Should Have). Depende de PB-P1-031 (US-052). Formaliza `FR-QUOTE-017` (`docs/9 §475`) y `BR-QUOTE-018` (`docs/4 §332`).

### Execution Order Rationale

Se implementa después de US-052 (upstream ya entregada) y de US-071 (surface aprobada — consume automáticamente el `type='quote_received'`). El patrón es simétrico a US-068 (Ready for Sprint Planning); D1 y D2 se validan durante esta Spec.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
| ---------- | -------------------- | --------------- |
| US-069     | Emisor único          | 1               |

---

## 3. Executive Technical Summary

Implementar `OnQuoteSentHandler` en el módulo `notifications` e invocarlo sincrónicamente desde `RespondToQuoteRequestUseCase` (US-052) dentro de la misma transacción Prisma cuando la `Quote` pasa a `status='sent'`. Por cada Quote:

1. Guards: `quote.status='sent'`, `event.owner_id` no nulo, `User.status != 'deactivated'`, `event` existente.
2. Si guard falla → log warn + skip (defensa; UC-QUOTE-004 upstream lo garantiza).
3. Idempotencia: `SELECT 1 FROM notifications WHERE user_id=$1 AND type='quote_received' AND payload->>'quote_id'=$2 LIMIT 1`.
4. Si no existe:
   - INSERT `Notification(user_id=event.owner_id, type='quote_received', channel='in_app', payload={quoteId, quoteRequestId, eventId, vendorProfileId}, language_code=<resolved>)`.
   - INSERT `Notification(...same..., channel='email_simulated')`.
   - Invocar `SimulatedEmailAdapter.logEmail({ to: event.owner_id, subject: T(locale, 'notif.quoteReceived.subject'), body: T(locale, 'notif.quoteReceived.body'), correlationId, locale })`.

Ante fallo del INSERT, la tx rollea y el caller HTTP recibe 500. Sin migración. Reuso de `NotificationRepository` (extendido con `existsQuoteReceivedForQuote`), `SimulatedEmailAdapter` (US-034), `NotificationLinkResolver` (US-071) — este último extendido con `quote_received → /organizer/quote-requests/{quoteRequestId}/comparator`.

---

## 4. Scope Boundary

### In Scope

* Backend: `OnQuoteSentHandler`, extensión de `NotificationRepository`, catálogos i18n para `quote_received`, extensión del `NotificationLinkResolver`.
* Testing: TS-01..TS-07 + NT-01..NT-04 + AUTH-TS-01 + regresión no-PII.
* Documentation Alignment: 3 ítems.

### Out of Scope

* Surface UI del organizer (US-071 aprobada).
* Mark-as-read (US-072).
* Endpoints nuevos.
* Push/SMS/WhatsApp.
* Event bus / outbox.
* Retry asincrónico.
* Cambios de schema Prisma.

### Explicit Non-Goals

* Modificar `RespondToQuoteRequestUseCase` más allá de invocar el handler.
* Introducir columna `Notification.quote_id`.
* Incluir `vendorDisplayName` en `payload`.

---

## 5. Architecture Alignment

### Backend Architecture

* Módulo `notifications` (`docs/14 §443`).
* Módulo `quote-flow` (`docs/14 §440`) para la modificación en `RespondToQuoteRequestUseCase`.
* Reuso: `SimulatedEmailAdapter` (US-034), `NotificationRepository`, `UserRepository.resolveLanguageCode`, `NotificationLinkResolver`.
* Sin event bus.

### Frontend Architecture

`No aplica`.

### Database Architecture

* Sólo `notifications` (INSERTs) + lectura de `quote_requests, events, users, vendor_profiles`.
* Reuso de índices. Sin migración.

### API Architecture

`No aplica` — handler interno. Consumo vía US-071 canonical.

### AI / PromptOps Architecture

`No aplica`.

### Security Architecture

* Handler como sistema dentro del use case autenticado (US-052 valida sesión de vendor).
* Aislamiento BR-NOTIF-005 (`Notification.user_id = event.owner_id`).
* Logs sin PII (SEC-02).

### Testing Architecture

* Vitest + Supertest.
* Reuso del harness de US-068.
* Sin Playwright/Axe.

---

## 6. Functional Interpretation

| Acceptance Criterion              | Technical Interpretation                                                                                                          | Impacted Layer(s)               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC-01 — Emisión correcta          | Handler in-tx. 2 INSERTs + 1 log `[EMAIL]` con `correlationId` y `payload` correcto.                                              | Backend, Database, Observability |
| AC-02 — Idempotencia              | SELECT antes de INSERT.                                                                                                            | Backend, Database                |
| AC-03 — Aislamiento               | Guard + test 2 organizers.                                                                                                        | Backend, Security                |
| AC-04 — Idioma resuelto           | `UserRepository.resolveLanguageCode(event.owner_id, event.language_code)`.                                                        | Backend                          |
| AC-05 — Observabilidad + no-PII   | Log estructurado con campos permitidos.                                                                                            | Observability, Security          |
| AC-06 — Rollback ante fallo       | Reuso de tx Prisma del use case.                                                                                                   | Backend, Database                |
| AC-07 — Defensa                    | Guard `quote.status='sent'` + `event` existente + `owner_id` + `user.status`.                                                     | Backend                          |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo principal: `notifications` (handler + resolver extension).
* Módulo `quote-flow`: modificar `RespondToQuoteRequestUseCase` para invocar el handler.

### Use Cases / Application Services

* `OnQuoteSentHandler`:
  * Input: `{ quote, quoteRequest, event, correlationId, tx: PrismaTransaction }`.
  * Pasos:
    1. Guards D6 (`quote.status='sent'`, `event` existente, `event.owner_id` no nulo, `owner user.status != 'deactivated'`).
    2. Idempotencia: `NotificationRepository.existsQuoteReceivedForQuote(ownerUserId, quoteId, { tx })`.
    3. `language_code = UserRepository.resolveLanguageCode(ownerUserId, event.language_code)` con fallback `en`.
    4. Construir `payload = { quoteId, quoteRequestId, eventId, vendorProfileId }`.
    5. 2 INSERTs (in_app + email_simulated).
    6. `SimulatedEmailAdapter.logEmail`.

* Modificación a `RespondToQuoteRequestUseCase` (US-052): dentro de `prisma.$transaction`, tras persistir la transición a `sent`, invocar el handler.

### Controllers / Routes

`No aplica`.

### DTOs / Schemas

* `Notification.payload` para `type='quote_received'`:
  ```ts
  z.object({
    quoteId: z.string().uuid(),
    quoteRequestId: z.string().uuid(),
    eventId: z.string().uuid(),
    vendorProfileId: z.string().uuid(),
  })
  ```

### Repository / Persistence

* `NotificationRepository.existsQuoteReceivedForQuote(ownerUserId, quoteId, opts?: { tx })`:
  ```sql
  SELECT 1 FROM notifications
  WHERE user_id = $1 AND type = 'quote_received' AND payload->>'quote_id' = $2
  LIMIT 1
  ```
* `NotificationRepository.create` reusado con parámetro `tx`.

### Validation Rules

* VR-01..VR-04 en el handler.

### Error Handling

* Errores del handler propagan a la tx del use case → rollback.
* Guards defensivos NO propagan: log warn + return.

### Transactions

* Toda la operación comparte la tx del `RespondToQuoteRequestUseCase`.

### Observability

* `correlationId` heredado del request; fallback `req-quote-sent-<uuid>`.
* Log `[EMAIL]` estructurado.
* Log `warn` por skip defensivo con `reason`.
* Sin log resumen (US-069 es puntual).

---

## 8. Frontend Technical Design

`No aplica`.

---

## 9. API Contract Design

`No aplica` — consumo canonical US-071.

---

## 10. Database / Prisma Design

### Models Impacted

| Model         | Operación | Detalle                                                    |
| ------------- | --------- | ---------------------------------------------------------- |
| Notification  | INSERT    | 2 filas por Quote.                                          |
| Notification  | SELECT    | Idempotencia.                                                |
| Quote         | SELECT    | Ya cargado por US-052; reuso.                                |
| QuoteRequest  | SELECT    | Ya cargado por US-052; reuso.                                |
| Event         | SELECT    | Ya cargado por US-052; reuso.                                |
| User          | SELECT    | Reuso para `language_preference` y `status`.                 |

### Fields / Columns

Sin cambios.

### Relations

Sin cambios. Relación `Notification ↔ Quote` vive en `payload.quoteId`.

### Indexes

Reuso de `idx_notifications_user_status_sent`. Sin índice nuevo.

### Constraints

Sin cambios.

### Migrations Impact

**Cero migraciones.**

### Seed Impact

* Reuso del seed de US-052: al bootstrap, crear una Quote demo dispara automáticamente los `Notification`.

---

## 11. AI / PromptOps Design

`No aplica`.

---

## 12. Security & Authorization Design

### Authentication

* Handler dentro del use case autenticado (US-052).

### Authorization

* Sistema.

### Ownership Rules

* `Notification.user_id = event.owner_id`; guard interno.

### Role Rules

* Handler invocado sólo por `RespondToQuoteRequestUseCase`, que requiere rol `vendor` con `VendorProfile.status='approved'`.

### Negative Authorization Scenarios

* Guards defensivos (Q6) evitan emisión ante estados inconsistentes.

### Audit Requirements

* No requiere `AdminAction`.

### Sensitive Data Handling

* Log permitido: `userId, quoteId, quoteRequestId, eventId, correlationId`.
* Prohibido: `email, displayName, brief content, event notes, vendor name, quote total/breakdown`.

---

## 13. Testing Strategy

### Unit Tests

* UT-01: guards (quote.status != 'sent', event ausente, owner deactivated).
* UT-02: idempotencia detectada.
* UT-03: resolución de idioma (3 casos).
* UT-04: `NotificationLinkResolver.resolve` para `quote_received` → URL correcta.
* UT-05: payload correcto (4 campos).

### Integration Tests

* IT-01: Quote válida pasa a `sent` → 2 filas `notifications` + 1 `[EMAIL]`.
* IT-02: Segundo intento con misma `quote_id` no duplica.
* IT-03: Aislamiento con 2 organizers.
* IT-04: 3 casos de idioma.
* IT-05: Fallo mock del segundo INSERT → rollback (Quote no queda `sent`).
* IT-06: Quote con `status='draft'` recibida por handler → skip + warning.
* IT-07: Log estructurado con set exacto, sin PII.

### Security Tests

* SEC-T-01: parser log verifica claves permitidas.
* SEC-T-02: aislamiento (cubierto por IT-03, etiquetado `@security`).

### E2E Tests

`No aplica` — sin UI.

### AI Tests / Accessibility Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01: tras seed, organizer demo tiene notif `quote_received` por Quote seed.

### CI Checks

* Lint, type-check, tests. Cobertura ≥ 50%.

---

## 14. Observability & Audit

### Logs

* `[EMAIL]` estructurado por invocación exitosa.
* `warn` por skip defensivo con `reason`.

### Correlation ID

* Heredado del request de US-052.

### AdminAction

`No aplica`.

### Error Tracking

* Errores fatales al middleware estándar.

### Metrics

* Sin métricas dedicadas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reuso del seed de US-052.

### Demo Scenario Supported

* Login como organizer demo → visualizar notif `quote_received` en la campanita (US-071).

### Reset / Isolation Notes

* Sin cambios al `SeedResetJob`.

---

## 16. Documentation Alignment Required

| Document / Source                                | Conflict                                                                | Current Decision                                                            | Recommended Action                                                                       | Blocks Implementation? |
| ------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| `docs/16 §34.3` (tabla `link generation by type`) | Falta fila `quote_received`.                                             | D3 extiende la tabla iniciada por US-071.                                    | Agregar fila `quote_received → /organizer/quote-requests/{quoteRequestId}/comparator`.  | No                     |
| PB-P2-006 Traceability                             | Falta `FR-QUOTE-017, BR-QUOTE-018, BR-NOTIF-*`.                          | US-069 refinada declara IDs canónicos.                                       | Ampliar Traceability del backlog item.                                                    | No                     |
| `docs/14 §Notifications`                            | Sin `OnQuoteSentHandler`.                                                | Handler in-tx.                                                               | Documentar el handler.                                                                    | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                     | Impact                                                | Mitigation                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Fallo del handler in-tx aborta la Quote                                                  | Vendor no puede enviar Quote                          | Riesgo aceptado (consistencia). Future: outbox.                                                                                   |
| Retries HTTP con nueva `quote_id`                                                         | Nuevas Quotes → nuevas notifs (comportamiento correcto) | US-052 valida "una sola Quote activa por QR" (BR-QUOTE-013).                                                                       |
| Filtro `payload->>'quote_id'` lento                                                       | SELECT lento con dataset grande                        | Selectividad por `user_id+type`; PERF opcional.                                                                                    |
| `language_preference` faltante                                                            | Fallback ladder                                        | UT-03.                                                                                                                             |
| Guard defensivo dispara skip erróneo                                                      | Notif perdida                                          | UT-01 cubre; upstream US-052 lo garantiza.                                                                                         |
| Locale cambia mid-request                                                                 | Log en locale distinto                                 | Snapshot al momento del handler.                                                                                                   |

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
            on-quote-sent.handler.ts                    # nuevo
            on-quote-sent.handler.spec.ts               # nuevo
          services/
            notification-link-resolver.ts               # extender (fila quote_received)
        infrastructure/
          repositories/
            notification.repository.ts                  # agregar existsQuoteReceivedForQuote
        i18n/
          notifications.quote-received.<locale>.json    # 4 locales
      quote-flow/
        application/
          use-cases/
            respond-to-quote-request.use-case.ts        # extender para invocar el handler
tests/
  integration/
    notifications-quote-received.spec.ts                # IT-01..IT-07
    notifications-no-pii-log-quote-received.spec.ts     # SEC-T-01
```

### Orden de implementación recomendado

1. Extender `NotificationRepository.existsQuoteReceivedForQuote`.
2. Extender `NotificationLinkResolver` con `quote_received`.
3. Catálogos i18n en 4 locales.
4. Implementar `OnQuoteSentHandler`.
5. Extender `RespondToQuoteRequestUseCase` para invocar el handler.
6. UT-01..UT-05.
7. IT-01..IT-07.
8. SEC-T-01.
9. Documentation Alignment.

### Decisiones que no deben reabrirse

* D1 in-tx, D2 SELECT/INSERT, D3 payload+link, D4 surface Out of Scope, D5 idioma, D6 defensa.

### Lo que no se debe implementar

* Event bus, endpoint nuevo, frontend, migración, retry asincrónico.

### Asunciones a preservar

* MVP single-process, `SimulatedEmailAdapter` y `NotificationLinkResolver` disponibles, `resolveLanguageCode` acepta fallback.

---

## 19. Task Generation Notes

### Suggested task groups

1. Backend — foundations (repository ext + resolver ext + i18n).
2. Backend — handler.
3. Backend — integration en `RespondToQuoteRequestUseCase`.
4. Testing UT + IT.
5. Security — SEC-T-01.
6. Documentation Alignment.

### Required QA tasks

* UT + IT + regresión no-PII.

### Required security tasks

* Aislamiento + no-PII.

### Required seed/demo tasks

* Reuso.

### Required documentation tasks

* 3 ítems.

### Dependencies between tasks

```
Repository ext + Resolver ext + i18n → Handler → Wiring en RespondToQuoteRequestUseCase → IT
```

### Consolidated tasks.md guidance

Opcional: PB-P2-006 tiene una sola US.

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

D1–D6 materializadas. Reuso máximo (SimulatedEmailAdapter, NotificationLinkResolver, resolveLanguageCode). Sin migración/endpoint/frontend. 3 alineaciones documentales no bloqueantes.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-006/US-069-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-006
Execution Order: 6 (sexto ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-006, P2, posición 1 de 1).
Decision Resolution artifact used: Yes.
Documentation alignment warnings: 3 ítems no bloqueantes (§16).
