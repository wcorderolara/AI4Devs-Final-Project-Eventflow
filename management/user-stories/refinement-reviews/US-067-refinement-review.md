# User Story Refinement Review — US-067

## Source User Story File
management/user-stories/US-067-admin-moderate-review.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-067-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q9 resueltas. La US-067 declara `Backlog Item: PB-P1-040`, `PO/BA Decisions Applied` D1–D9, trazabilidad corregida (FR-REVIEW-003→FR-REVIEW-004/005/009 + FR-ADMIN-005 + FR-VENDOR-013; agregados BR-REVIEW-005/006/009, BR-ADMIN-003). Endpoint `POST /admin/reviews/:id/moderate` con AdminAction obligatorio + recálculo denormalize cross-domain + 4 columnas audit nuevas. AC-01..AC-04, EC-01..EC-05, VR-01..VR-07, SEC-01..SEC-06, NT-01..NT-09, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-067 |
| Backlog Item | PB-P1-040 — Moderación admin de reseñas (soft delete) |
| Epic | EPIC-REV-001 — Reviews & Moderation |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-067-refinement-review.md |

## 2. Diagnóstico

US-067 cierra EPIC-REV-001 con moderación manual (Decisión PO 8.1 #11). PB-P1-040 incluye US-067 y US-077 (probable rollback de moderación). Esta US se enfoca en hide/remove con AdminAction obligatorio.

### Hallazgos

1. **Trazabilidad**: cita `FR-REVIEW-003` (unicidad, no aplica). Correctos: **`FR-REVIEW-004`** (admin hide/remove soft delete con audit), **`FR-REVIEW-005`** (no hard delete), **`FR-REVIEW-009`** (no AI moderation), **`FR-ADMIN-005`** (admin modera reseñas), **`FR-VENDOR-013`** (denormalize). Faltan `BR-REVIEW-005/006`, `BR-ADMIN-003`. `NFR-OBS-001` ✓.
2. **Falta declarar `Backlog Item: PB-P1-040`**.
3. **FR-REVIEW-004 explicita columnas**: `moderated_by`, `moderated_at`, `moderation_reason`, `admin_action_id`. Migración menor probable si no existen.
4. **Denormalize cross-domain atómico**: recálculo de `vendor_profiles.rating_avg/reviews_count` al cambiar status (BR-REVIEW-009 + FR-VENDOR-013).
5. **`hidden` vs `removed`**: PO debe definir semántica:
   - `hidden`: oculto al público pero visible al admin (reversible).
   - `removed`: marcado como eliminado (audit preservada, no reversible o reversible).
6. **Reversibilidad**: ¿se permite volver a `published`? PB-P1-040 incluye US-077 — probable rollback. Para US-067 mantener simple: `published → hidden | removed`; otros transitiones son out of scope.
7. **AdminAction obligatorio** (BR-ADMIN-011): `admin_id`, `target_type='review'`, `target_id`, `action='hide'|'remove'`, `reason`, `timestamp`.
8. **Notif al organizer/vendor**: la US dice "Sin notif al organizador en MVP". Confirmar.
9. **Reason length**: máx chars.
10. **404 uniforme**: review inexistente.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO | Semántica hidden vs removed | `hidden`: oculto al público, visible solo al admin (reversible por US-077). `removed`: oculto al público + admin (soft delete con audit). Ambos excluyen al cálculo de denormalize. |
| Q2 | PO | Transiciones permitidas | `published → hidden`, `published → removed`. `hidden → removed` también permitido. `removed → ANY` out of scope MVP (US-077 manejará rollback si aplica). |
| Q3 | Tech | Persistencia FR-REVIEW-004 columns | Añadir `reviews.moderated_by uuid NULL`, `moderated_at timestamptz NULL`, `moderation_reason text NULL`, `admin_action_id uuid NULL`. Migración menor. |
| Q4 | Tech | Denormalize atómico recálculo | Dentro de transacción: UPDATE review + INSERT AdminAction + recálculo total `vendor_profiles.rating_avg/reviews_count` (solo published). |
| Q5 | PO | Reason length | `[10..500]` chars (mínimo 10 para evitar reasons vacías como "spam"). |
| Q6 | Sec | 404 uniforme | Review inexistente ⇒ `404 REVIEW_NOT_FOUND`. Admin tiene visibilidad universal, no aplica filtro de propiedad. |
| Q7 | PO | Notif al organizer/vendor | **Sin notif MVP** (confirmar). Decisión PO 8.1 #11 no obliga. PO puede expandir post-MVP. |
| Q8 | Tech | AdminAction shape | `admin_id, target_type='review', target_id=:reviewId, action='hide'|'remove', reason, payload? (snapshot), created_at`. |
| Q9 | Tech | Atomicidad transaccional | `prisma.$transaction`: SELECT FOR UPDATE review + UPDATE review fields + INSERT AdminAction + recálculo denormalize. Log + return. |

## 9. Recomendación

`Needs Refinement` — 9 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
