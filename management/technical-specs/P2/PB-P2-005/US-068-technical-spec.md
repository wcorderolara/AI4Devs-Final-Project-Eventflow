# Technical Specification — US-068: Recibir aviso in-app de nueva QuoteRequest

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-068                                                                                              |
| Source User Story                    | `management/user-stories/US-068-inapp-notification-new-quote-request.md`                            |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-068-decision-resolution.md`                        |
| Priority                             | P2                                                                                                  |
| Backlog ID                           | PB-P2-005                                                                                           |
| Backlog Title                        | Notificación de QuoteRequest creada · `Vendor recibe aviso in-app + email simulado`                  |
| Backlog Execution Order              | 5 (quinto ítem de P2)                                                                               |
| User Story Position in Backlog Item  | 1 de 1                                                                                              |
| Related User Stories in Backlog Item | US-068                                                                                              |
| Epic                                 | EPIC-NOT-001                                                                                        |
| Backlog Item Dependencies            | PB-P1-030 (`CreateQuoteRequestUseCase` de US-049, entregada)                                        |
| Feature                              | Emitir notificación in-app y email simulado al vendor al crear QuoteRequest                          |
| Module / Domain                      | Notifications                                                                                       |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-06                                                                                          |
| Last Updated                         | 2026-07-06                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-005 — Notificación de QuoteRequest creada** (P2, Should Have). Depende de PB-P1-030 (US-049) que crea la `QuoteRequest`. US-068 formaliza el handler que emite la notificación descrita en el paso 6 de `UC-QUOTE-001` (`docs/8 §3070`).

### Execution Order Rationale

US-068 se implementa después de US-049 (upstream: `CreateQuoteRequestUseCase`), en paralelo con US-072 (mark-as-read cross-role) si conviene. Puede reutilizar `SimulatedEmailAdapter` de US-034 y `NotificationLinkResolver` de US-071 sin cambios estructurales.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
| ---------- | -------------------- | --------------- |
| US-068     | Emisor único          | 1               |

---

## 3. Executive Technical Summary

Implementar `OnQuoteRequestCreatedHandler` en el módulo `notifications` e invocarlo sincrónicamente desde `CreateQuoteRequestUseCase` (US-049) dentro de la misma transacción Prisma. Por cada `QuoteRequest` persistida con `VendorProfile.status='approved'`:

1. Verificar idempotencia mediante `SELECT 1 FROM notifications WHERE user_id=$1 AND type='quote_request_received' AND payload->>'quote_request_id'=$2 LIMIT 1`.
2. Si no existe:
   - INSERT `Notification(user_id=vendor.user_id, type='quote_request_received', channel='in_app', payload={quoteRequestId, eventId, organizerId, categoryCode}, language_code=<resolved>)`.
   - INSERT `Notification(...same..., channel='email_simulated')`.
   - Invocar `SimulatedEmailAdapter.logEmail({ to, subject, body, correlationId, locale })`.

Ante fallo del INSERT, la transacción del use case rollea y el caller recibe 500. Sin migración. Reuso de `NotificationRepository`, `SimulatedEmailAdapter` (US-034), `NotificationLinkResolver` (US-071) — este último extendido con la fila `quote_request_received`.

---

## 4. Scope Boundary

### In Scope

* Backend: `OnQuoteRequestCreatedHandler`, extensión de `NotificationRepository`, catálogos i18n para `quote_request_received`, extensión del `NotificationLinkResolver` (tabla D3 US-071).
* Testing: TS-01..TS-07 + NT-01..NT-04 + AUTH-TS-01 + regresión no-PII.
* Documentation Alignment: 3 ítems.

### Out of Scope

* Surface UI vendor (Future US no listada).
* Mark-as-read (US-072).
* Endpoints nuevos.
* Push/SMS/WhatsApp (BR-NOTIF-006).
* Event bus / outbox pattern (Future, requiere ADR).
* Retry asincrónico diferido.
* Cambios de schema Prisma.

### Explicit Non-Goals

* Modificar `CreateQuoteRequestUseCase` más allá de invocar el handler.
* Introducir columna `Notification.quote_request_id` (relación vive en `payload`).
* Cambiar el enum `notification_type` (`quote_request_received` ya existe).

---

## 5. Architecture Alignment

### Backend Architecture

* Módulo `notifications` (`docs/14 §443`) aloja el handler.
* Módulo `quote-flow` (`docs/14 §440`) invoca el handler desde `CreateQuoteRequestUseCase`.
* Reuso de `SimulatedEmailAdapter` (US-034), `NotificationRepository`, `UserRepository.resolveLanguageCode` (US-034), `NotificationLinkResolver` (US-071).
* Sin event bus / outbox (`docs/14 §23.1`).

### Frontend Architecture

`No aplica` — sin componentes frontend.

### Database Architecture

* Sólo `notifications` (INSERTs) + lectura de `vendor_profiles`, `users`, `events`.
* Reuso de índices existentes.
* Sin migración.

### API Architecture

`No aplica` — handler interno. Consumo canonical `GET /api/v1/notifications`.

### AI / PromptOps Architecture

`No aplica`.

### Security Architecture

* Handler ejecuta como sistema dentro del use case autenticado (US-049 valida sesión de organizer).
* Aislamiento BR-NOTIF-005 verificado por guard interno.
* Logs sin PII (SEC-02).

### Testing Architecture

* Vitest + Supertest (backend).
* Reuso del harness de US-034 (`Clock` para timestamps si aplica).
* Sin Playwright/Axe (sin UI).

---

## 6. Functional Interpretation

| Acceptance Criterion                        | Technical Interpretation                                                                                                          | Impacted Layer(s)               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| AC-01 — Emisión correcta                    | Handler in-tx. 2 INSERTs + 1 log `[EMAIL]` con `correlationId` y `payload` completo.                                              | Backend, Database, Observability |
| AC-02 — Idempotencia                        | SELECT antes de INSERT en la misma tx.                                                                                            | Backend, Database                |
| AC-03 — Aislamiento                         | Guard `notification.user_id = VendorProfile.user_id`; test 2 vendors.                                                            | Backend, Security                |
| AC-04 — Idioma resuelto                     | `UserRepository.resolveLanguageCode(vendorUserId, event.language_code)`.                                                          | Backend                          |
| AC-05 — Observabilidad + no-PII             | Log estructurado con set exacto de campos.                                                                                        | Observability, Security          |
| AC-06 — Rollback ante fallo                 | Reuso de la tx Prisma del use case.                                                                                               | Backend, Database                |
| AC-07 — Defensa vendor no-approved          | Guard defensivo `if vendor.status !== 'approved' → log warn + skip`.                                                              | Backend                          |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo principal: `notifications`. Alberga `OnQuoteRequestCreatedHandler`.
* Módulo `quote-flow` (`docs/14 §440`) modifica `CreateQuoteRequestUseCase` (US-049) para invocar el handler.

### Use Cases / Application Services

* `OnQuoteRequestCreatedHandler`:
  * Input: `{ quoteRequest, vendorProfile, event, correlationId, tx: PrismaTransaction }`.
  * Pasos:
    1. Guards: `vendor.status='approved'` (D6), `vendor.user_id` no nulo, `user.status != 'deactivated'`.
    2. Si guard falla → log warn estructurado, return sin abortar.
    3. Idempotencia: `NotificationRepository.existsQuoteRequestReceivedForQR(vendorUserId, quoteRequestId, { tx })` → si `true`, skip silencioso.
    4. Resolver `language_code = UserRepository.resolveLanguageCode(vendorUserId, event.language_code)` con fallback final `en`.
    5. Construir `payload = { quoteRequestId, eventId, organizerId, categoryCode }`.
    6. `NotificationRepository.create({ user_id: vendorUserId, type: 'quote_request_received', channel: 'in_app', payload, language_code }, { tx })`.
    7. `NotificationRepository.create({ ...same, channel: 'email_simulated' }, { tx })`.
    8. `SimulatedEmailAdapter.logEmail({ to: vendorUserId, subject: T(locale, 'notif.qrReceived.subject', { categoryCode }), body: T(locale, 'notif.qrReceived.body', { categoryCode }), correlationId, locale })`.

* Modificación a `CreateQuoteRequestUseCase` (US-049): tras persistir la QR dentro de `prisma.$transaction(async tx => { ... })`, invocar `handler({ quoteRequest, vendorProfile, event, correlationId, tx })`.

### Controllers / Routes

`No aplica`.

### DTOs / Schemas

* `Notification.payload` (jsonb) para `type='quote_request_received'`:
  ```ts
  z.object({
    quoteRequestId: z.string().uuid(),
    eventId: z.string().uuid(),
    organizerId: z.string().uuid(),
    categoryCode: z.string(), // enum ServiceCategoryCode
  })
  ```

### Repository / Persistence

* `NotificationRepository.existsQuoteRequestReceivedForQR(vendorUserId, quoteRequestId, opts?: { tx })`:
  ```sql
  SELECT 1 FROM notifications
  WHERE user_id = $1 AND type = 'quote_request_received' AND payload->>'quote_request_id' = $2
  LIMIT 1
  ```
* `NotificationRepository.create` reusado con parámetro `tx` opcional.

### Validation Rules

* VR-01, VR-02, VR-03 aplicadas en el handler.

### Error Handling

* Errores del handler propagan a la tx del use case → rollback.
* Guards (vendor no-approved, user desactivado, user_id null) NO propagan: log warn + return.

### Transactions

* Toda la operación del handler comparte la tx del `CreateQuoteRequestUseCase` (parámetro `tx`).

### Observability

* `correlationId` heredado del request; fallback `req-qr-<uuid>`.
* Log `[EMAIL]` estructurado por invocación exitosa.
* Log `warn` estructurado por skip defensivo (`vendor_not_approved` / `user_deactivated` / `user_id_null`).
* Sin log resumen (US-068 es puntual, no batch como US-034).

---

## 8. Frontend Technical Design

`No aplica`.

---

## 9. API Contract Design

`No aplica` — handler interno. El vendor consume las notifs vía `GET /api/v1/notifications` canonical (US-071 ampliado documentó el contrato).

---

## 10. Database / Prisma Design

### Models Impacted

| Model         | Operación | Detalle                                                                              |
| ------------- | --------- | ------------------------------------------------------------------------------------ |
| Notification  | INSERT    | 2 filas por QR (in_app + email_simulated).                                          |
| Notification  | SELECT    | Chequeo de idempotencia.                                                              |
| VendorProfile | SELECT    | Ya cargado por el use case (US-049); reuso.                                          |
| User          | SELECT    | Reuso para `language_preference` y `status`.                                         |
| Event         | SELECT    | Ya cargado por el use case; reuso `event.language_code`.                             |

### Fields / Columns

Sin cambios.

### Relations

Sin cambios. La relación `Notification ↔ QuoteRequest` vive en `payload.quoteRequestId` (patrón consistente con `docs/18 §18.1`).

### Indexes

Sin índice nuevo. Reuso de `idx_notifications_user_status_sent`.

### Constraints

Sin cambios.

### Migrations Impact

**Cero migraciones en US-068.**

### Seed Impact

* Reuso del seed de US-049: crear una `QuoteRequest` demo al bootstrap del seed dispara automáticamente los `Notification` correspondientes vía el handler.
* Alternativa (recomendada): asegurar que el seed incluye al menos 1 QR demo al vendor demo (`u_demo_vendor_1`); ya cubierto por US-145.

---

## 11. AI / PromptOps Design

`No aplica`.

---

## 12. Security & Authorization Design

### Authentication

* Handler dentro del use case autenticado (US-049 valida sesión de organizer).

### Authorization

* Sistema.
* `NotificationOwnerPolicy` no aplica al handler (sólo al consumo, US-071 canonical).

### Ownership Rules

* `Notification.user_id = VendorProfile.user_id`; guard interno.

### Role Rules

* Handler invocado sólo por `CreateQuoteRequestUseCase`, que requiere rol `organizer` (BR-QUOTE-001).

### Negative Authorization Scenarios

* Guard `vendor.status != 'approved'` → log warn + skip (defensa en profundidad).
* Guard `user.status = 'deactivated'` → skip.
* Guard `vendor.user_id = null` → skip.

### Audit Requirements

* No requiere `AdminAction`.

### Sensitive Data Handling

* Log estructurado permitido: `userId, quoteRequestId, eventId, categoryCode, correlationId`.
* Prohibido: `email, displayName, brief content, event notes, vendor name`.
* Test de regresión no-PII obligatorio.

---

## 13. Testing Strategy

### Unit Tests

* UT-01: guards con vendor no-approved / user_deactivated / user_id null → skip + warn.
* UT-02: idempotencia detectada por SELECT → skip.
* UT-03: resolución de `language_code` con los 3 casos del fallback ladder (D5).
* UT-04: `NotificationLinkResolver.resolve` para `quote_request_received` → URL correcta.
* UT-05: payload correcto (4 campos exactos).

### Integration Tests

* IT-01 (Supertest desde el endpoint `POST /api/v1/quote-requests` que invoca el use case): QR válida crea 2 filas `notifications` con `type='quote_request_received'` para el vendor destinatario + 1 entrada `[EMAIL]`. AC-01.
* IT-02: Segundo intento con la misma QR persistida no crea duplicados (AC-02).
* IT-03: Aislamiento con 2 vendors distintos (AC-03).
* IT-04: 3 casos de idioma (AC-04).
* IT-05: Fallo mock del segundo INSERT → rollback: QR no persistida (AC-06).
* IT-06: Vendor `pending_approval` (defensa): handler skip + warning; QR persiste (AC-07).
* IT-07: Log estructurado con set exacto de campos, sin PII (AC-05).

### API Tests

Cubiertos por IT.

### E2E Tests

`No aplica` — sin UI.

### Security Tests

* SEC-T-01: parser del log verifica claves permitidas.
* SEC-T-02: aislamiento BR-NOTIF-005 (cubierto por IT-03; etiquetado `@security`).

### Accessibility Tests

`No aplica`.

### AI Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01: tras seed, el vendor demo tiene notif `quote_request_received` por la QR seed.

### CI Checks

* Lint, type-check, tests.
* Cobertura del módulo `notifications` ≥ 50% (PB-P2-014).

---

## 14. Observability & Audit

### Logs

* Log `[EMAIL]` estructurado por invocación exitosa (NFR-OBS-004).
* Log `warn` por skip defensivo con `reason` (`vendor_not_approved | user_deactivated | user_id_null`).

### Correlation ID

* Heredado del request de `CreateQuoteRequestUseCase`.

### AdminAction

`No aplica`.

### Error Tracking

* Errores fatales propagan al middleware estándar.

### Metrics

* Sin métricas dedicadas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reuso del seed de US-049. Cuando el seed crea una QR demo, el handler emite las notifs automáticamente.

### Demo Scenario Supported

* Login como vendor demo → visualizar las notifs `quote_request_received` mediante el consumo canonical (Future bandeja vendor).

### Reset / Isolation Notes

* Sin cambios al `SeedResetJob`.

---

## 16. Documentation Alignment Required

| Document / Source                                | Conflict                                                                | Current Decision                                                            | Recommended Action                                                                       | Blocks Implementation? |
| ------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| `docs/16 §34.3` (tabla `link generation by type`) | Falta fila `quote_request_received`.                                    | D3 US-068 extiende la tabla iniciada en US-071.                              | Agregar fila `quote_request_received → /vendor/quote-requests/{quoteRequestId}`.        | No                     |
| PB-P2-005 Traceability                            | Sólo `FR-NOTIF-001 · BR-NOTIF-001`.                                    | US-068 refinada declara IDs canónicos completos.                            | Ampliar Traceability del backlog item.                                                   | No                     |
| `docs/14 §Notifications`                           | Sin documentación del handler.                                          | Handler in-tx (D1).                                                          | Documentar `OnQuoteRequestCreatedHandler` y su patrón in-tx.                             | No                     |
| EPIC-NOT-001 (backlog)                             | Falta US "bandeja vendor" (surface genérico).                            | D4 documenta gap para Future.                                                | Considerar creación de US futura simétrica a US-071 para vendor.                         | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                     | Impact                                                     | Mitigation                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Fallo del handler in-tx aborta la QR                                                     | El organizer no puede enviar la QR                          | Riesgo aceptado (consistencia prioritaria en MVP). Alternativa Future: outbox pattern.                                            |
| Retries HTTP del caller crean nuevas QRs (nuevo `quote_request_id`) y por lo tanto nuevas notifs | Duplicación aparente en la bandeja                        | El caller HTTP debe manejar idempotencia a nivel request (fuera del alcance de US-068). En demo, el organizer manual no reintenta. |
| Filtro `payload->>'quote_request_id'` sin índice físico                                  | SELECT de idempotencia lento con dataset grande             | Filtro `user_id` + `type` primario cubre selectividad; PERF test opcional.                                                       |
| `language_preference` faltante en múltiples users                                        | Fallback ladder se usa siempre                              | UT-03 cubre; `en` como último fallback garantiza salida.                                                                          |
| Guard vendor no-approved dispara falso positivo                                          | Notif no emitida cuando debería                             | UT-01 cubre los 3 casos; alineado con UC-QUOTE-001 E3 upstream.                                                                   |
| Locale del vendor cambia mid-request                                                     | Log en locale distinto al persistido                        | Resolución snapshot al momento del handler; no impacta datos.                                                                     |

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
            on-quote-request-created.handler.ts        # nuevo
            on-quote-request-created.handler.spec.ts   # nuevo
          services/
            notification-link-resolver.ts               # extender (fila quote_request_received)
        infrastructure/
          repositories/
            notification.repository.ts                  # agregar existsQuoteRequestReceivedForQR
        i18n/
          notifications.quote-request-received.<locale>.json  # 4 locales
      quote-flow/
        application/
          use-cases/
            create-quote-request.use-case.ts            # extender para invocar el handler
tests/
  integration/
    notifications-quote-request-received.spec.ts        # IT-01..IT-07
    notifications-no-pii-log.spec.ts                    # SEC-T-01
```

