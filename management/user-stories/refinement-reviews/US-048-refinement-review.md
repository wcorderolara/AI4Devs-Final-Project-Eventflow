# User Story Refinement Review — US-048

## Source User Story File
management/user-stories/US-048-soft-delete-portfolio-image.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-048-decision-resolution.md

## Review Date
2026-06-26 (revalidación: 2026-06-26)

## Revalidation Result (2026-06-26)
Q1–Q4 resueltas. La US-048 ahora declara `Backlog Item: PB-P1-026`, `PO/BA Decisions Applied` con D1–D4, trazabilidad corregida (`FR-VENDOR-008`, `UC-VENDOR-005`, `NFR-DATA-008/OBS-005`, `BR-PRIVACY-011`, `C-037`, `C-060`), endpoint canónico `DELETE /api/v1/vendors/me/portfolio/images/:imageId`, AC-01..AC-02 con `204 No Content` y log estructurado, EC-01..EC-05 con códigos definitivos (`404 ATTACHMENT_NOT_FOUND` uniforme, `409 PROFILE_HIDDEN`, `400 INVALID_DELETION_REASON`), VR-01..VR-06, SEC-01..SEC-05, TS-01..TS-04, NT-01..NT-06, AUTH-TS-01..AUTH-TS-08. No se detectan nuevos blockers. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-048                                                                    |
| File Path                                  | management/user-stories/US-048-soft-delete-portfolio-image.md             |
| Backlog Item                               | PB-P1-026 — Portafolio del vendor (10 imágenes / trabajo)                 |
| Epic                                       | EPIC-VND-001                                                              |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Bajo                                                                      |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (alineación con modelo polimórfico de US-043)                          |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-048-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-048 cierra PB-P1-026 con el endpoint de soft delete del attachment del portafolio (Decisión PO 8.1 #19 / BR-PRIVACY-011 / FR-VENDOR-008). El alcance es pequeño y bien delimitado, pero hereda los mismos problemas estructurales que tenía US-043 antes de la refinación:

1. **Trazabilidad incorrecta**: cita `FR-VENDOR-009` (que es VendorService/paquetes — `docs/9` línea 433) y `UC-VENDOR-009` (que no aplica al portafolio). El correcto es **`FR-VENDOR-008`** y **`UC-VENDOR-005`** (`docs/9` y `docs/8` lo confirman). `NFR-SEC-008` es sobre API keys de IA y no aplica; el NFR pertinente es **`NFR-DATA-008`** (soft delete attachments) y **`NFR-OBS-005`** (logs).
2. **Endpoint inconsistente con el modelo**: `DELETE /api/v1/vendors/me/works/:id/images/:imageId` asume entidad `vendor_work` con PK. No existe. La identificación del attachment vive en `attachments.id` (UUID). Las opciones razonables son:
   - `DELETE /api/v1/vendors/me/portfolio/images/:imageId` (recurso por UUID, alineado con la generación de `attachment.id` en US-043).
   - `DELETE /api/v1/vendors/me/portfolio/works/:workLabel/images/:imageId` (mantiene el patrón jerárquico de US-043, pero `:workLabel` es redundante para identificar el recurso).
3. **`deletion_reason`**: `FR-VENDOR-008` cita `deletion_reason` en el schema. ¿Se exige un cuerpo con razón o queda opcional/null? Confirmar con PO.
4. **Idempotencia / ya soft-deleted**: la US no aclara qué responder si `attachments.status='deleted'`. Recomendable: `404` para mantener el principio de que el recurso "no existe" desde la perspectiva del vendor.
5. **Status del `VendorProfile`**: ¿se permite soft-delete cuando el perfil está `hidden`? Consistente con US-041 D3 y US-043 D3 recomendado: bloquear en `hidden` y soft-deleted del perfil.
6. **AdminAction**: la US dice "AdminAction Required: No" — correcto (acción vendor-driven). Aclararlo.
7. **Storage físico**: la US dice "Almacenamiento físico permanece"; está bien. Confirmar Out of Scope explícito para limpieza física en este flujo.
8. **Notes**: "retención y purge físico" — confirmar Out of Scope MVP (lifecycle policies = futuro).

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                  | Impacto                                                                                  | Recomendación                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Endpoint asume entidad `vendor_work` con PK. No existe.                                                                                    | Implementación imposible tal como está escrita.                                          | Resolver Q1 (PO/Tech). Recomendado: `DELETE /api/v1/vendors/me/portfolio/images/:imageId`.                                                |
| Alta      | Trazabilidad estructuralmente incorrecta: `FR-VENDOR-009`, `UC-VENDOR-009`, `NFR-SEC-008` no aplican.                                       | Trazabilidad rota; aprobación inválida.                                                  | Reemplazar por **`FR-VENDOR-008`, `UC-VENDOR-005`, `NFR-DATA-008`, `NFR-OBS-005`, `BR-PRIVACY-011`, `C-037`, `C-060`**.                  |
| Alta      | Política por status del `VendorProfile` no definida.                                                                                       | Comportamiento ambiguo en `hidden`/soft-deleted del perfil.                              | Resolver Q3 (PO). Recomendado: **bloqueado en `hidden`** (`409 PROFILE_HIDDEN`, consistente con US-041 D3) y soft-deleted (`404`).        |
| Alta      | Idempotencia / ya soft-deleted no especificada.                                                                                            | Implementación arbitraria; tests no replicables.                                          | Resolver Q4 (PO). Recomendado: **`404`** cuando `attachments.status='deleted'` (el recurso ya no existe para el vendor).                 |
| Media     | `deletion_reason` no aclarado (opcional vs requerido).                                                                                     | Implementación divergente.                                                               | Resolver Q2 (PO). Recomendado: **opcional**, body `{ "deletion_reason": string? }` (1..500 chars). Si ausente, persistir `null`.         |
| Media     | Falta declarar `Backlog Item: PB-P1-026`.                                                                                                  | Trazabilidad incompleta.                                                                  | Añadir en Metadata.                                                                                                                       |
| Media     | AC-01 demasiado lacónico (no nombra `status='deleted'`, `deleted_by`, ni el log).                                                          | AC subespecificado.                                                                       | Reescribir AC-01 con los efectos exactos.                                                                                                |
| Media     | Falta log estructurado `vendor.portfolio.deleted`.                                                                                         | Observabilidad incompleta.                                                                | Añadir en Observability.                                                                                                                  |
| Media     | Falta especificar response code éxito.                                                                                                      | Inconsistencia entre 200/204.                                                             | Confirmar `204 No Content`.                                                                                                              |
| Baja      | `Notes` plantea "retención y purge físico" — fuera de scope MVP.                                                                            | Riesgo de scope creep.                                                                    | Mover a Out of Scope.                                                                                                                     |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Enforcement server-side de ownership e idempotencia.                        |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed extendido de US-043.                                         |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                         |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                         |
| No introduce P4/Future scope         | Pass      | Hard delete físico explícitamente fuera de scope.                          |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                                                                       | Acción recomendada                                                                                                                                                                                                                                       |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No menciona `status='deleted'`, `deleted_by`, `deletion_reason`, log ni `204`.                                            | Reescribir: "Given un attachment propio activo, When DELETE, Then `attachments.status='deleted'`, `deleted_at=NOW()`, `deleted_by=currentUser.id`, `deletion_reason` persistido (o null), `204 No Content`, log `vendor.portfolio.deleted`."              |
| EC-01 | Needs Detail | Mezcla 403 con 404.                                                                                                        | Tras Q1, decidir: si el endpoint es `/portfolio/images/:imageId`, **`404` cuando el attachment no pertenece al vendor** (no revela existencia) y `404` también para attachment inexistente o ya soft-deleted (Q4).                                       |

Faltan AC para:
- Bloqueo en `hidden` (Q3).
- Soft-deleted del perfil (Q3).
- Ya soft-deleted (Q4).
- Body con `deletion_reason` opcional (Q2).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones PO (Q1–Q4).

### Backend / API
- Endpoint canónico no formalizado (Q1).
- Body con `deletion_reason` no especificado (Q2).
- Política por status del perfil (Q3).
- Idempotencia (Q4).

### Frontend / UX
- Falta modal de confirmación accesible.
- Falta input para `deletion_reason` (textarea opcional).

### Base de Datos
- Sin cambios: confirmar columnas `status`, `deleted_at`, `deleted_by`, `deletion_reason` (ya entregadas por PB-P0-001).

### Seguridad / Autorización
- Ownership por sesión: SEC-01 OK.
- Sin AdminAction necesario para acción vendor-driven.

### IA / PromptOps
- No aplica.

### QA / Testing
- Añadir TS para `404` idempotente y `409 PROFILE_HIDDEN`.

### Seed / Demo
- Reuso del seed de US-043 (vendor con 9 imágenes para borrar una).

### Documentación / Trazabilidad
- Corregir FR/UC/NFR.
- Documentar `DELETE` en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                  | Bloquea aprobación | Responsable |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO/Tech  | **Q1** — Forma del endpoint dado que no existe entidad `vendor_work`. Recomendado: `DELETE /api/v1/vendors/me/portfolio/images/:imageId`. El `attachment.id` es UUID único; no requiere `work_label` en path.                              | Sí                 | PO/Tech     |
| PO       | **Q2** — `deletion_reason` requerido u opcional. Recomendado: **opcional** vía body `{ "deletion_reason": string? }` (1..500 chars). Persistido null si ausente.                                                                            | Sí                 | PO          |
| PO       | **Q3** — Política por status del `VendorProfile`. Recomendado: permitido en `pending`/`approved`/`rejected`; bloqueado en `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted del perfil (`404`).                                                | Sí                 | PO          |
| PO       | **Q4** — Comportamiento cuando el attachment ya está soft-deleted. Recomendado: **`404 Not Found`** (idempotente desde la perspectiva del cliente: el recurso "no existe").                                                                | Sí                 | PO          |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-008`         | La US cita `FR-VENDOR-009` (VendorService).                                  | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/8 §UC-VENDOR-005`         | La US cita `UC-VENDOR-009`.                                                  | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/10 §NFR-DATA-008/OBS-005` | La US cita `NFR-SEC-008` (API keys IA).                                      | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/16 §M07`                  | Falta documentar `DELETE` con body opcional y errores.                       | Documentar tras Q1–Q4.                  | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-048-soft-delete-portfolio-image.md`                       |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-048-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-048-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 4 decisiones PO/Tech bloqueantes (endpoint, `deletion_reason`, política por status, idempotencia) y trazabilidad estructuralmente incorrecta. |

---

## 10. Cambios Aplicados o Recomendados

(Se aplicarán tras Decision Resolver.)

### Metadata
- Añadir `Backlog Item: PB-P1-026`.
- `Status: Ready for Approval`.
- `Last Updated: 2026-06-26`.

### Business Context
- Aclaración: el modelo es polimórfico (`attachments` + `status`).

### PO/BA Decisions Applied
- Sección con D1–D4.

### Traceability
- `FR-VENDOR-009` → `FR-VENDOR-008`.
- `UC-VENDOR-009` → `UC-VENDOR-005`.
- `NFR-SEC-008` → `NFR-DATA-008, NFR-OBS-005`.
- Añadir `BR-PRIVACY-011`, `C-037`, `C-060`.

### Acceptance Criteria
- Reescribir AC-01 y EC-01.
- Añadir EC para `hidden`, soft-deleted del perfil y ya soft-deleted.

### Technical Notes
- Backend: use case con verificación previa y update único (no requiere `prisma.$transaction` necesariamente).
- API: documentar request body opcional.

### QA Notes
- Añadir TS para idempotencia, hidden, soft-deleted del perfil.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- Auditoría log + i18n + accesibilidad confirmación.

### Notes
- Mover "retención y purge físico" a Out of Scope.

---

## 11. Recomendación Final

`Needs Refinement`.

US-048 captura la regla #19 de Decisión PO 8.1 pero requiere resolución explícita de cuatro decisiones PO/Tech y corrección de trazabilidad antes de poder aprobarse. Tras `eventflow-po-ba-decision-resolver`, revalidar y aprobar.

```text
User Story file updated: No
Path: management/user-stories/US-048-soft-delete-portfolio-image.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-048-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
