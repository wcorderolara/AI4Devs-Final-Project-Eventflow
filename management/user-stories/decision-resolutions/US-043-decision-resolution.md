# PO/BA Decision Resolution — US-043

## Source User Story File
management/user-stories/US-043-upload-portfolio-images.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-043-refinement-review.md

## Decision Date
2026-06-26

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-043                                                                           |
| User Story file path                         | management/user-stories/US-043-upload-portfolio-images.md                        |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-043-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-026 — Portafolio del vendor (10 imágenes / trabajo)                       |
| Epic                                         | EPIC-VND-001                                                                     |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 6 (Q1–Q6)                                                                        |
| Decisiones PO/BA tomadas                     | 6                                                                                |
| Decisiones técnicas recomendadas             | 0 (derivadas de docs aprobados: §14 Backend Tech Design + §18 DB + §19 Security) |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-043-decision-resolution.md       |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Forma del endpoint (sin entidad `vendor_work`)

### Pregunta original

> Forma del endpoint dado que no existe entidad `vendor_work`.

### Respuesta PO/BA

`POST /api/v1/vendors/me/portfolio/works/:workLabel/images` con `multipart/form-data` (campo `file`). `:workLabel` se valida en el path; `owner_id = vendor_profile.id` derivado de la sesión.

### Decisión formal

```text
El endpoint canónico es `POST /api/v1/vendors/me/portfolio/works/:workLabel/images` con multipart/form-data y único campo `file`. No existe entidad `vendor_work`. La persistencia usa la tabla polimórfica `attachments` con `owner_type='vendor_work'`, `owner_id = vendor_profile.id` (derivado de la sesión), `work_label = :workLabel`.
```

### Rationale

El modelo aprobado (`docs/6 §VendorProfile` + `docs/18 §19`) implementa el portafolio vía `attachments` polimórfico. Exponer `:workLabel` en el path es REST-coherente (jerarquía clara `vendor → portfolio → work → images`) y permite reusar el índice parcial `idx_attachments_vendor_work_active`.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D1.                                                                       |
| Acceptance Criteria     | AC-01 reescrito con shape del endpoint y persistencia.                          |
| Technical Notes         | Backend: endpoint canónico + uso de tabla polimórfica.                          |
| API                     | Tabla actualizada con request/response.                                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Tamaño máximo por imagen

### Pregunta original

> Tamaño máximo por imagen.

### Respuesta PO/BA

**5 MB**.

### Decisión formal

```text
Tamaño máximo por archivo subido: 5 MB (5 × 1024 × 1024 bytes). Excedido ⇒ `413 FILE_TOO_LARGE`.
```

### Rationale

5 MB es práctico para fotografías de portafolio en JPEG/PNG/WebP y es compatible con el upload middleware del proyecto (multer + límite global). Coherente con expectativa de demo y prevención de abuso.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D2.                                                                       |
| Acceptance Criteria     | EC-02 con `413 FILE_TOO_LARGE`.                                                 |
| Validation Rules        | VR-02 con `≤ 5 MB`.                                                              |
| Technical Notes         | Backend: límite multer + verificación post-disk.                                |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Política por status del `VendorProfile`

### Pregunta original

> Política por status del `VendorProfile`.

### Respuesta PO/BA

* `pending` → permitido (vendor durante onboarding, necesario para someter portafolio).
* `approved` → permitido.
* `rejected` → permitido (vendor corrige y re-somete).
* `hidden` → bloqueado con `409 PROFILE_HIDDEN` (consistente con US-041 D3).
* `deleted_at IS NOT NULL` → `404`.

### Decisión formal

```text
`POST /vendors/me/portfolio/works/:workLabel/images` está permitido cuando `vendor_profile.status ∈ {pending, approved, rejected}` y `deleted_at IS NULL`. Bloqueado con `409 PROFILE_HIDDEN` en `hidden` y con `404` si el perfil está soft-deleted.
```

### Rationale

