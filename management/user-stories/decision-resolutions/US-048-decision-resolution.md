# PO/BA Decision Resolution — US-048

## Source User Story File
management/user-stories/US-048-soft-delete-portfolio-image.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-048-refinement-review.md

## Decision Date
2026-06-26

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-048                                                                           |
| User Story file path                         | management/user-stories/US-048-soft-delete-portfolio-image.md                    |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-048-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-026 — Portafolio del vendor (10 imágenes / trabajo)                       |
| Epic                                         | EPIC-VND-001                                                                     |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 4 (Q1–Q4)                                                                        |
| Decisiones PO/BA tomadas                     | 4                                                                                |
| Decisiones técnicas recomendadas             | 0 (derivadas de docs y de la decisión D1 de US-043)                              |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-048-decision-resolution.md       |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Forma del endpoint

### Pregunta original

> Forma del endpoint dado que no existe entidad `vendor_work`.

### Respuesta PO/BA

`DELETE /api/v1/vendors/me/portfolio/images/:imageId`.

### Decisión formal

```text
El endpoint canónico es `DELETE /api/v1/vendors/me/portfolio/images/:imageId`. `:imageId` es el UUID del `attachment.id`. El backend verifica que el attachment pertenece al `vendor_profile` derivado de la sesión y que es de tipo portafolio (`owner_type='vendor_work'`). No se requiere `work_label` en el path porque `attachment.id` es único.
```

### Rationale

`attachment.id` es UUID único; agregar `:workLabel` al path lo haría redundante y permitiría inconsistencias (cliente envía label que no corresponde al `imageId`). El path canónico es jerárquico al recurso lógico (`portfolio` → `images` → `:imageId`).

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D1.                                                                       |
| Acceptance Criteria     | AC-01 con el endpoint nuevo.                                                     |
| Technical Notes         | Backend: route + use case con verificación de ownership.                         |
| API                     | Endpoint definitivo.                                                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — `deletion_reason` opcional

### Pregunta original

> `deletion_reason` requerido u opcional.

### Respuesta PO/BA

**Opcional**.

### Decisión formal

```text
El endpoint acepta opcionalmente un body JSON `{ "deletion_reason": string }` con `1..500` caracteres. Si el body está ausente o `deletion_reason` no se incluye, se persiste `null`. Si está presente pero excede 500 caracteres, `400 INVALID_DELETION_REASON`.
```

### Rationale

Permite al vendor justificar la eliminación cuando lo desee (útil para audit/QA) sin imponer fricción adicional en el flujo común.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D2.                                                                       |
| Acceptance Criteria     | AC con body opcional.                                                            |
| Validation Rules        | VR para `deletion_reason`.                                                       |
| API                     | Request body documentado.                                                        |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Política por status del `VendorProfile`

### Pregunta original

> Política por status del `VendorProfile`.

### Respuesta PO/BA

* `pending`/`approved`/`rejected` → permitido.
* `hidden` → `409 PROFILE_HIDDEN`.
* `deleted_at IS NOT NULL` → `404`.

### Decisión formal

```text
`DELETE /api/v1/vendors/me/portfolio/images/:imageId` está permitido cuando `vendor_profile.status ∈ {pending, approved, rejected}` y `deleted_at IS NULL`. Bloqueado con `409 PROFILE_HIDDEN` en `hidden` y con `404` si el perfil está soft-deleted.
```

### Rationale

Consistente con US-041 D3, US-042 D4 y US-043 D3. `hidden` es admin-driven; soft-deleted del perfil indica que el vendor ya no existe en el dominio público.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D3.                                                                       |
| Acceptance Criteria     | Añadir EC para `hidden` y soft-deleted del perfil.                              |
| Authorization & Security| SEC política por status.                                                         |
| Test Scenarios          | AUTH-TS-03 y AUTH-TS-04.                                                          |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Idempotencia / ya soft-deleted

### Pregunta original

> Comportamiento cuando el attachment ya está soft-deleted.

