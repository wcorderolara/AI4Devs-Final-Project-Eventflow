# User Story Refinement Review — US-043

## Source User Story File
management/user-stories/US-043-upload-portfolio-images.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-043-decision-resolution.md

## Review Date
2026-06-26 (revalidación: 2026-06-26)

## Revalidation Result (2026-06-26)
Q1–Q6 resueltas en `management/user-stories/decision-resolutions/US-043-decision-resolution.md`. La US-043 ahora declara `Backlog Item: PB-P1-026`, sección `PO/BA Decisions Applied` con D1–D6, trazabilidad corregida (`FR-VENDOR-006/007/008`, `UC-VENDOR-005`, `BR-VENDOR-005`, `BR-PRIVACY-011`, `NFR-DATA-008`, `NFR-OBS-005`, `C-022`), endpoint canónico `POST /api/v1/vendors/me/portfolio/works/:workLabel/images`, AC-01..AC-03 con resize verificado y persistencia polimórfica, EC-01..EC-06 con códigos correctos, VR-01..VR-07, SEC-01..SEC-06, TS-01..TS-04, NT-01..NT-07, AUTH-TS-01..AUTH-TS-07. No se detectan nuevos blockers. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-043                                                                    |
| File Path                                  | management/user-stories/US-043-upload-portfolio-images.md                 |
| Backlog Item                               | PB-P1-026 — Portafolio del vendor (10 imágenes / trabajo)                 |
| Epic                                       | EPIC-VND-001                                                              |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (modelo polimórfico vs entidad propia)                                 |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-043-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-043 entrega el upload de portafolio (Decisión PO 8.1 #2: hasta 10 imágenes por trabajo) y reutiliza correctamente la política de soft delete (Decisión PO 8.1 #19, cubierta por US-048). El esquema multipart con allowlist MIME server-side está bien encaminado. Sin embargo, hay varios problemas estructurales que impiden marcar la historia como `Ready for Approval`:

1. **Trazabilidad incorrecta**: cita `FR-VENDOR-004` (que es "category change count"), `UC-VENDOR-004` (no aplica al portafolio), `NFR-SEC-008` (sobre API keys de IA) y `ADR-SEC-002` (HTTP-only cookies). Las trazas correctas son **`FR-VENDOR-006`** (10 imágenes), **`FR-VENDOR-007`** (`work_label`), **`FR-VENDOR-008`** (soft delete) y **`UC-VENDOR-005`**. NFR correcto: **`NFR-DATA-008`** (soft delete) y **`NFR-OBS-005`** (logs).
2. **Endpoint inconsistente con el modelo de datos**: el draft propone `POST /api/v1/vendors/me/works/:id/images`, asumiendo una tabla `vendor_work` con `:id`. El modelo aprobado (`docs/6 §VendorProfile` + `docs/18 §19`) implementa portafolio vía la tabla polimórfica `attachments` con `owner_type='vendor_work'` + `owner_id = vendor_profile_id` + `work_label`. No existe entidad `vendor_work` con PK propia.
3. **Falta declarar `Backlog Item: PB-P1-026`**.
4. **Tamaño máximo (5MB)** propuesto no está respaldado por documentación: requiere confirmación PO.
5. **Estados permitidos del `VendorProfile`** no se aclaran: ¿se puede subir portafolio en `pending` (durante onboarding)? ¿En `rejected`? ¿`hidden`?
6. **Resize básico** está en `PB-P1-026` Acceptance Summary ("Tamaño máximo y resize básico") pero la US no lo incluye.
7. **`work_label`** sin reglas (longitud, charset, máximo de labels distintos por vendor).
8. **AC-01 ambiguo**: dice "crea `vendor_work`" como si fuera entidad, cuando en realidad sólo agrupa por `work_label`.
9. **Auditoría / logs**: la US dice "Log Event Required: Yes" pero no nombra el evento ni los campos.
10. **Almacenamiento físico**: falta especificar que se usa `FileStoragePort` con `LocalFileStorageAdapter` (Notes de PB-P1-026, `docs/14 §4.2.10`).
11. **C-022** (constraint de service layer) no se cita.
12. **Listado/lectura del portafolio**: la US no aclara si se entrega un GET correspondiente o si vive en US-048/US-047 (lectura pública). Mejor confirmar con PO el alcance exacto.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                            | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Endpoint `POST /api/v1/vendors/me/works/:id/images` asume una entidad `vendor_work` con PK; el modelo aprobado usa `attachments` polimórfico con `work_label`.        | Implementación imposible tal como está escrita; los devs adoptarán formas inconsistentes.                                                | Resolver Q1 (PO/Tech). Recomendado: `POST /api/v1/vendors/me/portfolio/images` con `work_label` en body (multipart field) o `POST /api/v1/vendors/me/portfolio/works/:workLabel/images`. Reflejar en `docs/16 §M07`.                            |
| Alta      | Tamaño máximo por imagen (5MB) no está formalizado en docs.                                                                                                          | Implementación arbitraria.                                                                                                              | Resolver Q2 (PO). Recomendado: **5 MB** (alineado con la decisión PO 8.1 #2 implícita y con la práctica del MVP). Confirmar y registrar en `docs/10` (nuevo NFR-PERF-UPLOAD-XXX si aplica).                                                     |
| Alta      | Política de uploads por status del `VendorProfile` no definida.                                                                                                       | Riesgo de bloquear onboarding (no se puede subir portafolio en `pending`) o de permitir uploads en `hidden`/soft-deleted.                | Resolver Q3 (PO). Recomendado: **permitido en `pending`, `approved`, `rejected`**; **bloqueado en `hidden`** (`409 PROFILE_HIDDEN`, consistente con US-041 D3/US-042 D4) y soft-deleted (`404`).                                                |
| Alta      | Resize básico no incluido pese a estar en PB-P1-026 Acceptance Summary.                                                                                              | Falta una capacidad acordada.                                                                                                          | Resolver Q4 (PO). Recomendado: **incluir resize básico server-side** (long-edge ≤ 2048 px, jpeg quality 80, manteniendo aspect ratio). Reuso de `sharp` o equivalente.                                                                          |
| Alta      | `work_label` sin reglas (longitud/charset/uniqueness por vendor).                                                                                                     | Inconsistencia entre uploads.                                                                                                          | Resolver Q5 (PO). Recomendado: `work_label` `^[a-zA-Z0-9\-]{1,80}$`, libre por vendor (sin uniqueness global), insensible a mayúsculas para comparación de grupos.                                                                              |
| Alta      | Máximo de `work_labels` distintos por vendor sin definir.                                                                                                            | Riesgo de spam.                                                                                                                        | Resolver Q6 (PO). Recomendado: **20 work_labels distintos máximo por vendor** (compatible con catálogo MVP).                                                                                                                                   |
| Alta      | Trazabilidad incorrecta: FR-VENDOR-004, UC-VENDOR-004, NFR-SEC-008, ADR-SEC-002 no aplican.                                                                          | Trazabilidad rota; aprobación inválida.                                                                                                | Reemplazar por **`FR-VENDOR-006`, `FR-VENDOR-007`, `FR-VENDOR-008`**, **`UC-VENDOR-005`**, **`NFR-DATA-008`, `NFR-OBS-005`** y retirar `ADR-SEC-002` (no relevante para esta historia).                                                          |
| Media     | Falta declarar `Backlog Item: PB-P1-026`.                                                                                                                            | Trazabilidad incompleta.                                                                                                                | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | AC-01 mezcla "crear vendor_work" con "subir imágenes". `vendor_work` no es entidad.                                                                                  | AC no testeable.                                                                                                                       | Reescribir AC-01 para que represente upload con `work_label` en el body.                                                                                                                                                                       |
| Media     | Falta especificar `FileStoragePort` + `LocalFileStorageAdapter` en Technical Notes.                                                                                  | Pérdida de alineación arquitectónica.                                                                                                  | Añadir en Backend Notes.                                                                                                                                                                                                                       |
| Media     | Falta nombrar el evento de log (`vendor.portfolio.uploaded`) y `correlation_id`.                                                                                      | Observabilidad subespecificada.                                                                                                        | Añadir en Observability.                                                                                                                                                                                                                       |
| Media     | Falta cita de `C-022` (constraint de service layer ≤ 10).                                                                                                            | Trazabilidad de constraint incompleta.                                                                                                  | Añadir en Traceability.                                                                                                                                                                                                                        |
| Baja      | `Notes` plantea "retención y CDN futuro" — fuera de scope MVP.                                                                                                       | Riesgo de scope creep si se interpreta como pendiente.                                                                                  | Mantener como Out of Scope.                                                                                                                                                                                                                    |
| Baja      | `Currency Notes` "No aplica" correcto.                                                                                                                                | —                                                                                                                                       | —                                                                                                                                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                                                       |
| Respeta backend como source of truth | Pass      | Enforcement server-side de límite, MIME y tamaño.                                                                  |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-040 + extensión opcional.                                                                     |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                                                                |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                                                                |
| No introduce P4/Future scope         | Pass      | Antimalware y watermarking explícitamente fuera de scope.                                                          |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad           | Problema detectado                                                                                              | Acción recomendada                                                                                                                                                                                                                                                                              |
| ----- | ----------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail      | "Crea `vendor_work`" implica entidad. Falta detallar respuesta, persistencia (`status='active'`) y `work_label`. | Reescribir: "Given vendor con `status ∈ {pending,approved,rejected}`, When envía multipart con `work_label` y archivo válido, Then se persiste `attachments(owner_type='vendor_work', owner_id=vendor_profile_id, work_label, status='active', mime, size_bytes, storage_url)` y devuelve `201` con el recurso." |
| AC-02 | Needs Detail      | Falta especificar mensaje y conteo persistido sin incremento.                                                    | Tras Q1, reescribir: "Given 10 attachments activos en `(owner_id, work_label)`, When intenta upload 11, Then `409 IMAGE_LIMIT_REACHED` y no se crea registro ni archivo." |
| EC-01 | Needs Detail      | Falta nombrar MIME no permitidos y mensaje claro.                                                                 | Reescribir con `400 INVALID_MIME` y allowlist explícita `image/jpeg|image/png|image/webp`. |
| EC-02 | Needs Detail      | Falta tamaño confirmado y `413` (más adecuado).                                                                    | Tras Q2: "tamaño > 5 MB → `413 FILE_TOO_LARGE`". |

Faltan AC para:
- Bloqueo en `hidden` (Q3): `409 PROFILE_HIDDEN`.
- Vendor soft-deleted: `404`.
- Tope de `work_labels` distintos (Q6): `409 WORK_LABEL_LIMIT_REACHED`.
- Validación de `work_label` (Q5): `400 INVALID_WORK_LABEL`.
- Resize básico (Q4): respuesta incluye dimensiones finales.

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan reglas operativas concretas (Q1–Q6).

### Backend / API
- `FileStoragePort` + `LocalFileStorageAdapter` no citados.
- Path layout y URL pattern no especificados (sugerido `/api/v1/attachments/raw/<id>`).
- Resize pipeline (Q4) no especificado.
- AdminAction no requerido para uploads (consistente con `Notes`); aclarar.

### Frontend / UX
- Falta texto de contador "N/10 cupos en este trabajo".
- Falta UX para gestión de `work_label` (creación inline vs catálogo del vendor).
- Falta empty state cuando vendor no tiene works aún.

### Base de Datos
- Confirmar índice parcial `idx_attachments_vendor_work_active` (existente).
- Confirmar enum `attachment_status` y `attachment_owner_type` (existentes).
- Confirmar columnas `deletion_reason`, `deleted_by`, `deleted_at`, `uploaded_by`, `mime`, `size_bytes`, `storage_url`.

### Seguridad / Autorización
- Confirmar SEC-POL-UPLOAD-001 (allowlist MIME) + magic-bytes opcional (`docs/14 §upload`).
- Sin ejecución de archivos: validar `Content-Disposition: attachment` en endpoint de descarga (US futura).

### IA / PromptOps
- No aplica.

### QA / Testing
- Añadir TS para `409 PROFILE_HIDDEN`, `404`, `WORK_LABEL_LIMIT_REACHED`, `INVALID_WORK_LABEL`.
- Añadir security tests para magic-bytes/path traversal.

### Seed / Demo
- Vendor demo con 9 imágenes en un work y 10 en otro para mostrar el bloqueo.

### Documentación / Trazabilidad
- Corregir FR/UC/NFR/ADR.
- Documentar el endpoint en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                                                                | Bloquea aprobación | Responsable |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ----------- |
| PO/Tech  | **Q1** — Forma del endpoint dado que no existe entidad `vendor_work`. Recomendado: `POST /api/v1/vendors/me/portfolio/works/:workLabel/images` con multipart `file`, y `work_label` validado por path param; alternativa: cuerpo `multipart` con `work_label` field.                       | Sí                 | PO/Tech     |
| PO       | **Q2** — Tamaño máximo por imagen. Recomendado: **5 MB**.                                                                                                                                                                                                                                | Sí                 | PO          |
| PO       | **Q3** — Política por status del `VendorProfile`. Recomendado: permitido en `pending`, `approved`, `rejected`; bloqueado en `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted (`404`).                                                                                                          | Sí                 | PO          |
| PO       | **Q4** — Resize básico in-scope o future. Recomendado: **in-scope** con `sharp` (`long-edge ≤ 2048 px`, JPEG quality 80, conserva aspect ratio). Acceptance Summary de PB-P1-026 lo lista.                                                                                                | Sí                 | PO          |
| PO/BA    | **Q5** — Reglas de `work_label`. Recomendado: `^[a-zA-Z0-9\-_ ]{1,80}$`, normalización lowercase para comparación de grupos, sin uniqueness global.                                                                                                                                       | Sí                 | PO/BA       |
| PO       | **Q6** — Máximo de `work_labels` distintos por vendor. Recomendado: **20**.                                                                                                                                                                                                              | Sí                 | PO          |

---

## 8. Documentation Alignment Required

| Documento / Fuente                | Conflicto detectado                                                                                                                          | Decisión vigente                                                              | Acción recomendada                                                                                                                       | ¿Bloquea aprobación? |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-006/007/008`   | La US cita `FR-VENDOR-004` incorrectamente.                                                                                                  | Resolución durante refinement post-Decision Resolver.                          | Corregir trazabilidad en US.                                                                                                              | No                   |
| `docs/8 §UC-VENDOR-005`           | La US cita `UC-VENDOR-004` incorrectamente.                                                                                                  | Corregir.                                                                      | Corregir trazabilidad en US.                                                                                                              | No                   |
| `docs/10 §NFR-DATA-008/OBS-005`   | La US cita `NFR-SEC-008` (sobre API keys de IA).                                                                                              | Reemplazar por NFRs relevantes.                                                | Corregir trazabilidad en US.                                                                                                              | No                   |
| `docs/22 §ADR-SEC-002`            | ADR-SEC-002 es sobre HTTP-only cookies; no es el ADR relevante para uploads.                                                                  | Retirar de Traceability salvo justificación específica.                        | Corregir.                                                                                                                                  | No                   |
| `docs/16 §M07`                    | Falta documentar `POST /api/v1/vendors/me/portfolio/...` con MIME allowlist, tamaño, response shape, error codes.                            | Documentar tras Q1–Q4.                                                        | Actualizar `docs/16` con el contrato resultante.                                                                                          | No                   |
| `docs/18 §15.1` + Schema           | Confirmar enum `attachment_status` y `attachment_owner_type`, columnas `deletion_reason`, `deleted_by`, `uploaded_by`, `mime`, `size_bytes`, `storage_url`. | Confirmar tras DB-001.                                                        | Verificación documental.                                                                                                                  | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-043-upload-portfolio-images.md`                          |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-043-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-043-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 6 decisiones PO/Tech bloqueantes (endpoint, tamaño, política por status, resize, reglas de `work_label`, máx work_labels) y trazabilidad estructuralmente incorrecta. |

---

## 10. Cambios Aplicados o Recomendados

(Se aplicarán tras Decision Resolver.)

### Metadata
- Añadir `Backlog Item: PB-P1-026`.
- `Status: Ready for Approval` tras revalidación.
- `Last Updated: 2026-06-26`.

### Business Context
- Aclarar modelo polimórfico (`attachments.owner_type='vendor_work'` + `work_label`); sin entidad `vendor_work` separada.

### PO/BA Decisions Applied
- Sección nueva con D1–D6.

### Traceability
- `FR-VENDOR-004` → `FR-VENDOR-006, FR-VENDOR-007, FR-VENDOR-008`.
- `UC-VENDOR-004` → `UC-VENDOR-005`.
- `NFR-SEC-008` → `NFR-DATA-008, NFR-OBS-005`.
- Retirar `ADR-SEC-002`.
- Añadir `BR-VENDOR-005`, `BR-PRIVACY-011`, `C-022`.

### Scope Guardrails
- Out of Scope confirmado: antimalware, watermarking, CDN, retención avanzada, listado público (US-029/US-047).

### Acceptance Criteria
- Reescribir AC-01 y AC-02 tras Q1.
- Reescribir EC-01 y EC-02 con códigos definitivos.
- Añadir AC: bloqueo `hidden`/soft-deleted, máx work_labels (Q6), validación `work_label` (Q5), resize (Q4).

### Technical Notes
- Backend: `FileStoragePort` + `LocalFileStorageAdapter`; pipeline upload con `sharp`; conteo previo C-022; multipart `multer`.
- Database: usar tabla `attachments` polimórfica.
- API: documentar `POST /api/v1/vendors/me/portfolio/works/:workLabel/images`.

### QA Notes
- Añadir TS para Q3 (`hidden`, soft-deleted), Q6 (límite work_labels), Q4 (resize verificado), Q5 (label inválido).

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- Añadir: log `vendor.portfolio.uploaded`, resize verificado, allowlist server-side + magic-bytes opcional, i18n 4 locales.

### Notes
- Mover "retención y CDN futuro" a Out of Scope.

---

## 11. Recomendación Final

`Needs Refinement`.

US-043 captura correctamente la regla #2 de Decisión PO 8.1 pero requiere resolución explícita de seis decisiones PO/Tech y corrección estructural de la trazabilidad antes de poder aprobarse. Tras `eventflow-po-ba-decision-resolver`, ejecutar revalidación y luego `eventflow-user-story-approval`.

```text
User Story file updated: No
Path: management/user-stories/US-043-upload-portfolio-images.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-043-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
