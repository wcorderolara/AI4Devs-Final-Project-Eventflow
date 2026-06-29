# User Story Refinement Review — US-050

## Source User Story File
management/user-stories/US-050-quote-request-category-limit.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-050-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q6 resueltas. La US-050 declara `Backlog Item: PB-P1-030`, `PO/BA Decisions Applied` D1–D6, trazabilidad corregida (`FR-QUOTE-002`, `UC-QUOTE-001`, `BR-QUOTE-009`, `C-016`, `NFR-PERF-001`, `NFR-OBS-005`). Nuevo endpoint `GET /api/v1/quote-requests/active-count`, conteo lazy con `expires_at`, badge accesible, AC-01..AC-05, EC-01..EC-03, VR-01..VR-03, SEC-01..SEC-04, TS-01..TS-06, NT-01..NT-04, AUTH-TS-01..AUTH-TS-06. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-050                                                                    |
| File Path                                  | management/user-stories/US-050-quote-request-category-limit.md            |
| Backlog Item                               | PB-P1-030 — Crear QuoteRequest con brief estructurado (+ límite 5)        |
| Epic                                       | EPIC-QR-001                                                               |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Bajo                                                                      |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (endpoint count + concurrencia)                                        |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-050-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-050 entrega el enforcement y la UX del límite de 5 QuoteRequests activas por (event, category) — Decisión PO 8.1 #12 / `BR-QUOTE-009` / `FR-QUOTE-002` / `C-016`. Es la segunda US del backlog item PB-P1-030. El enforcement server-side YA se implementa en US-049 (D9 + EC-05 + VR-08); US-050 complementa con:

1. **QA exhaustivo del límite** (incluyendo concurrencia).
2. **Endpoint `GET` para conteo activo** (pre-check del frontend).
3. **UI: `QRLimitBadge`** con contador visible "N/5".

Hallazgos:

1. **Trazabilidad incorrecta**: cita `FR-QUOTE-003` (una activa por par event-vendor — esa es US-049), `UC-QUOTE-002` (brief autocompletado), `BR-QUOTE-005` (lifecycle). Las correctas son **`FR-QUOTE-002`** (límite 5), **`UC-QUOTE-001`** (consistente con US-049), **`BR-QUOTE-009`** (la regla del 5), **`C-016`** (constraint del límite). Falta `NFR-PERF-001` y `NFR-OBS-005`.
2. **Falta declarar `Backlog Item: PB-P1-030`**.
3. **Estados que cuentan**: Business Context dice "sent, viewed, responded, preferred" — consistente con D2 de US-049. Confirmar.
4. **Endpoint dedicado de count**: la US dice `quotesApi.countActive` pero no especifica endpoint REST. Decidir si:
   a) `GET /api/v1/quote-requests/active-count?event_id=&service_category_id=` (dedicado).
   b) `GET /api/v1/events/:eventId/quote-requests?service_category_id=&status_in=active` con metadata `active_count`.
   c) Sólo enforcement server-side (sin endpoint count; UI calcula de la lista existente).
