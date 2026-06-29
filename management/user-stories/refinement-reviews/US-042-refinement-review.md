# User Story Refinement Review — US-042

## Source User Story File
management/user-stories/US-042-change-vendor-categories.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-042-decision-resolution.md

## Review Date
2026-06-26 (revalidación: 2026-06-26)

## Revalidation Result (2026-06-26)
Q1–Q6 resueltas en `management/user-stories/decision-resolutions/US-042-decision-resolution.md`. La US-042 ahora declara `Backlog Item: PB-P1-025`, sección `PO/BA Decisions Applied` con D1–D6, trazabilidad corregida (`FR-VENDOR-004`, `FR-VENDOR-005`, `UC-VENDOR-002`, `BR-VENDOR-003`, `BR-VENDOR-004`, `BR-ADMIN-011`, `NFR-PERF-001`), AC-01..AC-04 con `409 CATEGORY_CHANGE_LIMIT`, transición auto desde `approved`/`rejected` y `AdminAction`, EC-01..EC-05 con semántica de Set, bloqueo en `hidden` y soft-deleted, VR-01..VR-05, AUTH-TS-01..AUTH-TS-05. No se detectan nuevos blockers. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-042                                                                    |
| File Path                                  | management/user-stories/US-042-change-vendor-categories.md                |
| Backlog Item                               | PB-P1-025 — Categorías del vendor con tope acumulado (5)                  |
| Epic                                       | EPIC-VND-001                                                              |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (consistencia con US-041 D2)                                           |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-042-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-042 entrega la regla de negocio crítica del límite de 5 cambios acumulados de categorías para el `VendorProfile` (decisión PO 8.1 #3 / BR-VENDOR-004 / FR-VENDOR-004 / FR-VENDOR-005 / UC-VENDOR-002 / PB-P1-025). La historia captura el espíritu de la regla y propone un endpoint dedicado (`POST /api/v1/vendors/me/categories`), separándola correctamente del `PATCH /vendors/me` de US-041.

Sin embargo, existen **contradicciones internas y con la documentación oficial** que impiden marcarla como `Ready for Approval` sin decisión PO/Tech explícita:

1. **Trazabilidad incorrecta**: cita `FR-VENDOR-003` (visibilidad del directorio) y `UC-VENDOR-003` (submit-approval); las trazas correctas son **`FR-VENDOR-004` + `FR-VENDOR-005` + `UC-VENDOR-002`**.
2. **Código HTTP del bloqueo divergente** entre artefactos: PB-P1-025 dice `400`, UC-VENDOR-002 E2 dice `422`, la US dice `409 CATEGORY_CHANGE_LIMIT`. Se necesita una decisión vinculante.
3. **Alcance del trigger de revisión admin**: PB-P1-025 description dice "Cada cambio dispara revisión admin"; FR-VENDOR-005 y UC-VENDOR-002 lo limitan a cambios "que afectan la visibilidad pública" / "categorías principales". La US AC-01 simplifica afirmando que queda `pending_review` siempre que el contador incremente.
4. **Status `pending_review` no existe**: el enum aprobado de `VendorProfile.status` es `pending | approved | rejected | hidden` (BR-VENDOR-003). El flag correcto sería `requires_admin_review=true` (FR-VENDOR-005). Hay que distinguir flag vs transición de status.
5. **Consistencia con US-041 D2**: en US-041 los cambios mayores en `approved` disparan auto `approved → pending` + `AdminAction`. ¿US-042 debe replicar esa transición auto al cambiar categorías? Se necesita PO.
6. **Política en `rejected` y `hidden`**: la US no aclara qué pasa si el vendor intenta cambiar categorías estando en estos estados. US-041 D3 ya formalizó bloqueo en `hidden` con `409 PROFILE_HIDDEN`.
7. **Definición operacional de "no cambio" (EC-01)**: la US dice "Diff antes" sin reglas. Hay que precisar (set de IDs ordenado, ignorando orden y duplicados, etc.).
8. **Cardinalidad VR-01 (1-3 categorías)**: la US fija "1-3" sin sustento en docs oficiales (BR-VENDOR-004 no impone tope). Hay que confirmar si es 1-3, 1-5 o catálogo libre, alineado con docs/6 Domain Data Model.
9. **`Notes`**: "Confirmar si los cambios requieren re-aprobación admin (sugerido sí)" es exactamente la decisión bloqueante que falta formalizar.

Otros gaps menores (NFR ID inexistente, falta `last_category_change_at`, falta Backlog Item, falta `AdminAction.action='vendor_category_change'`) son corregibles dentro del refinamiento una vez resueltas las bloqueantes.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                              | Impacto                                                                                          | Recomendación                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alta      | HTTP code para "límite alcanzado" no es coherente entre artefactos: PB `400`, UC `422`, US `409`.                                                                                                                                                       | Implementación arbitraria; rompe contrato API estable y la documentación de errores.            | Resolver Q1 (PO). Recomendado: **`409 CATEGORY_CHANGE_LIMIT`** (conflicto con estado actual del recurso) + alinear PB y UC vía Documentation Alignment. |
| Alta      | Alcance del trigger de revisión admin: ¿toda mutación de set o sólo cambios "sustantivos"?                                                                                                                                                              | Riesgo de spam de revisiones admin o, al revés, de evadir control.                              | Resolver Q2 (PO). Recomendado: **toda mutación del set de categorías** marca `requires_admin_review=true` y emite `AdminAction`.                       |
| Alta      | Status `pending_review` (mencionado en AC-01) no existe en el enum aprobado.                                                                                                                                                                            | Implementación imposible o introducción de scope creep en el enum.                              | Reemplazar por `requires_admin_review=true` + decisión sobre transición de status (Q3).                                                                |
| Alta      | ¿El cambio dispara también una transición auto `approved → pending` (consistente con US-041 D2) o sólo setea `requires_admin_review=true`?                                                                                                              | Inconsistencia con el modelo establecido en US-041 (re-pending automático en cambios mayores).  | Resolver Q3 (PO/Tech). Recomendado: **sí**, replicar el patrón de US-041 D2 (cambio de categorías es por definición "cambio mayor").                   |
| Alta      | Política en `rejected` y `hidden` no está definida.                                                                                                                                                                                                     | Vendors podrían rotar categorías estando ocultos/rechazados.                                    | Resolver Q4 (PO). Recomendado: **bloqueado en `hidden`** (`409 PROFILE_HIDDEN`, consistente con US-041 D3) y **permitido en `pending`/`rejected`/`approved`**, incrementando contador y disparando revisión. |
| Alta      | Definición operacional de "no cambio" (EC-01) sin reglas.                                                                                                                                                                                              | Falsos positivos en el contador; tests no replicables.                                          | Resolver Q5 (PO/BA). Recomendado: **mismo set de `service_category_id` (sin importar orden)** ⇒ 200 sin incrementar.                                   |
| Alta      | VR-01 fija "1-3 categorías" sin respaldo documental.                                                                                                                                                                                                    | Regla arbitraria; podría contradecir el catálogo.                                                | Resolver Q6 (PO). Recomendado: **1-5 categorías** (alineado con el límite operativo y la jerarquía máx 2 niveles de BR-SERVICE-005); confirmar con PO. |
| Media     | Trazabilidad incorrecta: `FR-VENDOR-003` y `UC-VENDOR-003` no aplican.                                                                                                                                                                                  | Trazabilidad rota; aprobación inválida.                                                          | Reemplazar por **`FR-VENDOR-004`, `FR-VENDOR-005`, `UC-VENDOR-002`** + mantener `BR-VENDOR-004`.                                                       |
| Media     | Falta declarar `Backlog Item: PB-P1-025`.                                                                                                                                                                                                                | Trazabilidad incompleta.                                                                          | Añadir en Metadata.                                                                                                                                    |
| Media     | `NFR-PERF-API-001` no existe.                                                                                                                                                                                                                            | Métrica inconsistente.                                                                            | Reemplazar por `NFR-PERF-001`.                                                                                                                          |
| Media     | Falta auditoría formal: la US sólo menciona `vendor.category.changed` (log), pero UC-VENDOR-002 #5 exige `AdminAction(action='vendor_category_change')`.                                                                                                  | Auditoría parcial.                                                                                | Añadir registro de `AdminAction` y aclarar diferencia con log de aplicación.                                                                            |
| Media     | Falta `last_category_change_at` en el modelo de datos.                                                                                                                                                                                                   | Sin marca temporal del último cambio.                                                            | Añadir el campo en Database Notes.                                                                                                                      |
| Media     | `Notes` plantea explícitamente la duda bloqueante.                                                                                                                                                                                                       | Indica que la US no está cerrada.                                                                | Eliminar tras resolver Q2/Q3.                                                                                                                            |
| Baja      | Currency Notes ("No aplica") y referencia a `/docs/8.1 (#3)` están correctas pero pueden enriquecerse con cita explícita de BR-VENDOR-004 + FR-VENDOR-004/005 en la sección Traceability.                                                                | Trazabilidad enriquecida.                                                                        | Mejora cosmética post-resolución.                                                                                                                        |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                                                       |
| Respeta backend como source of truth | Pass      | Enforcement server-side del límite y de la transición.                                                              |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-040; sin impacto adicional.                                                                    |
| No introduce RAG/vector DB           | Pass      | N/A.                                                                                                                |
| No introduce multi-tenant enterprise | Pass      | N/A.                                                                                                                |
| No introduce P4/Future scope         | Pass      | Toda la regla #3 PO es Must Have MVP; no se promueve nada Future.                                                   |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad           | Problema detectado                                                                                                | Acción recomendada                                                                                                                                                                                                                                                       |
| ----- | ----------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail      | Usa status `pending_review` (no existe). No diferencia entre flag y transición de status. No menciona AdminAction. | Reescribir: "Given `category_change_count=2` y status `approved`, When envía un set distinto, Then se persisten las categorías, `category_change_count` pasa a 3, `last_category_change_at` se actualiza, `requires_admin_review=true`, transición auto `approved→pending` (pendiente Q3), y se inserta `AdminAction(action='vendor_category_change', actor=vendor)`." |
| AC-02 | Needs Detail      | Código HTTP en disputa (400/409/422).                                                                              | Reescribir tras Q1: "Given `category_change_count=5`, When intenta cambio, Then `409 CATEGORY_CHANGE_LIMIT` con mensaje i18n; el contador no incrementa; el set no se modifica."                                                                                          |
| EC-01 | Needs Detail      | "Diff antes" no es regla operativa.                                                                               | Reescribir tras Q5: "Given `category_change_count=2` y POST con mismo set (mismos `service_category_id`, orden irrelevante), When backend evalúa, Then `200 OK` con `noop=true`, contador y `last_category_change_at` sin cambios, sin `AdminAction`, sin `requires_admin_review`." |

Faltan AC para:
- Bloqueo en `hidden` (Q4): `409 PROFILE_HIDDEN`.
- Comportamiento en `pending` (sin transición porque ya está en revisión).
- Comportamiento en `rejected` (Q4).
- Validación de cardinalidad (Q6) y `400 INVALID_CATEGORIES` para cardinalidad fuera de rango.
- Validación de que cada `service_category_id` exista y esté `active`.

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan reglas operativas explícitas para "no cambio" (Q5) y para la cardinalidad (Q6).
- Falta la decisión sobre re-pending automático (Q3) consistente con US-041.

### Backend / API
- Falta especificar `AdminAction(action='vendor_category_change')` (UC-VENDOR-002 #5).
- Falta especificar campo `last_category_change_at`.
- Falta política del endpoint cuando `status ∈ {pending, rejected, hidden}` (Q4).
- Falta especificar el contrato del response (incluir flags `requires_admin_review`, `repending`, `noop` cuando apliquen).

### Frontend / UX
- Falta indicar que el contador muestre `cupo restante = 5 - category_change_count` (texto preferido a "n/5").
- Falta empty/disabled state cuando `category_change_count=5` (CTA "Solicitar cambio" deshabilitado).
- Falta el banner "Tu perfil pasó a revisión por cambio de categorías" cuando se gatilla revisión (consistente con US-041).

### Base de Datos
- Confirmar columnas: `vendor_profile.category_change_count INT NOT NULL DEFAULT 0`, `vendor_profile.last_category_change_at TIMESTAMPTZ NULL`, `vendor_profile.requires_admin_review BOOLEAN NOT NULL DEFAULT FALSE`.
- Confirmar tabla intermedia `vendor_profile_categories(vendor_user_id, service_category_id)` con `UNIQUE(vendor_user_id, service_category_id)`.
- CHECK constraint del contador `category_change_count BETWEEN 0 AND 5`.

### Seguridad / Autorización
- Ownership confirmado. Falta enumerar AUTH-TS para `pending`, `approved`, `rejected`, `hidden` (Q4).
- Confirmar que `Otro vendor → 403` (no 404) por política unificada del proyecto (revisar `docs/19`).

### IA / PromptOps
- No aplica — esta historia no invoca IA directamente.

### QA / Testing
- Añadir TS para `409` por límite, `409 PROFILE_HIDDEN` (Q4), `200` con `noop`, validación de catálogo activo, `400 INVALID_CATEGORIES` por cardinalidad fuera de rango.
- Añadir Accessibility Test para CTA deshabilitado cuando límite alcanzado (mensaje accesible con `aria-describedby`).

### Seed / Demo
- No requiere cambios de seed/demo (reuso del seed de US-040). Validar tras Q4.

### Documentación / Trazabilidad
- Reemplazar `FR-VENDOR-003`/`UC-VENDOR-003` por `FR-VENDOR-004`/`FR-VENDOR-005`/`UC-VENDOR-002`.
- Declarar `Backlog Item: PB-P1-025`.
- Cambiar `NFR-PERF-API-001` por `NFR-PERF-001`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                                                                                       | Bloquea aprobación | Responsable |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO       | **Q1** — ¿Qué código HTTP se debe usar al alcanzar el límite de 5 cambios? Opciones: `400` (PB-P1-025), `409` (US draft), `422` (UC-VENDOR-002). Recomendado: `409 CATEGORY_CHANGE_LIMIT`.                                                                                                                       | Sí                 | PO          |
| PO       | **Q2** — ¿Toda mutación del set de categorías marca `requires_admin_review=true` y emite `AdminAction`, o sólo aquellas que afectan "categorías principales/visibilidad pública"? Recomendado: **toda mutación** (consistente con PB-P1-025 description).                                                       | Sí                 | PO          |
| PO/Tech  | **Q3** — ¿El cambio de categorías dispara también la transición auto `approved → pending` (replicando el patrón de US-041 D2 para cambios mayores) o sólo setea `requires_admin_review=true` manteniendo el status? Recomendado: **sí, replicar US-041 D2** (cambio de categorías es por definición cambio mayor). | Sí                 | PO/Tech     |
| PO       | **Q4** — ¿Qué política aplica cuando `vendor_profile.status` es `rejected` o `hidden`? Recomendado: **bloqueado en `hidden`** (`409 PROFILE_HIDDEN`, consistente con US-041 D3) y **permitido en `pending`/`rejected`/`approved`** con incremento de contador.                                                  | Sí                 | PO          |
| PO/BA    | **Q5** — Definición operacional de "no cambio" en EC-01. Recomendado: **mismo conjunto de `service_category_id` sin importar orden** ⇒ 200 sin incrementar contador.                                                                                                                                            | Sí                 | PO/BA       |
| PO       | **Q6** — Cardinalidad del set de categorías. La US fija `1-3` (VR-01) sin respaldo documental. Recomendado: **1-5 categorías** (alinear con la regla operativa del producto). Confirmar valor canónico.                                                                                                          | Sí                 | PO          |

---

## 8. Documentation Alignment Required

| Documento / Fuente            | Conflicto detectado                                                                                                                          | Decisión vigente                                                              | Acción recomendada                                                                                                                       | ¿Bloquea aprobación? |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-004/005`   | PB-P1-025 dice `HTTP 400` al exceder el tope; UC-VENDOR-002 dice `422`; la US propone `409`.                                                  | Resolución de Q1 (recomendado `409 CATEGORY_CHANGE_LIMIT`).                   | Tras Q1, actualizar PB-P1-025 Acceptance Summary y UC-VENDOR-002 E2 con el código acordado.                                              | No                   |
| `docs/4 §BR-VENDOR-004`       | BR-VENDOR-004 dice "cambios sustantivos que afecten visibilidad pública"; PB-P1-025 description dice "cada cambio".                          | Resolución de Q2 (recomendado "toda mutación").                              | Tras Q2, alinear redacción de BR-VENDOR-004 con la decisión.                                                                              | No                   |
| `docs/8 §UC-VENDOR-002`       | UC-VENDOR-002 menciona `last_category_change_at` y `AdminAction(action='vendor_category_change')`; US-042 no los lista.                      | Adoptar en el refinamiento de US-042 sin cambiar UC.                          | Incorporar campo y AdminAction en la US-042 refinada.                                                                                     | No                   |
| `docs/10 §NFR-PERF`           | La US cita `NFR-PERF-API-001` que no existe.                                                                                                | `NFR-PERF-001` es el identificador canónico.                                  | Reemplazar en Traceability.                                                                                                               | No                   |
| `docs/16 §M07` (API Design)   | Falta documentar `POST /api/v1/vendors/me/categories` (request, response, error codes).                                                      | Documentar tras Q1–Q4.                                                        | Actualizar `docs/16` con el contrato resultante (códigos `200`, `409 CATEGORY_CHANGE_LIMIT`, `409 PROFILE_HIDDEN`, `400 INVALID_CATEGORIES`). | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-042-change-vendor-categories.md`                          |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-042-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-042-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | Existen 6 decisiones PO/Tech bloqueantes (códigos HTTP, alcance del trigger de revisión, transición auto de status, política en rejected/hidden, definición de "no cambio" y cardinalidad) cuya resolución cambia AC-01, AC-02, EC-01, validaciones y contrato de API. |

---

## 10. Cambios Aplicados o Recomendados

(Se aplicarán tras la resolución del Decision Resolution.)

### Metadata
- Añadir `Backlog Item: PB-P1-025`.
- Actualizar `Status: Ready for Approval` y `Last Updated: 2026-06-26` tras la revalidación.

### Business Context
- Reemplazar la frase "queda `pending_review`" por "se marca `requires_admin_review=true` y (Q3) transiciona `approved → pending`".

### PO/BA Decisions Applied
- Añadir sección con las 6 decisiones D1–D6 (una vez resueltas).

### Traceability
- Reemplazar `FR-VENDOR-003` por `FR-VENDOR-004, FR-VENDOR-005`.
- Reemplazar `UC-VENDOR-003` por `UC-VENDOR-002`.
- Mantener `BR-VENDOR-004` y agregar `BR-VENDOR-003` (estados del perfil) y `BR-ADMIN-011` (auditoría).
- Cambiar `NFR-PERF-API-001` por `NFR-PERF-001`.

### Scope Guardrails
- Aclarar Out of Scope: subcategorías ilimitadas; rotación admin del contador; reversa/UNDO de cambios.

### Acceptance Criteria
- Reescribir AC-01 (incremento, `last_category_change_at`, `requires_admin_review`, transición de status según Q3, `AdminAction`).
- Reescribir AC-02 con código HTTP definitivo (Q1).
- Reescribir EC-01 con regla de "no cambio" (Q5).
- Añadir AC para bloqueo en `hidden` (Q4), comportamiento en `pending`/`rejected` (Q4), cardinalidad (Q6), validación de catálogo activo.

### Technical Notes
- Backend: agregar persistencia de `category_change_count`, `last_category_change_at`, `requires_admin_review` en transacción; `AdminAction` insert; transición de status.
- Database: confirmar columnas y CHECK constraint del contador (0..5).
- API: documentar response codes y banderas (`repending`, `noop`, `requires_admin_review`).

### QA Notes
- Añadir TS para `409 PROFILE_HIDDEN`, `200 noop`, cardinalidad inválida y categoría inactiva.
- Confirmar AUTH-TS para Otro vendor con política unificada (403 o 404 según `docs/19`).

### Definition of Ready
- Marcar `PO/BA validó` tras Decision Resolver.

### Definition of Done
- Añadir: "Auditoría `AdminAction` registrada; banner i18n en 4 locales para `repending`; contador accesible con `aria-live`."

### Notes
- Eliminar "Confirmar si los cambios requieren re-aprobación admin (sugerido sí)" tras Q2/Q3.

---

## 11. Recomendación Final

`Needs Refinement`.

US-042 captura correctamente la regla #3 de Decisión PO 8.1, pero requiere **resolución explícita de seis decisiones PO/Tech** antes de poder aprobarse. La trazabilidad incorrecta (FR/UC) y el uso de un status inexistente (`pending_review`) hacen riesgoso cualquier auto-refinamiento. Tras `eventflow-po-ba-decision-resolver`, ejecutar revalidación de refinamiento y luego `eventflow-user-story-approval`.

```text
User Story file updated: No
Path: management/user-stories/US-042-change-vendor-categories.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-042-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
