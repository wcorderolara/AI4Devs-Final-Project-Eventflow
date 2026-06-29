# User Story Refinement Review — US-041

## Source User Story File
management/user-stories/US-041-edit-vendor-profile.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-041-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)
Q1–Q5 resueltas. Re-pending automático y soft delete in-scope. Slug inmutable. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-041                                                                                                                                    |
| Backlog Item                               | PB-P1-024 — VendorProfile: crear y editar                                                                                                |
| Epic                                       | EPIC-VND-001                                                                                                                              |
| Estado actual                              | Draft                                                                                                                                     |
| Estado recomendado                         | Needs Refinement                                                                                                                          |
| Requiere decisión PO                       | Sí                                                                                                                                        |
| Decision Resolution artifact found         | No                                                                                                                                        |
| User Story file updated                    | No                                                                                                                                        |

---

## 2. Diagnóstico PO/BA

US-041 entrega la edición del `VendorProfile` post-creación (US-040) usando `PATCH /api/v1/vendors/me`. El alcance funcional general es claro, pero la US declara "Cambios mayores podrían requerir nueva aprobación (Future v1.1)", lo cual **contradice** la `Acceptance Summary` aprobada de `PB-P1-024`: "**Cambios mayores → re-pending (Decisión PO US-041)**". El backlog explicita además qué cambios son "mayores": "**nombre comercial, ciudad, categorías, servicios principales, visibilidad**".

Eso convierte la **definición y comportamiento de "cambios mayores"** en la decisión bloqueante principal de US-041. Categorías ya tienen su propia US (US-042/PB-P1-025) con cap de 5 cambios; servicios principales viven en `VendorService` (US-043+). Para US-041 quedan: `business_name`, `location_id`, y posiblemente `bio`/`languages_supported`.

Otros gaps:

1. **Re-pending automático vs `POST /vendors/me/submit-approval` manual**: el catálogo `docs/16 §M07` cataloga ambos. ¿Cambios mayores disparan re-pending automáticamente al PATCH, o el PATCH siempre queda en estado actual y el vendor debe invocar explícitamente `submit-approval`?
2. **Edits en `hidden`**: enum es `pending|approved|rejected|hidden`. El draft solo dice "no rejected". ¿`hidden` (admin-hidden) permite edición?
3. **Soft delete del perfil**: PB-P1-024 Acceptance Summary lo incluye ("Soft delete del perfil = retirar del directorio"). US-041 no lo cubre. ¿In scope o queda para US futura?
4. **Traceability incompleta**: falta `FR-VENDOR-010` (lifecycle), `BR-VENDOR-002` (datos mínimos siguen aplicando), `BR-VENDOR-004` (5 cambios de categoría aplican a US-042 pero hay relación), `BR-ADMIN-001` (AdminAction para re-pending si aplica).
5. **Notes "Considerar re-aprobación para cambios mayores (Future)"** ya no aplica; se resuelve aquí.
6. **NFR-PERF-API-001** → `NFR-PERF-001`.
7. **Backlog Item PB-P1-024** no declarado.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                | Impacto                                                                                                                                  | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | "Cambios mayores como Future" contradice PB-P1-024 (in-scope). Falta definir lista canónica de campos mayores y su efecto.                                                                                                                                                                                                                                                              | US-041 quedaría sin la regla de re-pending y bloquearía PB-P1-024.                                                                       | Resolver Q1 (PO). Recomendado: `business_name`, `location_id` son **mayores**; `bio`, `languages_supported` son **menores**; categorías y servicios viven en US-042/US-043.                                                                          |
| Alta      | Trigger del re-pending sin formalizar (auto vs manual `submit-approval`).                                                                                                                                                                                                                                                                                                                | Implementación arbitraria.                                                                                                                | Resolver Q2 (PO). Recomendado: **automático en PATCH** cuando el body contiene un campo mayor y el `status` actual es `approved` ⇒ transición a `pending` + log + AdminAction. `POST /submit-approval` queda para re-submit explícito tras `rejected`. |
| Alta      | Edits en `hidden` no documentados.                                                                                                                                                                                                                                                                                                                                                       | Inconsistencia.                                                                                                                          | Resolver Q3 (PO). Recomendado: **bloqueados** en `hidden` (admin lo ocultó por razón, vendor no debe poder modificar hasta que admin lo restaure).                                                                                                  |
| Alta      | Soft delete del perfil incluido en PB-P1-024 Acceptance Summary pero ausente de US-041.                                                                                                                                                                                                                                                                                                | PB-P1-024 quedaría incompleto.                                                                                                            | Resolver Q4 (PO). Recomendado: **incluir** `DELETE /api/v1/vendors/me` como soft delete en US-041 (retira del directorio público).                                                                                                                  |
| Alta      | Traceability incompleta.                                                                                                                                                                                                                                                                                                                                                                | Trazabilidad rota.                                                                                                                       | Añadir `FR-VENDOR-010`, `BR-VENDOR-002`, `BR-VENDOR-004` (referencia cruzada).                                                                                                                                                                       |
| Media     | "Edits menores no re-disparan aprobación" en Assumptions sin formalizar lista.                                                                                                                                                                                                                                                                                                          | Inconsistencia con Q1.                                                                                                                   | Tras Q1, formalizar.                                                                                                                                                                                                                                |
| Media     | Slug no se documenta. Si `business_name` cambia, ¿el slug se regenera? ¿Cambio de slug es breaking para directorio público?                                                                                                                                                                                                                                                                | Riesgo de breaking.                                                                                                                       | Resolver Q5 (PO). Recomendado: **slug inmutable post-creación**; el cambio de `business_name` solo afecta display, no slug. Una rotación de slug futura es US separada.                                                                                |
| Media     | `NFR-PERF-API-001` no existe.                                                                                                                                                                                                                                                                                                                                                            | Métrica inconsistente.                                                                                                                  | Reemplazar por `NFR-PERF-001`.                                                                                                                                                                                                                       |
| Media     | Falta política de currency. US-041 dice "Moneda base" pero el perfil no tiene moneda (vive en VendorService).                                                                                                                                                                                                                                                                            | Confusión menor.                                                                                                                          | Eliminar `Currency Notes` del UX.                                                                                                                                                                                                                  |
| Baja      | `Backlog Item: PB-P1-024` no declarado.                                                                                                                                                                                                                                                                                                                                                | Trazabilidad incompleta.                                                                                                                  | Añadir.                                                                                                                                                                                                                                              |
| Baja      | i18n locales sin enumerar.                                                                                                                                                                                                                                                                                                                                                              | Riesgo menor de QA.                                                                                                                       | Enumerar.                                                                                                                                                                                                                                            |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                                                       |
| Respeta backend como source of truth | Pass      | Estado y transiciones server-side.                                                                                  |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-040.                                                                                          |
| No introduce P4/Future scope         | Pass      | Workflow re-aprobación automática (Future) ya cubierto por D2 (auto re-pending in scope).                          |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                          | Problema                                                                                                                                                  | Acción recomendada                                                                                                                                                                                                                                                              |
| ----- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail                                                      | "Edit válido" sin shape del body, sin distinción menor/mayor, sin transición de estado.                                                                   | Reescribir tras Q1/Q2.                                                                                                                                                                                                                                                          |
| AC-02 | Needs Detail                                                      | "rejected" cubierto; falta `hidden` (Q3).                                                                                                                  | Reescribir tras Q3.                                                                                                                                                                                                                                                              |

