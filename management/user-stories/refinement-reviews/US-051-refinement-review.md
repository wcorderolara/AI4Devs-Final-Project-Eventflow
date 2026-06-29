# User Story Refinement Review — US-051

## Source User Story File
management/user-stories/US-051-vendor-mark-quote-request-viewed.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-051-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q6 resueltas. La US-051 declara `Backlog Item: PB-P1-031`, `PO/BA Decisions Applied` D1–D6, trazabilidad corregida (`FR-QUOTE-006/014`, `FR-AUTH-010`, `UC-QUOTE-003`, `BR-QUOTE-005/006`, `BR-AUTH-009`, `NFR-PERF-001/OBS-005`). Separación GET vs POST mark-viewed, transición sólo desde `sent`, `viewed_by` + `viewed_at`, `404 QR_NOT_FOUND` uniforme, notificación in-app al organizer atómica, AC-01..AC-04, EC-01..EC-05, VR-01..VR-04, SEC-01..SEC-04, TS-01..TS-05, NT-01..NT-05, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-051                                                                    |
| File Path                                  | management/user-stories/US-051-vendor-mark-quote-request-viewed.md        |
| Backlog Item                               | PB-P1-031 — Vendor visualiza y responde Quote (validez 15 días default)   |
| Epic                                       | EPIC-QR-001                                                               |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Bajo                                                                      |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (REST GET con side-effect vs POST mark-viewed)                          |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-051-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-051 entrega la transición automática `sent → viewed` cuando el vendor target abre el detalle de la QR. Es la primera US del backlog item `PB-P1-031` (vendor visualiza + responde Quote). El concepto está claro pero hay decisiones técnicas y de UX pendientes:

1. **Trazabilidad incorrecta**: cita `FR-QUOTE-005` (que es "validez default 15 días Quote" — corresponde a US-052/US-053). El correcto es **`FR-QUOTE-006`** (lifecycle `sent → viewed → ...`), **`FR-QUOTE-014`** (visibility QR exclusiva al vendor target), **`FR-AUTH-010`** (aislamiento por rol). `BR-QUOTE-006` ✓ correcto. Falta **`BR-QUOTE-005`** (estados de la solicitud). `UC-QUOTE-003` ✓ correcto.
2. **Falta declarar `Backlog Item: PB-P1-031`**.
3. **REST design**: GET con side-effect (update) viola idempotencia HTTP. Opciones:
   a) Mantener GET con side-effect (pragmatic, simple).
   b) Separar: `GET` retorna detalle sin transición; `POST /api/v1/vendor/quote-requests/:id/mark-viewed` ejecuta la transición explícitamente.
   c) PATCH dedicado para la transición + GET separado.
