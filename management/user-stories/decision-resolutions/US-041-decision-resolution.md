# PO/BA Decision Resolution — US-041

## Source User Story File
management/user-stories/US-041-edit-vendor-profile.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-041-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-041                                                                                                         |
| Cantidad de preguntas revisadas              | 5 (Q1–Q5)                                                                                                      |
| Decisiones PO/BA tomadas                     | 5                                                                                                              |
| ¿Desbloquea aprobación?                      | Sí                                                                                                             |
| User Story file updated                      | Yes                                                                                                            |
| Próximo paso                                  | Run `eventflow-user-story-approval`                                                                            |

---

## 2. Decisiones Respondidas

### D1 — Campos mayores: `business_name` y `location_id`

Para US-041, los **campos mayores** (los que disparan transición de estado) son:
* `business_name`
* `location_id`

Los siguientes son **menores** (no disparan re-pending):
* `bio`
* `languages_supported`

Categorías y servicios principales viven en US-042 y US-043+ respectivamente y no se editan vía `PATCH /vendors/me` de US-041. Visibilidad (`status='hidden'`) es admin-driven (US futura).

**Rationale**: PB-P1-024 Acceptance Summary lista los mayores; categorías/servicios se delegan a sus propias US; bio/languages son contenido editorial sin impacto en la identificación pública.

### D2 — Trigger automático en PATCH

Si el body del `PATCH /api/v1/vendors/me` incluye al menos un **campo mayor** (D1) Y el `status` actual es `approved`, el handler:
1. Aplica los cambios.
2. Transiciona `status: approved → pending` en la misma transacción.
3. Persiste `AdminAction(action='vendor_pending_after_major_edit', actor=vendor)` para auditoría.
4. Emite log `vendor.profile.repending`.
5. Response 200 con `repending=true` para que la UI muestre banner "Tu perfil pasó a revisión por cambios mayores".

Si `status` actual es `pending`, los cambios mayores se aplican sin transición (ya está en revisión).
Si `status` actual es `rejected`, todos los PATCHs son bloqueados (Q3 cubre `hidden`); el vendor debe usar `POST /vendors/me/submit-approval` para re-someter tras corregir.

**Rationale**: Automático garantiza coherencia con la regla de visibilidad (`BR-VENDOR-001`); evita que un perfil aprobado con `business_name` o ciudad cambiados quede público sin revisión.

### D3 — Edits bloqueados en `hidden`

`status='hidden'` ⇒ todos los PATCH/DELETE retornan `409 PROFILE_HIDDEN`. El vendor debe contactar al admin para restaurar.

**Rationale**: `hidden` es estado admin-driven (US futura admin); editar mientras hidden quitaría la decisión del admin.

### D4 — Soft delete in-scope: `DELETE /api/v1/vendors/me`

US-041 incluye el endpoint `DELETE /api/v1/vendors/me`:
1. Setea `vendor_profile.deleted_at = NOW()`, `deleted_by = currentUser.id`.
2. El perfil deja de ser visible en el directorio público.
3. NO se hard-deletea; se preserva para auditoría y referencias históricas (BookingIntents pasados, Reviews).
4. Permitido en estados `pending`, `approved`, `rejected`. Bloqueado en `hidden` (D3) y si ya está `deleted_at IS NOT NULL`.
5. Confirmación modal en frontend obligatoria.

Reverso (recuperar perfil soft-deleted) es **Out of Scope** para US-041 (Future / admin tool).

**Rationale**: PB-P1-024 Acceptance Summary lo lista explícitamente. Soft delete preserva integridad referencial con BookingIntents/Reviews históricos.

### D5 — Slug inmutable

Una vez creado, `vendor_profile.slug` es **inmutable** en US-041. Cambios de `business_name` actualizan el display pero NO regeneran slug. La rotación de slug queda para US futura con migración de redirects 301.

**Rationale**: SEO + permalinks. Cambiar el slug rompería URLs públicas y eventuales bookmarks.

---

## 3. Decisiones Consolidadas

|  # | Tema                     | Decisión                                                                                                              | Tipo | ¿Bloqueaba? |
| -: | ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---- | ----------- |
|  1 | Campos mayores            | `business_name`, `location_id`. Menores: `bio`, `languages_supported`.                                                  | PO   | Sí          |
|  2 | Trigger re-pending        | Auto al PATCH si body contiene mayor + status=`approved` ⇒ transición a `pending` + AdminAction + log.                  | PO   | Sí          |
|  3 | Edits en `hidden`         | Bloqueados con `409 PROFILE_HIDDEN`.                                                                                    | PO   | Sí          |
|  4 | Soft delete               | In-scope: `DELETE /vendors/me` con `deleted_at`/`deleted_by`. Permitido en pending/approved/rejected. Bloqueado en hidden. | PO | Sí          |
|  5 | Slug                      | Inmutable post-creación.                                                                                                | PO   | Sí          |

---

## 4. Documentation Alignment Required

| Documento | Conflicto | Acción | Bloquea |
|---|---|---|---|
| `docs/10` | `NFR-PERF-API-001` no existe. | Housekeeping `NFR-PERF-001`. | No |
| `docs/16 §M07` | PATCH/DELETE shape y comportamiento `repending=true` deben documentarse. | Actualizar. | No |
| `docs/4 §BR-VENDOR-003` | Transición auto a `pending` por cambio mayor. | Nota interpretativa D2. | No |
| `docs/4 §BR-VENDOR-002` | Slug inmutable (D5). | Nota. | No |
| `docs/16 §error format` | Códigos nuevos: `PROFILE_HIDDEN`, `PROFILE_DELETED`. | Catálogo. | No |

---

## 5. Estado recomendado

`Ready for Approval`. Las 5 decisiones cierran PB-P1-024 sin Future. US-041 actualizada en sitio.

---

User Story file updated: Yes
Path: management/user-stories/US-041-edit-vendor-profile.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-041-decision-resolution.md
Next step: Run `eventflow-user-story-approval`.