Faltantes:
- AC nuevo: transición automática a `pending` ante cambio mayor desde `approved` (Q2).
- AC nuevo: soft delete (Q4).
- AC para auth/admin/organizer.
- AC para A11Y, i18n, performance, contract.

---

## 6. Gaps Detectados

### Producto / Negocio
- Definición de campos mayores/menores (Q1).
- Trigger del re-pending (Q2).
- Edits en `hidden` (Q3).
- Soft delete (Q4).
- Slug rotación (Q5).

### Backend / API
- `UpdateVendorProfileUseCase` con detección de campos mayores y transición de estado.
- `SoftDeleteVendorProfileUseCase` (si Q4 = in-scope).
- AdminAction record al disparar re-pending.
- Reuso del schema y guards de US-040.

### Frontend / UX
- `VendorProfileEditor` con secciones; banner "Tu edición pasará a revisión" cuando se detectan campos mayores y el estado actual es `approved`.
- Confirmación modal para soft delete (si Q4 = in-scope).

### Base de Datos
- Sin migraciones (reuso US-040).

### Seguridad / Autorización
- `VendorRoleGuard` + ownership por sesión.
- Bloqueo en `rejected` y `hidden`.

### IA / PromptOps
No aplica.

### QA / Testing
- TS, NT, AUTH, PERF, A11Y, CONTRACT, plus tests específicos de transición de estado.

### Seed / Demo
- Reuso US-040.

### Documentación / Trazabilidad
- IDs ampliados.
- Backlog Item declarado.

---

## 7. Preguntas Pendientes

| Tipo  | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Bloquea | Responsable |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------- |
| PO    | Q1. ¿Lista canónica de "campos mayores" para US-041? Backlog dice: `business_name`, `ciudad`, `categorías`, `servicios principales`, `visibilidad`. Categorías → US-042. Servicios → US-043+. Visibilidad (status hidden/approved) es admin-driven. ⇒ Para US-041 queda: **`business_name`** y **`location_id`**. `bio` y `languages_supported` son **menores**. Confirmar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Sí      | PO          |
| PO    | Q2. Trigger del re-pending: ¿auto al PATCH si body incluye campo mayor y status='approved', o manual `POST /vendors/me/submit-approval`? Recomendado **auto al PATCH**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Sí      | PO          |
| PO    | Q3. ¿Edits permitidos en `status='hidden'`? Recomendado **bloqueados** (admin lo ocultó).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Sí      | PO          |
| PO    | Q4. ¿Soft delete del perfil incluido en US-041? Acceptance Summary del backlog lo lista. Opciones: (a) in-scope (DELETE /vendors/me con soft delete + retira del directorio); (b) Out of Scope para US futura. Recomendado (a).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Sí      | PO          |
| PO    | Q5. ¿Slug rotación al cambiar `business_name`? Recomendado **slug inmutable** (cambios futuros vivirían en US separada).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Sí      | PO          |

---

## 8. Documentation Alignment Required

| Documento | Conflicto | Acción | Bloquea |
|---|---|---|---|
| `docs/10` | `NFR-PERF-API-001` no existe. | Housekeeping. | No |
| `docs/16 §M07` | PATCH shape y soft delete deben documentarse tras Q1–Q4. | Actualizar. | No |
| `docs/4 §BR-VENDOR-003` | Transición auto a `pending` por cambio mayor no detallada. | Nota interpretativa tras Q2. | No |
| `docs/4 §BR-VENDOR-002` | Slug inmutable (Q5) no detallado. | Nota tras Q5. | No |

---

## 9. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | No |
| Status | Needs Refinement |
| Next step | `eventflow-po-ba-decision-resolver` |
| Reason | 5 preguntas PO bloqueantes. |

---

## 10. Recomendación Final

`Needs Refinement`.