4. **Estados origen permitidos para `viewed`**: la US dice "desde `sent`". Confirmar que desde `responded`/`preferred`/`cancelled`/`expired`/`rejected` NO se transiciona, sólo se muestra read-only.
5. **AC-02**: dice "no se modifica" cuando ya está `viewed` — pero queremos persistir `last_viewed_at` también? O sólo `viewed_at` (primera vista) y nada más?
6. **Listado de QRs del vendor**: US sólo cubre el detalle. ¿Hay endpoint listado `GET /api/v1/vendor/quote-requests` o vive en otra US?
7. **Notificación al organizer "tu solicitud fue vista"**: Notes pregunta esto. ¿In scope MVP?
8. **VR-01 código**: 403 vs 404. El patrón uniforme en EventFlow es **`404 QR_NOT_FOUND`** (no revela existencia), consistente con BR-QUOTE-006.
9. **Vendor con perfil soft-deleted/hidden**: ¿puede ver QRs? Probablemente 404 también.
10. **QR con evento `cancelled`/`completed`**: ¿el vendor puede ver el detalle? Probablemente sí (read-only), pero confirmar.
11. **AC-01** menciona `viewed_at` sin nombrar quién (`viewed_by`). ¿Persistir `viewed_by=currentUser.id`?
12. **UX dice "Marcar visto" como secondary action** — confuso si la transición es automática. Aclarar.
13. **EC-01**: "QR expirada" sin transición. Confirmar que también aplica a `cancelled`/`rejected`/`responded`/`preferred`.
14. **`expires_at`** — la transición debe respetar el filtro lazy heredado de US-050 D4 (QR vencida no transiciona).

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                            | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incorrecta: `FR-QUOTE-005` es validez Quote.                                                                                                          | Trazabilidad rota.                                                                                                                     | Reemplazar por **`FR-QUOTE-006, FR-QUOTE-014, FR-AUTH-010`** + añadir **`BR-QUOTE-005`** + mantener `BR-QUOTE-006` y `UC-QUOTE-003`.                                                                                                              |
| Alta      | REST design: GET con side-effect.                                                                                                                                  | Viola semántica HTTP; clients que pre-fetch (browsers/CDN) podrían disparar transiciones falsas.                                       | Resolver Q1 (Tech). Recomendado: **separar** — `GET /api/v1/vendor/quote-requests/:id` retorna detalle sin transición; `POST /api/v1/vendor/quote-requests/:id/mark-viewed` ejecuta transición idempotente. Frontend llama a ambos (GET + POST). |
| Alta      | Política de transición a `viewed`.                                                                                                                                  | Implementación ambigua.                                                                                                                | Resolver Q2 (PO). Recomendado: **sólo desde `sent`**. Desde `viewed`/`responded`/`preferred`/`cancelled`/`expired`/`rejected` ⇒ no-op idempotente (`200` con estado actual).                                                                    |
| Alta      | Persistir `viewed_by` además de `viewed_at`.                                                                                                                        | Auditoría incompleta.                                                                                                                  | Resolver Q3 (PO). Recomendado: persistir **`viewed_at=NOW()`** y **`viewed_by=currentUser.id`** (vendor's user_id) sólo en la primera transición.                                                                                                |
| Alta      | Código de error para acceso ajeno.                                                                                                                                  | Information leakage.                                                                                                                   | Resolver Q4 (PO/Sec). Recomendado: **`404 QR_NOT_FOUND` uniforme** para vendor ajeno, QR inexistente, vendor soft-deleted/hidden (consistente con patrón EventFlow).                                                                              |
| Alta      | Notificación al organizer "tu solicitud fue vista".                                                                                                                | Esperado MVP o Future.                                                                                                                | Resolver Q5 (PO). Recomendado: **in scope MVP** — al transicionar a `viewed`, insertar `Notification(channel='in_app', recipient=organizer, event='quote_request.viewed')` en la misma transacción.                                            |
| Media     | Listado de QRs del vendor.                                                                                                                                          | Sin endpoint listado, vendor no puede navegar.                                                                                        | Resolver Q6 (PO). Recomendado: **fuera de scope US-051**; el listado vive en una US complementaria (PB-P2-006 / notifications) o se incluye con `GET /api/v1/vendor/quote-requests` en US futura.                                                |
| Media     | Falta declarar `Backlog Item: PB-P1-031`.                                                                                                                          | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | UX confusa: "Marcar visto" como secondary action.                                                                                                                  | Vendor podría pensar que requiere acción explícita.                                                                                    | Tras Q1, eliminar "Marcar visto" como acción; sólo banner informativo.                                                                                                                                                                         |
| Media     | AC-02 ambiguo ("no se modifica").                                                                                                                                  | Test ambiguo.                                                                                                                          | Reescribir: segundo POST mark-viewed retorna `200` con QR sin cambios.                                                                                                                                                                         |
| Baja      | EC-01 sólo cubre `expired`.                                                                                                                                          | Cobertura incompleta.                                                                                                                  | Extender a `viewed/responded/preferred/cancelled/rejected`.                                                                                                                                                                                     |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Transición server-side.                                                     |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-049.                                                  |
| No introduce P4/Future scope         | Pass      | Read receipts complejos correctamente Out of Scope.                        |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                                            | Acción recomendada                                                                                                                                                                                                                                       |
| ----- | ------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No nombra `viewed_by`, notificación, log.                                                       | Reescribir tras Q1–Q5.                                                                                                                                                                                                                              |
| AC-02 | Needs Detail | "No se modifica" ambiguo.                                                                       | Reescribir: segundo POST mark-viewed retorna `200` sin cambios.                                                                                                                                                                                    |
| EC-01 | Needs Detail | Sólo cubre `expired`.                                                                            | Extender a todos los estados no-`sent`.                                                                                                                                                                                                            |

Faltan AC para:
- Notificación al organizer (Q5).
- 404 uniforme para QR ajena (Q4).
- Vendor soft-deleted/hidden (Q4).
- Persistir `viewed_by` (Q3).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q2..Q6).

