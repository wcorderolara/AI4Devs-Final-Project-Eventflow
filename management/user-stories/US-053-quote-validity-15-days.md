# 🧾 User Story: Validez de Quote (default 15 días) y expiración automática

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-053                                                                      |
| Backlog Item       | PB-P1-031 — Vendor visualiza y responde Quote (validez 15 días default)     |
| Epic               | EPIC-QR-001                                                                 |
| Feature            | UX `ValidUntilPicker` + Job `ExpireQuotesJob` con notificación al vendor    |
| Module / Domain    | Quotes                                                                      |
| User Role          | Vendor (UX) / Sistema (Job)                                                  |
| Priority           | Must Have                                                                   |
| Status             | Approved                                                                    |
| Owner              | Product Owner / Business Analyst                                            |
| Sprint / Milestone | MVP                                                                         |
| Created Date       | 2026-06-09                                                                  |
| Last Updated       | 2026-06-27                                                                  |
| Approved By        | PO/BA Review                                                                |
| Approval Date      | 2026-06-27                                                                  |
| Ready for Development Tasks | Yes                                                                 |

---

## 🎯 User Story

**As a** proveedor (UX) y sistema (job)
**I want** un `ValidUntilPicker` accesible con default 15 días en el form de Quote, y un job automático que marque como `expired` las Quotes vencidas notificando al vendor
**So that** los plazos de cotización sean claros para el organizador y el ciclo de vida `Quote → expired` se aplique sin intervención manual (Decisión PO 8.1 #4 + #13)

---

## 🧠 Business Context

### Context Summary

US-053 cierra PB-P1-031 con dos componentes complementarios al envío de Quote de US-052:

1. **UX del `ValidUntilPicker`** (frontend): date picker accesible que pre-rellena `today + 15d` (default), permite editar dentro del rango `[today+1, today+90]` y muestra feedback inline ante valores inválidos.
2. **Job `ExpireQuotesJob`** (backend): cron diario `00:05 UTC` con jitter ±5min que marca como `expired` toda Quote con `status='sent' AND valid_until < CURRENT_DATE` y notifica al vendor (in-app + email_simulated) dentro de la misma transacción de batch.

La regla de negocio (default 15d + rango) ya quedó implementada server-side en US-052 D3; US-053 entrega la UX correspondiente y la automatización del ciclo de vida (FR-QUOTE-009 + BR-QUOTE-016).

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Job `ExpireQuotesJob` in scope US-053. Cumple FR-QUOTE-009 + BR-QUOTE-016.                                                                                                                                                                       |
| D2 | Frecuencia: cron diario `00:05 UTC` con jitter aleatorio ±5min. Reuso del scheduler patrón del job auto-complete event (PB-P1-009).                                                                                                              |
| D3 | Al expirar cada Quote, INSERT 2 rows en `notifications` (`in_app` `delivered` + `email_simulated` `simulated`) al `vendor_profile.user_id`. Payload `{ quote_id, quote_request_id, valid_until }`. Paridad US-049 D6 / US-052 D5.              |
| D4 | Convención del corte: una Quote es válida HASTA el final del día `valid_until` inclusive. El job ejecutado el día `D` marca `expired` las Quotes con `valid_until < D` (al menos `D-1`).                                                       |
| D5 | Idempotencia + batching: query `WHERE status='sent' AND valid_until < CURRENT_DATE`; batch de `100` Quotes por transacción; `SELECT ... FOR UPDATE SKIP LOCKED`; reintento en la próxima ejecución (sin reintento intra-run); métricas + logs. |

### Related Domain Concepts

* `quotes.status='expired'`, `quotes.valid_until`.
* `notifications` (`event='quote.expired'`).
* C-019 (validez default), C-031 (default service layer).
* Scheduler patrón compartido con PB-P1-009 (auto-complete).

### Assumptions

* `valid_until` es `date` (sin hora).
* TZ del job: UTC.
* US-052 ya enforza el rango `[today+1, today+90]` al envío.

### Dependencies

* US-052 (envío de Quote con `valid_until`).
* PB-P0-001 (schema `quotes` + índice `idx_quotes_valid_until_active`).
* Scheduler de PB-P1-009 (job patrón) reusable o paralelo.
* `NotificationSenderPort` reutilizado.

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-005, FR-QUOTE-009                                              |
| Use Case(s)            | UC-QUOTE-004, UC-QUOTE-010                                                |
| Business Rule(s)       | BR-QUOTE-015, BR-QUOTE-016, BR-NOTIF-002, BR-NOTIF-003                  |
| Permission Rule(s)     | Sistema (job sin user context); Assignment para UX vendor                |
| Data Entity / Entities | Quote, Notification                                                       |
| API Endpoint(s)        | Embedded en US-052 (UX); Job sin endpoint público                         |
| NFR Reference(s)       | NFR-OBS-005, NFR-PERF-001                                                |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-QUOTE-015/016, /docs/8 §UC-QUOTE-010, /docs/9 §FR-QUOTE-005/009, /docs/14 §Jobs, /docs/21 §Cron, C-019, C-031 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Extensión de `valid_until` post-envío (Quote inmutable post-`sent` per FR-QUOTE-019).
* Auto-renovación.
* Ejecuciones intra-day del job.
* Email real con SMTP.
* Notificación al organizer por expiración (sólo al vendor en MVP, per BR-NOTIF-002).

### Scope Notes

* Job diario único.
* Convención: válida HASTA el final del día `valid_until`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: `ValidUntilPicker` con default 15d

**Given** vendor abre el form de respuesta de Quote (US-052)
**When** el componente `ValidUntilPicker` se monta
**Then** muestra date picker pre-rellenado con `today + 15d` editable; el rango aceptado en cliente es `[today+1, today+90]`; valor fuera del rango muestra feedback inline accesible.

### AC-02: Job marca Quotes expiradas

**Given** ejecución diaria del job `ExpireQuotesJob` en día `D`
**When** existen N Quotes con `status='sent' AND valid_until < D`
**Then** el job:
- selecciona en batches de 100 con `FOR UPDATE SKIP LOCKED`,
- UPDATE `status='expired'` para cada Quote,
- INSERT 2 `notifications` (`in_app` + `email_simulated`) al vendor por cada Quote,
- emite log estructurado `quote.expired.batch` con `correlation_id`, `count`, `duration_ms`,
- incrementa métrica `quotes.expired.total`.

### AC-03: Job idempotente

**Given** el job ya ejecutó hoy y marcó N Quotes como `expired`
**When** se vuelve a ejecutar manualmente el mismo día
**Then** no se crean Notifications adicionales para esas Quotes (filtro `status='sent'` las excluye); el job termina sin side-effects.

### AC-04: Convención del corte

**Given** una Quote con `valid_until = '2026-07-12'`
**When** el job se ejecuta el `2026-07-12 00:05 UTC`
**Then** la Quote NO se expira (sigue válida hasta fin del día). Cuando el job se ejecuta el `2026-07-13 00:05 UTC`, la Quote se marca `expired`.

---

## ⚠️ Edge Cases

### EC-01: Fallo de Notification en un batch

**Given** el job procesa un batch y `NotificationSenderPort.notify` falla para una Quote
**When** la transacción del batch falla
**Then** rollback del batch completo; log de error; reintento en la próxima ejecución del cron. Las Quotes restantes se procesarán normalmente.

### EC-02: 0 Quotes para expirar

**Given** ejecución sin Quotes vencidas
**When** el job consulta
**Then** termina exitosamente con `count=0`; log `quote.expired.batch count=0`.

### EC-03: Quote ya en `expired`

**Given** Quote `status='expired'` con `valid_until` futuro (caso patológico)
**When** job ejecuta
**Then** no se toca (filtro `status='sent'`).

### EC-04: Quote `accepted` / `rejected`

**Given** Quote en `status='accepted'` o `'rejected'` con `valid_until` pasado
**When** job ejecuta
**Then** no se toca (filtro `status='sent'`).

---

## 🚫 Validation Rules

| ID    | Rule                                                                  | Message / Behavior                              |
| ----- | --------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | (UX cliente) `valid_until ∈ [today+1, today+90]`                       | Feedback inline `INVALID_VALID_UNTIL` (delegado al backend en submit) |
| VR-02 | (Job) `status='sent' AND valid_until < CURRENT_DATE`                    | Filtro de la query                              |
| VR-03 | (Job) `LIMIT 100` con `FOR UPDATE SKIP LOCKED`                          | Batching                                        |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Job ejecuta como sistema (sin user context).                                                  |
| SEC-02 | UX heredada de US-052 (assignment-based al editar Quote en draft no aplica MVP).             |
| SEC-03 | Sin AdminAction (no es una acción admin-driven).                                              |
| SEC-04 | Log estructurado del job incluye `correlation_id` por ejecución.                              |

### Negative Authorization Scenarios

* N/A para el job (sin user context).
* UX heredada de US-052.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | Form de respuesta de Quote (US-052) — `app/[locale]/vendor/quote-requests/[id]/respond`.       |
| Main UI Pattern     | `ValidUntilPicker` (date picker accesible) con default `today + 15d`.                          |
| Primary Action      | "Enviar cotización" (heredado de US-052).                                                       |
| Secondary Actions   | "Usar default 15 días" (botón rápido que restaura el default).                                |
| Empty State         | No aplica.                                                                                     |
| Loading State       | Heredado de US-052.                                                                           |
| Error State         | Feedback inline accesible con código i18n cuando `valid_until` fuera del rango.               |
| Success State       | Heredado de US-052.                                                                           |
| Accessibility Notes | Date picker keyboard-accessible (flechas + Enter + Esc); `aria-invalid` y `aria-describedby` en error. |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales (`vendor.qr.respond.valid_until.*`).                                                 |
| Currency Notes      | No aplica.                                                                                     |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: form de US-052.
* Components: `ValidUntilPicker` (Client Component) integrado en `QuoteResponseForm` de US-052.
* State Management: heredado de US-052 (RHF + Zod).
* Forms: validación cliente con `react-day-picker` o equivalente accesible.
* API Client: heredado de US-052.

### Backend

* Job:
  * `ExpireQuotesJob` (cron diario `0 5 0 * * *` UTC con jitter aplicado en el handler).
  * `ExpireQuotesUseCase` ejecuta la lógica idempotente.
* Scheduler:
  * Reuso del scheduler de PB-P1-009 o introducción de `node-cron` (a decidir en DB-001/OPS-001).
* Authorization Policy:
  * Sistema (sin guards).
* Validation:
  * N/A (query interna).
* Transaction Required:
  * Sí, por batch.

### Database

* Main Tables: `quotes`, `notifications`.
* Indexes: reuso de `idx_quotes_valid_until_active (valid_until) WHERE status = 'sent'` (PB-P0-001).
* Constraints: existentes.

### API

| Method | Endpoint | Purpose                              |
| ------ | -------- | ------------------------------------ |
| —      | —        | Sin endpoint público (job interno).  |

### Observability / Audit

* Correlation ID Required: Yes (generado por ejecución).
* Log Event Required: Yes (`quote.expired`, `quote.expired.batch`, `quote.expired.run.start`, `quote.expired.run.end`).
* AdminAction Required: No
* AIRecommendation Required: No
* Métricas: `quotes.expired.total`, `quotes.expired.duration_ms`.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | Picker pre-rellena `today + 15d`.                                                  | Unit/UI     |
| TS-02 | Job marca 1 Quote expirada y crea 2 Notifications.                                | Integration |
| TS-03 | Job procesa batch de 100 con SKIP LOCKED.                                          | Integration |
| TS-04 | Re-ejecución del job es idempotente.                                              | Integration |
| TS-05 | Convención del corte: Quote vence al inicio del día `valid_until + 1`.            | Integration |
| TS-06 | Quote `accepted`/`rejected` con `valid_until` pasado NO se toca.                  | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | `valid_until` cliente fuera del rango                  | Feedback inline + `400 INVALID_VALID_UNTIL` (en submit, heredado US-052) |
| NT-02 | Notification falla en un batch                         | Rollback del batch; reintento next run |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result          |
| ---------- | ----------------------------------- | ------------------------ |
| AUTH-TS-01 | Vendor edita picker en form         | Heredado de US-052        |
| AUTH-TS-02 | Job ejecuta sin user                 | OK                       |

### Accessibility Tests

* `ValidUntilPicker` keyboard-accessible.
* `aria-invalid` + `aria-describedby` en error.

### Performance

* Job debe procesar 10,000 Quotes vencidas en `< 60s` (smoke).

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Tiempo a decisión + higiene del catálogo.            |
| Expected Impact     | Plazos claros + ciclo de vida automatizado.          |
| Success Criteria    | Default aplicado, picker accesible, job idempotente. |
| Academic Demo Value | Decisión PO 8.1 #4 + #13 visibles + cron job demostrable. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `ValidUntilPicker` accesible + integración en `QuoteResponseForm` (US-052).
* i18n `vendor.qr.respond.valid_until.*`.

### Potential Backend Tasks

* `ExpireQuotesUseCase` idempotente.
* `ExpireQuotesJob` (handler de cron).
* Scheduler bootstrap.
* Logger + métricas.

### Potential Database Tasks

* Verificar índice parcial.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS funcional + concurrencia + idempotencia + performance smoke.

### Potential DevOps / Config Tasks

* Configurar scheduler en `.env` y proceso `npm run worker`.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (job sin endpoint público).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] `ValidUntilPicker` accesible integrado en US-052 form.
* [ ] `ExpireQuotesJob` cron diario operativo.
* [ ] Idempotencia + batching + SKIP LOCKED verificados.
* [ ] 2 Notifications por Quote expirada.
* [ ] Logs estructurados + métricas.
* [ ] Tests verdes (UI, integration, idempotencia, performance smoke).
* [ ] i18n 4 locales.
* [ ] PO valida demo (Quote vence + vendor recibe in-app).

---

## 📝 Notes

* Convención del corte (final del día `valid_until`) cierra la decisión PO 8.1 #4.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-053-decision-resolution.md`.