Habilitar `pending` es necesario para que el vendor complete su perfil antes de ser aprobado. `hidden` y soft-deleted ya están normalizados como bloqueantes en US-041/US-042.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D3.                                                                       |
| Acceptance Criteria     | Añadir EC para `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted (`404`).          |
| Authorization & Security| SEC-05 política por status.                                                     |
| Test Scenarios          | AUTH-TS-03 y AUTH-TS-04.                                                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Resize básico

### Pregunta original

> Resize básico in-scope o future.

### Respuesta PO/BA

**In-scope**. Resize server-side con `sharp`: long-edge ≤ 2048 px, JPEG quality 80, conservando aspect ratio, generando una sola variante (original soft-deleted/temporal).

### Decisión formal

```text
Toda imagen aceptada se pasa por una pipeline server-side con `sharp` que produce una única variante con long-edge ≤ 2048 px y JPEG quality 80, preservando aspect ratio. El binario resultante se persiste mediante `FileStoragePort` (con `LocalFileStorageAdapter` en MVP). No se generan thumbnails adicionales en MVP.
```

### Rationale

PB-P1-026 Acceptance Summary explicita "Tamaño máximo y resize básico". `sharp` es la opción canónica en Node.js. Una sola variante mantiene el alcance MVP sin pipeline de thumbnails.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D4.                                                                       |
| Acceptance Criteria     | AC con resize verificado.                                                        |
| Technical Notes         | Backend: dependencia `sharp`; pipeline en use case.                              |
| Test Scenarios          | TS para verificar long-edge ≤ 2048 px y MIME final.                             |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Reglas de `work_label`

### Pregunta original

> Reglas de `work_label` (longitud, charset, uniqueness).

### Respuesta PO/BA

`work_label` matches `^[a-zA-Z0-9\-_ ]{1,80}$`. Comparación entre grupos es **case-insensitive** (`LOWER(work_label)`); persistido tal como lo envía el vendor (preservar display). Sin uniqueness global; sí unique-por-vendor en la lógica de grupos.

### Decisión formal

```text
`work_label` valida `^[a-zA-Z0-9\-_ ]{1,80}$`. El backend agrupa por `LOWER(work_label)` dentro del set de attachments activos del vendor; persiste el valor original en `attachments.work_label`. Sin uniqueness global. Validación fallida ⇒ `400 INVALID_WORK_LABEL`.
```

### Rationale

Charset acotado evita XSS y URL-encoding issues en el path. Long edge 80 es suficiente para nombres descriptivos. Case-insensitive en comparación evita confusión entre `Boda-Pareja` y `boda-pareja` como dos grupos distintos.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D5.                                                                       |
| Validation Rules        | VR para `work_label`.                                                            |
| Acceptance Criteria     | Añadir EC para `400 INVALID_WORK_LABEL`.                                        |
| Technical Notes         | Backend: helper `normalizeWorkLabel` (lowercase).                               |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 6 — Máximo de `work_labels` distintos por vendor

### Pregunta original

> Máximo de `work_labels` distintos por vendor.

### Respuesta PO/BA

**20** `work_labels` distintos (en attachments activos) por vendor.

### Decisión formal

```text
El backend valida `COUNT(DISTINCT LOWER(work_label)) < 20` antes de crear un attachment con un `work_label` nuevo. Excedido ⇒ `409 WORK_LABEL_LIMIT_REACHED`. El conteo ignora attachments soft-deleted (`status='deleted'`).
```

### Rationale

20 trabajos distintos por vendor cubre el caso de uso MVP (un vendor experimentado documenta 10–20 eventos representativos) sin permitir spam. Compatible con la página pública del perfil sin necesidad de paginación.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D6.                                                                       |
| Acceptance Criteria     | AC adicional con `409 WORK_LABEL_LIMIT_REACHED`.                                |
| Validation Rules        | VR-04 (`work_label` count).                                                      |
| Test Scenarios          | NT y demo.                                                                       |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                            | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------- | -------------------- |
|  1 | Endpoint                           | `POST /api/v1/vendors/me/portfolio/works/:workLabel/images`. Persistencia vía `attachments(owner_type='vendor_work', owner_id=vendor_profile_id, work_label)`.       | PO/Tech | Sí                  | No                   |
|  2 | Tamaño máximo                      | 5 MB ⇒ `413 FILE_TOO_LARGE`.                                                                                                                                        | PO   | Sí                     | No                   |
|  3 | Política por status                | `pending`/`approved`/`rejected` permitido; `hidden` `409 PROFILE_HIDDEN`; soft-deleted `404`.                                                                       | PO   | Sí                     | No                   |
|  4 | Resize                             | In-scope. `sharp` long-edge ≤ 2048 px, JPEG quality 80, una sola variante.                                                                                          | PO   | Sí                     | No                   |
|  5 | `work_label`                       | `^[a-zA-Z0-9\-_ ]{1,80}$`. Comparación `LOWER`. Persistencia preserva display. `400 INVALID_WORK_LABEL`.                                                            | PO   | Sí                     | No                   |
|  6 | Máx `work_labels` distintos        | 20 ⇒ `409 WORK_LABEL_LIMIT_REACHED`.                                                                                                                                | PO   | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- Añadido `Backlog Item: PB-P1-026`.
- `Status: Ready for Approval`.
- `Last Updated: 2026-06-26`.

### Business Context
- Aclaración del modelo polimórfico; mención explícita a `attachments.owner_type='vendor_work'` + `work_label`.

### PO/BA Decisions Applied
- Sección nueva con D1–D6.

### Traceability
- `FR-VENDOR-004` → `FR-VENDOR-006, FR-VENDOR-007, FR-VENDOR-008`.
- `UC-VENDOR-004` → `UC-VENDOR-005`.
- `NFR-SEC-008` → `NFR-DATA-008, NFR-OBS-005`.
- Retirado `ADR-SEC-002`.
- Añadidos `BR-PRIVACY-011`, `C-022`.

### Scope Guardrails
- Out of Scope expandido (antimalware, watermarking, CDN, thumbnails múltiples, retención avanzada).

### Acceptance Criteria
- Reescritura completa de AC-01 y AC-02.
- Reescritura de EC-01 y EC-02 con códigos correctos.
- Nuevos EC para `hidden`, soft-deleted, `INVALID_WORK_LABEL`, `WORK_LABEL_LIMIT_REACHED`.
- Nuevo AC para resize verificado.

### Technical Notes
- `FileStoragePort` + `LocalFileStorageAdapter`.
- Pipeline `multer` (memoria) → validación MIME/magic-bytes → `sharp` → `FileStoragePort.save` → insert `attachments`.

### QA Notes
- TS y NT añadidos para todas las decisiones.
- A11Y test del dropzone con teclado.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- Resize verificado, log `vendor.portfolio.uploaded`, allowlist server-side + magic-bytes opcional, i18n 4 locales.

### Notes
- "Retención y CDN futuro" movido a Out of Scope.

---

## 5. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                                                  | Decisión vigente                                          | Acción recomendada                                                                                              | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-006/007/008` | La US referenciaba `FR-VENDOR-004` (categorías).                                                     | Trazabilidad corregida (D corrección).                    | Housekeeping cerrado.                                                                                            | No                   |
| `docs/8 §UC-VENDOR-005`         | La US referenciaba `UC-VENDOR-004`.                                                                  | Trazabilidad corregida.                                   | Housekeeping cerrado.                                                                                            | No                   |
| `docs/10 §NFR-DATA-008/OBS-005` | La US referenciaba `NFR-SEC-008` (API keys IA).                                                      | Trazabilidad corregida.                                   | Housekeeping cerrado.                                                                                            | No                   |
| `docs/22 §ADR-SEC-002`          | Citado innecesariamente.                                                                             | Retirado.                                                  | Housekeeping cerrado.                                                                                            | No                   |
| `docs/16 §M07`                  | Falta documentar el endpoint.                                                                        | Documentar tras D1.                                       | Actualizar `docs/16` con request/response/errors.                                                                | No                   |
| `docs/10`                       | No existe NFR específico para "tamaño máximo upload"; D2 lo formaliza.                                | 5 MB establecido como decisión PO de este flow.            | Considerar agregar NFR `NFR-PERF-UPLOAD-001` en futura iteración.                                                | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-043-upload-portfolio-images.md`                        |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-043-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 6/6 decisiones PO formalizadas y aplicadas. Trazabilidad corregida.                |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo de User Story actualizado.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Si no quedan blockers, ejecutar `eventflow-user-story-approval`.
```

```text
User Story file updated: Yes
Path: management/user-stories/US-043-upload-portfolio-images.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-043-decision-resolution.md
Next step: Run `eventflow-user-story-approval` (o revalidación con `eventflow-user-story-refinement`).
```