### Orden de implementación recomendado

1. Extender `NotificationRepository.existsQuoteRequestReceivedForQR`.
2. Extender `NotificationLinkResolver` con `quote_request_received`.
3. Catálogos i18n en 4 locales (`en`, `es-LATAM`, `es-ES`, `pt`).
4. Implementar `OnQuoteRequestCreatedHandler` con guards + idempotencia + INSERTs + log.
5. Extender `CreateQuoteRequestUseCase` para invocar el handler dentro de su tx.
6. UT-01..UT-05.
7. IT-01..IT-07.
8. SEC-T-01.
9. Documentation Alignment.

### Decisiones que no deben reabrirse

* In-transaction (D1).
* SELECT/INSERT idempotency (D2).
* Payload + link (D3).
* Surface Out of Scope (D4).
* Fallback ladder idioma (D5).
* Skip + warn ante vendor no-approved (D6).

### Lo que no se debe implementar

* Event bus / outbox.
* Endpoint nuevo.
* Frontend.
* Migración.
* Retry asincrónico.
* Cambios de enum `notification_type`.

### Asunciones a preservar

* MVP single-process (`docs/14 §23.1`).
* `SimulatedEmailAdapter` existe (US-034).
* `NotificationLinkResolver` existe (US-071) y es extensible.
* `UserRepository.resolveLanguageCode` existe (US-034); acepta fallback como parámetro.