### Backend / API
- Separar GET (read) de POST mark-viewed (transición) — Q1.
- Transacción atómica para QR update + Notification.

### Frontend / UX
- Page detalle QR vendor.
- Llamada doble: GET para mostrar + POST `mark-viewed` al montar el componente si `status='sent'`.
- Banner "Visto el día X" cuando `viewed_at` ya existe.

### Base de Datos
- Verificar columnas `viewed_at`, `viewed_by` en `quote_requests`.

### Seguridad / Autorización
- Assignment-based (vendor.user_id === currentUser.id).
- 404 uniforme.

### IA / PromptOps
- No aplica.

### QA / Testing
- TS idempotencia, transición, no-op desde otros estados, notificación al organizer.

### Seed / Demo
- Reuso del seed; añadir QR en estado `sent` para demo.

### Documentación / Trazabilidad
- Corregir FR/BR.
- Documentar GET + POST en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| Tech     | **Q1** — REST design del side-effect. Recomendado: separar `GET /api/v1/vendor/quote-requests/:id` (sin transición) + `POST /api/v1/vendor/quote-requests/:id/mark-viewed` (transición idempotente).                                            | Sí                 | Tech        |
| PO       | **Q2** — Estados origen para `viewed`. Recomendado: sólo desde `sent`; otros estados ⇒ no-op idempotente (`200` con estado actual).                                                                                                              | Sí                 | PO          |
| PO       | **Q3** — Persistir `viewed_by`. Recomendado: sí, `viewed_at=NOW()` + `viewed_by=currentUser.id` en la primera transición.                                                                                                                       | Sí                 | PO          |
| PO/Sec   | **Q4** — Código de error para acceso ajeno. Recomendado: `404 QR_NOT_FOUND` uniforme (incluye QR ajena, inexistente, vendor soft-deleted/hidden).                                                                                              | Sí                 | PO/Sec      |
| PO       | **Q5** — Notificación al organizer "tu solicitud fue vista". Recomendado: in scope MVP — `Notification(channel='in_app', recipient=organizer, event='quote_request.viewed')` dentro de la misma transacción.                                  | Sí                 | PO          |
| PO       | **Q6** — Listado de QRs del vendor. Recomendado: fuera de scope US-051; vive en US futura o se cubre con `GET /api/v1/vendor/quote-requests` posterior.                                                                                          | Sí                 | PO          |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-006/014`      | La US cita `FR-QUOTE-005` (validez Quote).                                   | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-QUOTE-005`          | La US no lo cita.                                                            | Añadir.                                 | Housekeeping en US.                                                | No                   |
| `docs/16 §M07`                  | Falta documentar GET + POST.                                                  | Documentar tras Q1.                     | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-051-vendor-mark-quote-request-viewed.md`                  |
| User Story ID verified                     | Yes                                                                                   |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-051-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 6 decisiones PO/Tech bloqueantes + trazabilidad incorrecta.                           |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-051-vendor-mark-quote-request-viewed.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-051-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