5. **Concurrencia**: Notes dice "bloqueo optimista". US-049 D9 ya implementa `SELECT FOR UPDATE` que es pesimista pero atómico. Confirmar coherencia.
6. **Mensaje del bloqueo**: AC-02 dice `QR_CATEGORY_LIMIT`. US-049 EC-05 ya estableció `QR_CATEGORY_LIMIT_REACHED` con `details.active_count`. Alinear el código exacto.
7. **EC-01 (expiración libera slot)**: hay que aclarar QUÉ proceso expira las QRs. ¿Job background separado o lazy? Si el conteo es lazy (cada llamada filtra por `status IN (active)` y `expires_at < NOW()`), no requiere job adicional.
8. **Pre-check frontend**: ¿el frontend hace pre-check con el endpoint de count para deshabilitar el CTA, o sólo reactivo al error 409?
9. **Visibilidad del contador**: ¿se muestra siempre en la página del form de QR, o sólo cuando ya hay >= 1 activa en la categoría?
10. **AC-01** dice "201 OK" — debería ser `201 Created`.
11. **AUTH-TS-01**: dice "Dueño 201/409" sin separar — claridad.
12. **Out of Scope**: "Configurable por usuario" correcto.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                            | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incorrecta: `FR-QUOTE-003`, `UC-QUOTE-002`, `BR-QUOTE-005`.                                                                                            | Trazabilidad rota.                                                                                                                     | Reemplazar por **`FR-QUOTE-002`, `UC-QUOTE-001`, `BR-QUOTE-009`, `C-016`** + añadir `NFR-PERF-001`, `NFR-OBS-005`.                                                                                                                              |
| Alta      | Endpoint dedicado de count vs reuso vs sólo error 409.                                                                                                              | UX confusa o latencia adicional.                                                                                                       | Resolver Q1 (PO/Tech). Recomendado: **`GET /api/v1/quote-requests/active-count?event_id=&service_category_id=`** dedicado, devuelve `{ active_count, limit: 5, available_slots }`.                                                              |
| Alta      | Concurrencia: optimista vs pesimista.                                                                                                                              | Race condition al 6º simultáneo.                                                                                                       | Resolver Q2 (Tech). Recomendado: **`SELECT FOR UPDATE` (pesimista atómico)** sobre la fila `events` en US-049, ya implementado. Confirmar.                                                                                                     |
| Alta      | Código de error: `QR_CATEGORY_LIMIT` vs `QR_CATEGORY_LIMIT_REACHED`.                                                                                                | Inconsistencia con US-049.                                                                                                            | Resolver Q3 (PO). Recomendado: **`QR_CATEGORY_LIMIT_REACHED`** (consistente con US-049 EC-05).                                                                                                                                                |
| Alta      | Expiración de QRs y "liberación de slot".                                                                                                                          | Implementación arbitraria.                                                                                                            | Resolver Q4 (Tech). Recomendado: **conteo lazy** — el conteo filtra `status IN ('sent','viewed','responded','preferred')` AND (`expires_at IS NULL OR expires_at > NOW()`). Sin job background dedicado en US-050; expiración explícita es US futura. |
| Alta      | Pre-check frontend vs reactivo.                                                                                                                                     | UX y latencia.                                                                                                                         | Resolver Q5 (PO). Recomendado: **híbrido** — frontend carga `active_count` al abrir el form para mostrar badge; bloquea el CTA si `active_count >= 5`; backend re-valida en POST.                                                              |
| Alta      | Visibilidad del contador.                                                                                                                                            | UX.                                                                                                                                    | Resolver Q6 (PO). Recomendado: **siempre visible** "N/5 cotizaciones activas en esta categoría" cuando se selecciona categoría en el form.                                                                                                    |
| Media     | Falta declarar `Backlog Item: PB-P1-030`.                                                                                                                          | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | AC-01 dice "201 OK" en lugar de `201 Created`.                                                                                                                      | Inconsistencia menor.                                                                                                                  | Corregir.                                                                                                                                                                                                                                       |
| Media     | AUTH-TS-01 "Dueño 201/409" no separa escenarios.                                                                                                                    | Test ambiguo.                                                                                                                          | Separar en AUTH-TS-01 (201) y AUTH-TS-02 (409).                                                                                                                                                                                                |
| Baja      | `Notes` plantea "Conteo con bloqueo optimista".                                                                                                                     | Inconsistente con SELECT FOR UPDATE de US-049.                                                                                         | Eliminar tras Q2.                                                                                                                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Backend re-valida.                                                          |
| Respeta seed/demo si aplica          | Pass      | Reuso seed.                                                                 |
| No introduce P4/Future scope         | Pass      | "Configurable por usuario" explícitamente Out of Scope.                    |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                          | Acción recomendada                                                                                                                                                                                              |
| ----- | ------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | "201 OK" en lugar de `201 Created`.                                          | Reescribir con `201 Created`.                                                                                                                                                                                  |
| AC-02 | Needs Detail | Código `QR_CATEGORY_LIMIT` vs `QR_CATEGORY_LIMIT_REACHED`.                  | Alinear con US-049: `409 QR_CATEGORY_LIMIT_REACHED` con `details.active_count=5`.                                                                                                                              |
| EC-01 | Needs Detail | "una expira" sin proceso definido.                                          | Tras Q4: conteo lazy basado en `expires_at`.                                                                                                                                                                  |

Faltan AC para:
- Endpoint count `GET /api/v1/quote-requests/active-count` (Q1).
- Frontend badge visible (Q5/Q6).
- Concurrencia atómica (Q2).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q1, Q3, Q5, Q6).

### Backend / API
- Endpoint dedicado de count (Q1).
- Conteo lazy con `expires_at` (Q4).

### Frontend / UX
- `QRLimitBadge` con `aria-live`.
- Pre-check al cargar form.

### Base de Datos
- Verificar índice `(event_id, service_category_id, status, expires_at)` para conteos eficientes.

### Seguridad / Autorización
- Ownership del evento (heredado de US-049).

### IA / PromptOps
- No aplica.

### QA / Testing
- TS exhaustivos: 5 envíos secuenciales OK, 6º bloqueado, concurrencia 2 simultáneos, expiración libera slot.
- AUTH-TS organizer ajeno (debería ser `404 EVENT_NOT_FOUND` per US-049).

### Seed / Demo
- Escenario: evento con 4 QRs activas en categoría X (demo del 5º y 6º).

### Documentación / Trazabilidad
- Corregir FR/UC/BR.
- Documentar endpoint count en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO/Tech  | **Q1** — Endpoint de count. Recomendado: `GET /api/v1/quote-requests/active-count?event_id=&service_category_id=` con response `{ active_count, limit: 5, available_slots }`.                                                                | Sí                 | PO/Tech     |
| Tech     | **Q2** — Concurrencia. Recomendado: pesimista atómico con `SELECT FOR UPDATE` sobre `events` (ya implementado en US-049 D9).                                                                                                                  | Sí                 | Tech        |
| PO       | **Q3** — Código de error. Recomendado: `409 QR_CATEGORY_LIMIT_REACHED` con `details.active_count=5` (consistente con US-049).                                                                                                                   | Sí                 | PO          |
| Tech     | **Q4** — Liberación de slot. Recomendado: conteo lazy con filtro `(expires_at IS NULL OR expires_at > NOW())`. Sin job background dedicado en US-050.                                                                                          | Sí                 | Tech        |
| PO       | **Q5** — Pre-check frontend. Recomendado: híbrido — frontend carga `active_count` al abrir el form y bloquea CTA si `>= 5`; backend re-valida.                                                                                                | Sí                 | PO          |
| PO       | **Q6** — Visibilidad del badge. Recomendado: siempre visible al seleccionar categoría en el form.                                                                                                                                              | Sí                 | PO          |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-002`          | La US cita `FR-QUOTE-003`.                                                   | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/8 §UC-QUOTE-001`          | La US cita `UC-QUOTE-002`.                                                   | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-QUOTE-009`          | La US cita `BR-QUOTE-005`.                                                   | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/16 §M07`                  | Falta documentar endpoint count.                                              | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-050-quote-request-category-limit.md`                      |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-050-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 6 decisiones PO/Tech bloqueantes + trazabilidad incorrecta.                           |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-050-quote-request-category-limit.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-050-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
