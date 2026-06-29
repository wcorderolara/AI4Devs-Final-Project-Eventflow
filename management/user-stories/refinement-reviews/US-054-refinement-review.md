# User Story Refinement Review — US-054

## Source User Story File
management/user-stories/US-054-notify-vendor-quote-rejected-expired.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-054-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q8 resueltas. La US-054 declara `Backlog Item: PB-P1-032`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (`FR-QUOTE-009/010`, `FR-NOTIF-001/004/005`, `UC-QUOTE-009/010`, `UC-NOTIF-001`, `BR-NOTIF-001..005`, `BR-QUOTE-014/016`, `NFR-OBS-005`), endpoint `POST /api/v1/organizer/quotes/:id/reject`, `QuoteNotificationService` reusable, refactor de US-053 para usar el servicio común, AC-01..AC-03, EC-01..EC-05, VR-01..VR-04, SEC-01..SEC-05, TS-01..TS-06, NT-01..NT-07, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-054                                                                    |
| File Path                                  | management/user-stories/US-054-notify-vendor-quote-rejected-expired.md    |
| Backlog Item                               | PB-P1-032 — Notificación a vendor por Quote rechazada/expirada           |
| Epic                                       | EPIC-QR-001                                                               |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (handler centralizado + scope endpoint reject)                         |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-054-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-054 cubre el cierre del loop de comunicación cuando una Quote pasa a `rejected` o `expired` (Decisión PO 8.1 #13 / `FR-NOTIF-004` / `FR-QUOTE-009/010` / `BR-NOTIF-002`). El concepto es claro pero hay ambigüedades importantes:

1. **El caso `expired` ya está implementado en US-053 D3** — el job de expiración inserta 2 Notifications (`in_app` + `email_simulated`) por cada Quote vencida. US-054 lo duplica.
2. **El caso `rejected` requiere un endpoint del organizer** (`POST /api/v1/organizer/quotes/:id/reject`) que NO existe aún en US-049..053. Sin el endpoint, FR-QUOTE-010 queda huérfano y el AC-01 "organizer rechaza Quote" no es ejecutable.
3. **Trazabilidad incorrecta**: cita `FR-NOTIF-003` (email simulado), `UC-NOTIF-002` (consultar notifications), `BR-NOTIF-003` (email log) — todos marginalmente relacionados. Las correctas principales son **`FR-QUOTE-009`** (notif por expired), **`FR-QUOTE-010`** (notif por rejected + email simulado), **`FR-NOTIF-001/004/005`**, **`UC-QUOTE-009`** (rechazo), **`UC-QUOTE-010`** (expiración), **`UC-NOTIF-001`** (emisión), **`BR-NOTIF-002`** (eventos disparadores), **`BR-QUOTE-016`** (expiración). El backlog item PB-P1-032 cita `FR-QUOTE-011` incorrectamente (es comparativa side-by-side).
4. **Falta declarar `Backlog Item: PB-P1-032`**.
5. **Inbox del vendor**: PB-P1-032 Notes dice "Surface en notificaciones (PB-P2-010)". US-054 confunde scope al hablar de "Vendor inbox" en UX Notes.
6. **Idempotencia**: la US dice "vendor sin user_id → omitir". Inconsistente con la idempotencia real (una transición → una notif, garantizado por la transacción atómica).
7. **EC-01 "vendor inactivo"**: confuso — el modelo no tiene `vendor.is_inactive`. Quizá refiere a `status='hidden'` o soft-deleted. Aclarar.
8. **Email simulado**: paridad con US-049/052/053 (`email_simulated` `delivery_status='simulated'`).
9. **Razón del rechazo**: ¿el organizer puede enviar un campo opcional `reason`?
10. **Estados origen para rechazar**: Quote `sent` (BR-QUOTE-014). Otros estados ⇒ `409`.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                          | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad estructuralmente incorrecta.                                                                                                                                       | Trazabilidad rota.                                                                                                                     | Reemplazar/añadir: `FR-QUOTE-009, FR-QUOTE-010, FR-NOTIF-001, FR-NOTIF-004, FR-NOTIF-005`, `UC-QUOTE-009, UC-QUOTE-010, UC-NOTIF-001`, `BR-NOTIF-001/002/003/005`, `BR-QUOTE-014/016`, `NFR-OBS-005`.                                          |
| Alta      | Scope: endpoint del organizer para rechazar Quote ausente.                                                                                                                       | FR-QUOTE-010 huérfano; AC-01 no ejecutable.                                                                                            | Resolver Q1 (PO). Recomendado: **incluir endpoint `POST /api/v1/organizer/quotes/:id/reject`** en US-054. Sin él, `rejected` no se puede disparar.                                                                                          |
| Alta      | Duplicación con US-053 D3 para caso `expired`.                                                                                                                                  | Conflicto/duplicación de código.                                                                                                       | Resolver Q2 (Tech). Recomendado: **extraer la emisión** a `QuoteNotificationService` reutilizable. US-053 lo invoca para `expired`; US-054 lo invoca también para `rejected`. Refactor del job para usar el servicio.                          |
| Alta      | Estados origen para rechazo.                                                                                                                                                     | Implementación ambigua.                                                                                                                | Resolver Q3 (PO). Recomendado: sólo desde Quote `status='sent'`. Otros (`accepted`, `expired`, `draft`, `rejected`) ⇒ `409 QUOTE_NOT_REJECTABLE` con `details.current_status`.                                                                |
| Alta      | Razón opcional del rechazo.                                                                                                                                                      | UX limitada.                                                                                                                            | Resolver Q4 (PO). Recomendado: body opcional `{ reason?: string [0..500] }`. Si presente, se persiste en `quotes.rejection_reason` (verificar schema o añadir).                                                                              |
| Alta      | EC-01 "vendor inactivo" ambiguo.                                                                                                                                                 | Test no testeable.                                                                                                                     | Resolver Q5 (PO). Recomendado: la notif se persiste siempre; visibilidad por el vendor está gobernada por FR-NOTIF-005 (sólo dueño). Eliminar EC-01 o reescribir.                                                                              |
| Alta      | Inbox del vendor: in scope o future.                                                                                                                                              | Scope confuso.                                                                                                                          | Resolver Q6 (PO). Recomendado: **fuera de scope US-054** — el surface (FR-NOTIF-002) vive en PB-P2-010 / US futura. US-054 sólo entrega la emisión.                                                                                       |
| Alta      | Atomicidad: notif insertada dentro de la transacción de cambio de status.                                                                                                         | Riesgo de status sin notif.                                                                                                            | Resolver Q7 (Tech). Recomendado: dentro de `prisma.$transaction` que también ejecuta UPDATE `status='rejected'`.                                                                                                                              |
| Alta      | Authorization para el endpoint reject.                                                                                                                                            | Permission rule ausente.                                                                                                                | Resolver Q8 (PO/Sec). Recomendado: organizer dueño del evento que contiene la `QuoteRequest` de la Quote. Otros ⇒ `404 QUOTE_NOT_FOUND` (uniforme).                                                                                          |
| Media     | Falta declarar `Backlog Item: PB-P1-032`.                                                                                                                                       | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | UX confunde scope con inbox.                                                                                                                                                     | Scope creep.                                                                                                                          | Tras Q6, eliminar referencias a inbox; US-054 sólo emite.                                                                                                                                                                                       |
| Media     | AC-01/02 lacónicos.                                                                                                                                                              | Subespecificados.                                                                                                                      | Reescribir con persistencia exacta + 2 Notifications + log.                                                                                                                                                                                  |
| Baja      | `Notes` plantea "Confirmar copy" — vive en FE/i18n.                                                                                                                              | OK.                                                                                                                                    | Mover a Out of Scope (resuelto vía i18n keys).                                                                                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | FR-NOTIF-006 reafirma SMS/Push fuera de scope.                              |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Emisión server-side.                                                        |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-052/US-053.                                            |
| No introduce P4/Future scope         | Pass      | Inbox + filtros avanzados Out of Scope.                                    |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                          | Acción recomendada                                                                                                                                                                                              |
| ----- | ------------ | --------------------------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No define endpoint, body, transacción, notif shape.                          | Reescribir tras Q1/Q7/Q8.                                                                                                                                                                                  |
| AC-02 | Needs Detail | Duplica US-053 D3.                                                           | Reescribir referenciando al servicio común; QA se centra en idempotencia conjunta.                                                                                                                        |
| EC-01 | Needs Detail | "Vendor inactivo" ambiguo.                                                   | Eliminar o reescribir tras Q5.                                                                                                                                                                              |

Faltan AC para:
- Notif `quote.rejected` con `reason` opcional.
- Notif `quote.expired` reuso del servicio común.
- Idempotencia por transición (sólo 1 notif por evento).
- `404 QUOTE_NOT_FOUND` uniforme.
- Estados origen para reject.
- Sólo 1 in-app + 1 email_simulated (no duplicados).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q1..Q8).

