# User Story Refinement Review — US-049

## Source User Story File
management/user-stories/US-049-send-quote-request.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-049-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q9 resueltas. La US-049 declara `Backlog Item: PB-P1-030`, `PO/BA Decisions Applied` D1–D9, trazabilidad completa (`FR-QUOTE-001/003/004/006/016`, `FR-EVENT-006`, `UC-QUOTE-001`, `BR-QUOTE-001..009`, `BR-EVENT-006/007`, `NFR-PERF-001`, `C-016`). Body estructurado, transacción atómica con SELECT FOR UPDATE, 2 Notifications, rate limit 10/min, AC-01..AC-04, EC-01..EC-06, VR-01..VR-09, SEC-01..SEC-07, TS-01..TS-05, NT-01..NT-08, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-049                                                                    |
| File Path                                  | management/user-stories/US-049-send-quote-request.md                      |
| Backlog Item                               | PB-P1-030 — Crear QuoteRequest con brief estructurado (+ límite 5)        |
| Epic                                       | EPIC-QR-001                                                               |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (notification port + transacción)                                      |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-049-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-049 entrega la creación de `QuoteRequest` desde un evento `active` de un organizador hacia un vendor `approved` (`docs/8 §UC-QUOTE-001`, `docs/9 §FR-QUOTE-001/003/004/006/016`, `docs/4 §BR-QUOTE-001..009`). Es la primera US del backlog item `PB-P1-030`; US-050 cubre el enforcement del límite de 5 activas por categoría. Hallazgos:

1. **Trazabilidad incompleta**: cita `FR-QUOTE-001, FR-QUOTE-002`. Falta `FR-QUOTE-003` (una activa por par event-vendor — clave para AC-02), `FR-QUOTE-004` (brief autocompletado), `FR-QUOTE-006` (lifecycle), `FR-QUOTE-016` (notificación in-app), `FR-EVENT-006` (sólo eventos `active`). `BR-QUOTE-004` (una activa por par) falta y `BR-QUOTE-005` (lifecycle) también. `NFR-PERF-API-001` no existe → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-030`**.
3. **Estados "activas"** (sent/viewed/responded/preferred per BR-QUOTE-009) no se enumeran en la US.
4. **Brief estructura**: la US dice "≤ 5000 chars" sin detallar campos (event_type, date, guests, budget, currency, message). FR-QUOTE-004 dice "autocompletar desde datos del evento" → ¿campos específicos o texto libre?
5. **Currency del brief**: la US dice "Moneda del evento" en UX Notes. Confirmar que el brief hereda `currency_code` del evento (BR-EVENT-007 inmutable).
6. **Notificación**: Business Context dice "in-app + email simulado". FR-QUOTE-016 sólo menciona in-app. Aclarar si email simulado in scope.
7. **Estado del evento**: FR-EVENT-006 requiere `event.status='active'`. La US no lo menciona explícitamente.
8. **Vendor target**: la US dice "approved" pero falta detallar `deleted_at IS NULL`, `is_hidden` (`status != 'hidden'`).
9. **`ai_generated_brief` flag**: docs/8 §UC-AI-005 menciona `ai_generated_brief=true` cuando viene de US-021. ¿La US-049 setea este flag desde el body?
10. **`service_category_id` en body**: requerido por FR-QUOTE-002 (cuenta por categoría) y FR-QUOTE-003 (una por par event-vendor sin categoría). Confirmar shape del body.
11. **Reactivación post-cancel**: FR-QUOTE-003 permite crear nueva QR si previa es `cancelled`/`expired`/`rejected`. La US no lo cubre.
12. **Rate limiting**: SEC-03 dice "Rate limit por usuario" sin cuantificar.
13. **Notification port**: la implementación requiere `NotificationSenderPort` (docs/14). Aclarar.
14. **Transacción**: la US dice "Sí (insert + notification)". Aclarar si la notificación se persiste como `Notification` row dentro de la misma transacción Prisma o se delega a worker (out of scope MVP).
15. **AC-02** dice `409 QR_ALREADY_ACTIVE` sin detallar el shape; añadir `details.existing_quote_request_id`.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                 | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incompleta: faltan `FR-QUOTE-003/004/006/016`, `FR-EVENT-006`, `BR-QUOTE-004/005`, `C-016`. `NFR-PERF-API-001` no existe.                                                                    | Trazabilidad rota.                                                                                                                     | Reemplazar/añadir FR/BR/NFR correctos.                                                                                                                                                                                                          |
| Alta      | Brief: estructura libre vs campos específicos.                                                                                                                                                          | Implementación arbitraria.                                                                                                            | Resolver Q1 (PO/BA). Recomendado: **estructurado** con `event_type, event_date, city, guests, budget, currency, message`. `message` libre texto `[0..5000]`; campos restantes inferidos del evento (no editables) excepto `budget` y `message`. |
| Alta      | Estados que cuentan como "activas" (BR-QUOTE-009).                                                                                                                                                       | Conflicto con US-050.                                                                                                                  | Resolver Q2 (PO). Recomendado: `sent`, `viewed`, `responded`, `preferred` cuentan; `cancelled`, `expired`, `rejected` NO cuentan.                                                                                                              |
| Alta      | Estado del evento permitido.                                                                                                                                                                            | Riesgo de QR desde eventos cerrados.                                                                                                  | Resolver Q3 (PO). Recomendado: sólo `event.status='active'`. Otros estados ⇒ `409 EVENT_NOT_ACTIVE`.                                                                                                                                            |
| Alta      | Política del vendor target (status + deleted_at).                                                                                                                                                       | Riesgo de QR a vendors no válidos.                                                                                                    | Resolver Q4 (PO). Recomendado: vendor target debe tener `status='approved'` AND `deleted_at IS NULL`. Cualquier otro ⇒ `400 VENDOR_NOT_AVAILABLE`.                                                                                              |
| Alta      | Reactivación post-cancel.                                                                                                                                                                                | FR-QUOTE-003 explícito.                                                                                                                | Resolver Q5 (PO). Recomendado: permitido cuando la QR previa al mismo (event, vendor) está `cancelled`/`expired`/`rejected`. AC explícito.                                                                                                      |
| Alta      | Notificación: in-app + email simulado o sólo in-app.                                                                                                                                                    | Inconsistencia con FR-QUOTE-016.                                                                                                       | Resolver Q6 (PO). Recomendado: **in-app** obligatorio (FR-QUOTE-016). Email simulado queda como `Notification` row con canal `email_simulated` (sin envío real); no bloqueante.                                                                |
| Alta      | `ai_generated_brief` flag.                                                                                                                                                                              | Trazabilidad IA.                                                                                                                       | Resolver Q7 (PO). Recomendado: si el cliente envía `source: 'ai_generated'` en body, persiste `ai_generated_brief=true`. Default `false`.                                                                                                       |
| Alta      | Rate limiting por usuario.                                                                                                                                                                              | DoS / spam.                                                                                                                            | Resolver Q8 (PO/Sec). Recomendado: `10 req/min` por organizer authenticated.                                                                                                                                                                    |
| Alta      | Transacción + Notification persistence.                                                                                                                                                                  | Riesgo de QR sin notificación o duplicados.                                                                                            | Resolver Q9 (Tech). Recomendado: `prisma.$transaction` envuelve INSERT QR + INSERT Notification (in-app). Email simulado se persiste como `Notification` adicional con `delivery_status='simulated'` dentro de la misma transacción.            |
| Media     | Falta declarar `Backlog Item: PB-P1-030`.                                                                                                                                                                | Trazabilidad incompleta.                                                                                                                | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | AC-01/02 lacónicos.                                                                                                                                                                                      | AC subespecificado.                                                                                                                    | Reescribir con campos persistidos, response shape, log y notificación.                                                                                                                                                                         |
| Media     | Body shape no documentado.                                                                                                                                                                              | Implementación arbitraria.                                                                                                            | Documentar `{ event_id, vendor_profile_id, service_category_id, brief: { budget, currency, message }, source? }`.                                                                                                                              |
| Baja      | `Notes` plantea "Coordinar con US-050" — correcto.                                                                                                                                                       | OK.                                                                                                                                    | Mantener.                                                                                                                                                                                                                                       |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | Chat real-time explícitamente fuera de scope.                              |
| Respeta human-in-the-loop IA         | Pass      | Brief AI es opcional y editable (US-021).                                  |
| Respeta backend como source of truth | Pass      | Validación server-side.                                                     |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de eventos + vendors.                                       |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                         |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                         |
| No introduce P4/Future scope         | Pass      | Cotizaciones múltiples concurrentes por (event, vendor) explícito Out of Scope. |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                                                            | Acción recomendada                                                                                                                                                                                                                                       |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No nombra campos persistidos, response shape, notificación, log.                                              | Reescribir con shape completo.                                                                                                                                                                                                                       |
| AC-02 | Needs Detail | `QR_ALREADY_ACTIVE` sin detalles.                                                                              | Reescribir con `409` + `details.existing_quote_request_id`.                                                                                                                                                                                          |
| EC-01 | Needs Detail | Sólo cubre `pending`/`rejected`; falta `hidden` y soft-deleted.                                                | Reescribir tras Q4.                                                                                                                                                                                                                                  |

Faltan AC para:
- Estado del evento no `active` (Q3).
- Reactivación post-cancel/expired/rejected (Q5).
- Límite 5 por categoría es responsabilidad de US-050 pero el endpoint lo enforcea — referenciar.
- AI flag (`ai_generated_brief`).
- Rate limit.
- Notificación in-app generada.

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q1–Q9).

### Backend / API
- DTO Zod con shape estructurado del brief.
- `CreateQuoteRequestUseCase` con todas las branches.
- `NotificationSenderPort` reuso.
- Transacción atómica QR + Notification.

### Frontend / UX
- `QuoteRequestForm` con campos derivados del evento (read-only) + `budget` + `message`.
- CTA "Autocompletar con IA" deep-link a US-021.

### Base de Datos
- Confirmar `quote_requests` schema + UNIQUE parcial activa por (event_id, vendor_profile_id).

### Seguridad / Autorización
- Ownership del evento + assignment-based del vendor target.
- Rate limit por usuario.

### IA / PromptOps
- Flag `ai_generated_brief`.

### QA / Testing
- TS reactivación + estados activas + notificación generada.
- AUTH-TS organizer ajeno y vendor.

### Seed / Demo
- Reuso seed.

### Documentación / Trazabilidad
- Corregir FR/BR/NFR.
- Documentar endpoint en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO/BA    | **Q1** — Brief estructura. Recomendado: estructurado con `budget` (`numeric(14,2) >= 0`), `currency` (heredado del evento, inmutable), `message` (string `[0..5000]`). `event_type/date/city/guests` se snapshot del evento al crear.            | Sí                 | PO/BA       |
| PO       | **Q2** — Estados activas. Recomendado: `sent`, `viewed`, `responded`, `preferred` cuentan; `cancelled`, `expired`, `rejected` NO cuentan (per BR-QUOTE-009).                                                                                    | Sí                 | PO          |
| PO       | **Q3** — Estado del evento permitido. Recomendado: sólo `event.status='active'`. Otros ⇒ `409 EVENT_NOT_ACTIVE`.                                                                                                                                | Sí                 | PO          |
| PO       | **Q4** — Política del vendor target. Recomendado: `status='approved'` AND `deleted_at IS NULL`. Otros ⇒ `400 VENDOR_NOT_AVAILABLE`.                                                                                                              | Sí                 | PO          |
| PO       | **Q5** — Reactivación post-cancel. Recomendado: permitido cuando previa al mismo (event, vendor) está `cancelled`/`expired`/`rejected` (FR-QUOTE-003).                                                                                          | Sí                 | PO          |
| PO       | **Q6** — Email simulado in scope. Recomendado: `Notification` row con canal `email_simulated`, sin envío real, in scope MVP.                                                                                                                    | Sí                 | PO          |
| PO       | **Q7** — Flag `ai_generated_brief`. Recomendado: si body incluye `source: 'ai_generated'`, persiste `true`. Default `false`.                                                                                                                    | Sí                 | PO          |
| PO/Sec   | **Q8** — Rate limit por organizer. Recomendado: `10 req/min` por organizer authenticated.                                                                                                                                                       | Sí                 | PO/Sec      |
| Tech     | **Q9** — Transacción QR + Notification. Recomendado: `prisma.$transaction` envuelve INSERT QR + INSERT 2 Notifications (in-app + email_simulated). Si falla cualquier paso, rollback completo.                                                  | Sí                 | Tech        |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                                  | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-003/004/006/016` | La US no las cita.                                                                  | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-QUOTE-004/005`      | La US no los cita.                                                                   | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/10 §NFR-PERF-001`         | `NFR-PERF-API-001` no existe.                                                        | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/16 §M07`                  | Falta documentar endpoint.                                                            | Documentar tras D1–D9.                  | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-049-send-quote-request.md`                                |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-049-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-049-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 9 decisiones PO/Tech/Sec bloqueantes + trazabilidad incompleta.                       |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-049-send-quote-request.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-049-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