---

## 19. Task Generation Notes

### Suggested task groups

1. **Backend — foundations**: repository extension + resolver extension + catálogos i18n.
2. **Backend — handler**: `OnQuoteRequestCreatedHandler`.
3. **Backend — integration**: modificar `CreateQuoteRequestUseCase` para invocar el handler.
4. **Testing — UT + IT**.
5. **Security — SEC-T-01 no-PII**.
6. **Documentation Alignment**.

### Required QA tasks

* UT + IT + regresión no-PII.

### Required security tasks

* Aislamiento + no-PII.

### Required seed/demo tasks

* Reuso; sin tareas propias.

### Required documentation tasks

* 3 ítems (`docs/16 §34.3` fila, PB-P2-005 traceability, `docs/14 §Notifications`).

### Dependencies between tasks

```
Repository ext + Resolver ext + i18n → Handler → Wiring en CreateQuoteRequestUseCase → IT
```

### Consolidated tasks.md guidance

Opcional: PB-P2-005 tiene una sola US, no requiere `tasks.md` consolidado.

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

Todas las decisiones D1–D6 quedan materializadas. Reuso máximo de artefactos ya aprobados (SimulatedEmailAdapter, NotificationLinkResolver, UserRepository.resolveLanguageCode). Sin migración, sin endpoints nuevos, sin frontend. 4 alineaciones documentales no bloqueantes.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-005/US-068-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-005
Execution Order: 5 (quinto ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-005, P2, US-068 posición 1 de 1).
Decision Resolution artifact used: Yes.
Documentation alignment warnings: 4 ítems no bloqueantes (§16).