### Backend / API
- Endpoint del organizer para reject.
- `QuoteNotificationService` reutilizable.
- Refactor del job de US-053 para usar el servicio.

### Frontend / UX
- Form del organizer para rechazar Quote (en la vista comparativa o detalle de Quote).
- Inbox del vendor: fuera de scope.

### Base de Datos
- Confirmar columna `quotes.rejection_reason` (o añadir vía migración menor).

### Seguridad / Autorización
- Organizer dueño del evento.
- `404 QUOTE_NOT_FOUND` uniforme.

### IA / PromptOps
- No aplica.

### QA / Testing
- TS rejection completo, expired (reuso US-053), idempotencia, isolation FR-NOTIF-005.

### Seed / Demo
- Quote `sent` propia del organizer demo para rechazar.

### Documentación / Trazabilidad
- Corregir FR/UC/BR/NFR.
- Documentar endpoint en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO       | **Q1** — Endpoint de rechazo in scope US-054. Recomendado: sí. Sin él, FR-QUOTE-010 queda huérfano.                                                                                                                                              | Sí                 | PO          |
| Tech     | **Q2** — Servicio común. Recomendado: `QuoteNotificationService.emitQuoteStateChange({ quote, event, tx })` reusable. US-053 refactoriza para invocarlo; US-054 lo introduce.                                                                  | Sí                 | Tech        |
| PO       | **Q3** — Estados origen para reject. Recomendado: sólo `status='sent'`; otros ⇒ `409 QUOTE_NOT_REJECTABLE` con `details.current_status`.                                                                                                       | Sí                 | PO          |
| PO       | **Q4** — `reason` opcional. Recomendado: body `{ reason?: string [0..500] }`. Persistir en `quotes.rejection_reason` y `rejected_at=NOW()`.                                                                                                  | Sí                 | PO          |
| PO       | **Q5** — Comportamiento EC-01. Recomendado: la notif se persiste siempre. Visibilidad por `FR-NOTIF-005` (sólo dueño). Eliminar EC-01.                                                                                                       | Sí                 | PO          |
| PO       | **Q6** — Inbox / surface. Recomendado: fuera de scope US-054 (vive en US futura PB-P2-010).                                                                                                                                                  | Sí                 | PO          |
| Tech     | **Q7** — Atomicidad. Recomendado: emitir notif dentro de `prisma.$transaction` con UPDATE `status='rejected'`.                                                                                                                                  | Sí                 | Tech        |
| PO/Sec   | **Q8** — Authorization endpoint reject. Recomendado: organizer dueño del evento de la QR. Otros ⇒ `404 QUOTE_NOT_FOUND` uniforme.                                                                                                                | Sí                 | PO/Sec      |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-009/010`      | La US cita `FR-NOTIF-003` marginalmente relacionado.                          | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/8 §UC-QUOTE-009/010`      | La US cita `UC-NOTIF-002`.                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-NOTIF-002`          | La US cita `BR-NOTIF-003`.                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| PB-P1-032 Traceability          | El backlog item cita `FR-QUOTE-011` (comparativa) incorrectamente.            | Trazabilidad real.                     | Housekeeping del backlog.                                          | No                   |
| `docs/16 §M07`                  | Falta documentar endpoint reject.                                              | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-054-notify-vendor-quote-rejected-expired.md`              |
| User Story ID verified                     | Yes                                                                                   |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-054-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 8 decisiones PO/Tech/Sec bloqueantes + trazabilidad incorrecta + scope ambiguo.       |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-054-notify-vendor-quote-rejected-expired.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-054-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