### Respuesta PO/BA

**`404 Not Found`** (el recurso "no existe" desde la perspectiva del cliente).

### Decisión formal

```text
Si el attachment existe pero `status='deleted'`, el backend responde `404 Not Found` con `{ error: { code: 'ATTACHMENT_NOT_FOUND' } }`. Mismo trato que un `imageId` inexistente o que un attachment perteneciente a otro vendor (no se revela existencia ajena).
```

### Rationale

Idempotencia perceptual + consistencia de seguridad: el cliente no puede distinguir entre "ya borrado", "nunca existió" y "ajeno". Esto evita filtración de información y elimina ambigüedad de comportamiento ante reintentos.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D4.                                                                       |
| Acceptance Criteria     | EC para attachment ya soft-deleted.                                              |
| Test Scenarios          | TS de idempotencia (segundo DELETE → 404).                                       |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                              | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Endpoint                           | `DELETE /api/v1/vendors/me/portfolio/images/:imageId` (UUID).                                                                                                         | PO/Tech | Sí                     | No                   |
|  2 | `deletion_reason`                   | Opcional, `1..500` chars; ausente ⇒ null; excede ⇒ `400 INVALID_DELETION_REASON`.                                                                                    | PO      | Sí                     | No                   |
|  3 | Política por status                | `pending`/`approved`/`rejected` permitido; `hidden` `409 PROFILE_HIDDEN`; soft-deleted del perfil `404`.                                                              | PO      | Sí                     | No                   |
|  4 | Idempotencia / ya soft-deleted     | `404 ATTACHMENT_NOT_FOUND`. Mismo trato que `imageId` inexistente o ajeno.                                                                                            | PO      | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Backlog Item: PB-P1-026`.
- `Status: Ready for Approval`.
- `Last Updated: 2026-06-26`.

### Business Context
- Aclaración del modelo polimórfico.

### PO/BA Decisions Applied
- Sección con D1–D4.

### Traceability
- `FR-VENDOR-009` → `FR-VENDOR-008`.
- `UC-VENDOR-009` → `UC-VENDOR-005`.
- `NFR-SEC-008` → `NFR-DATA-008, NFR-OBS-005`.
- Añadidos `BR-PRIVACY-011`, `C-037`, `C-060`.

### Scope Guardrails
- Out of Scope: hard delete físico, retención/purge físico, restauración del attachment, edición de `deletion_reason` post-delete.

### Acceptance Criteria
- AC-01 reescrito con efectos completos y `204 No Content`.
- EC para `hidden`, soft-deleted del perfil, ya soft-deleted, `deletion_reason` inválido.

### Technical Notes
- Backend: `SoftDeleteAttachmentUseCase` con verificación previa de ownership y status.
- DB: update único (`status='deleted'`, `deleted_at`, `deleted_by`, `deletion_reason`).
- API: request body opcional documentado.

### QA Notes
- TS de idempotencia, hidden, soft-deleted del perfil, body inválido, accesibilidad del modal de confirmación.

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- Modal de confirmación accesible, log estructurado, i18n 4 locales.

### Notes
- "Retención y purge físico" movidos a Out of Scope.

---

## 5. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-008`         | La US citaba `FR-VENDOR-009`.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/8 §UC-VENDOR-005`         | La US citaba `UC-VENDOR-009`.                                                | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/10 §NFR-DATA-008/OBS-005` | La US citaba `NFR-SEC-008`.                                                  | Trazabilidad corregida.                | Housekeeping cerrado.                                              | No                   |
| `docs/16 §M07`                  | Falta documentar `DELETE` con request body opcional y errores.               | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-048-soft-delete-portfolio-image.md`                    |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-048-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 4/4 decisiones PO formalizadas y aplicadas. Trazabilidad corregida.                |

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
Path: management/user-stories/US-048-soft-delete-portfolio-image.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-048-decision-resolution.md
Next step: Run `eventflow-user-story-approval` (o revalidación con `eventflow-user-story-refinement`).
```
