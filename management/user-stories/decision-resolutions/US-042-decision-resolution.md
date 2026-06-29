# PO/BA Decision Resolution — US-042

## Source User Story File
management/user-stories/US-042-change-vendor-categories.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-042-refinement-review.md

## Decision Date
2026-06-26

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-042                                                                           |
| User Story file path                         | management/user-stories/US-042-change-vendor-categories.md                       |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-042-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-025 — Categorías del vendor con tope acumulado (5)                         |
| Epic                                         | EPIC-VND-001                                                                     |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 6 (Q1–Q6)                                                                        |
| Decisiones PO/BA tomadas                     | 6                                                                                |
| Decisiones técnicas recomendadas             | 0 (todas las técnicas se derivan de patrones EventFlow ya formalizados)          |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-042-decision-resolution.md       |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Código HTTP al alcanzar el límite de 5 cambios

### Pregunta original

> ¿Qué código HTTP se debe usar al alcanzar el límite de 5 cambios? PB-P1-025 dice `400`, UC-VENDOR-002 dice `422`, US-042 draft dice `409`.

### Respuesta PO/BA

Se adopta **`409 CATEGORY_CHANGE_LIMIT`**.

### Decisión formal

```text
El backend debe responder `409 Conflict` con `error.code = 'CATEGORY_CHANGE_LIMIT'` cuando el vendor intenta cambiar categorías y `category_change_count = 5`.
```

### Rationale

`409 Conflict` es semánticamente correcto: el estado actual del recurso (contador en 5) entra en conflicto con la operación solicitada. Es coherente con el patrón establecido en US-041 D3 (`409 PROFILE_HIDDEN`) y permite a la UI diferenciar conflictos de negocio de errores de validación (`400`/`422`). PB-P1-025 y UC-VENDOR-002 se actualizan vía Documentation Alignment Required.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D1.                                                                       |
| Acceptance Criteria     | AC-02 con código `409 CATEGORY_CHANGE_LIMIT`.                                    |
| Validation Rules        | VR-02 actualizada con código `409`.                                              |
| Technical Notes (API)   | Documentar error code.                                                           |
| Test Scenarios          | TS-02 espera `409`.                                                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Alcance del trigger de revisión admin

### Pregunta original

> ¿Toda mutación del set de categorías marca `requires_admin_review=true` y emite `AdminAction`, o sólo aquellas que afectan "categorías principales/visibilidad pública"?

### Respuesta PO/BA

**Toda mutación del set de categorías** marca `requires_admin_review=true` y emite `AdminAction`.

### Decisión formal

```text
Cualquier cambio en el conjunto de `service_category_id` (alta, baja o sustitución de al menos un elemento) marca `vendor_profile.requires_admin_review = true` e inserta `AdminAction(action='vendor_category_change', actor=vendor)`.
```

### Rationale

PB-P1-025 description establece explícitamente "Cada cambio incrementa `category_change_count` y dispara revisión admin". El Product Backlog Prioritizado tiene precedencia sobre BR-VENDOR-004 y UC-VENDOR-002 en interpretación operativa. Un modelo binario (todas las mutaciones, sin clasificación "sustantivo vs no sustantivo") elimina ambigüedad para QA y reduce superficie de gaming.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D2.                                                                       |
| Acceptance Criteria     | AC-01 con `requires_admin_review=true` siempre.                                  |
| Technical Notes         | Backend: setea flag + inserta `AdminAction` siempre que cambie el set.           |
| QA Notes                | TS-03 (cambio de una categoría dispara `AdminAction` y flag).                    |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Transición automática `approved → pending`

### Pregunta original

> ¿El cambio de categorías dispara también la transición auto `approved → pending` (replicando el patrón de US-041 D2 para cambios mayores) o sólo setea `requires_admin_review=true`?

### Respuesta PO/BA

Sí, **replicar el patrón de US-041 D2**.

### Decisión formal

```text
Si `vendor_profile.status = 'approved'` y la operación cambia el set de categorías, el backend transiciona `status = 'pending'` en la misma transacción, inserta `AdminAction(action='vendor_category_change', actor=vendor)`, emite log `vendor.category.changed`, y devuelve la respuesta con `repending=true`. Si el status es `pending`, los cambios se aplican sin transición (ya está en revisión). Si el status es `rejected`, se aplican los cambios y se transiciona a `pending`.
```

### Rationale

El cambio de categorías es por definición un "cambio mayor" (afecta directamente la visibilidad pública: filtros del directorio dependen del set de categorías). US-041 D2 ya formaliza este patrón para `business_name` y `location_id`. Replicar el mismo flujo garantiza coherencia operacional, evita perfiles `approved` mostrándose con categorías nuevas no revisadas y reutiliza el banner UI "Tu perfil pasó a revisión" definido en US-041.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D3.                                                                       |
| Business Context        | Actualizar "queda pending_review" → "transiciona a `pending`".                   |
| Acceptance Criteria     | AC-01 contempla transición + `repending=true`.                                   |
| Technical Notes         | Backend: transacción única que aplica diff + actualiza contador + transición.   |
| UX / UI Notes           | Banner reutilizado de US-041 "Tu perfil pasó a revisión por cambio de categorías". |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Política en `rejected`, `hidden` y `deleted_at`

### Pregunta original

> ¿Qué política aplica cuando `vendor_profile.status` es `rejected` o `hidden`? ¿Y si el perfil está soft-deleted?

### Respuesta PO/BA

* `approved` → permitido, incrementa contador, marca `requires_admin_review`, transiciona a `pending`.
* `pending` → permitido, incrementa contador, marca `requires_admin_review`, **sin transición** (ya está en revisión).
* `rejected` → permitido, incrementa contador, marca `requires_admin_review`, transiciona a `pending` (mismo trato que `approved`).
* `hidden` → **bloqueado** con `409 PROFILE_HIDDEN`. Consistente con US-041 D3.
* `deleted_at IS NOT NULL` → bloqueado con `404` (perfil soft-deleted).

### Decisión formal

```text
El endpoint `POST /api/v1/vendors/me/categories` permite cambios en `pending`, `approved` y `rejected`; bloquea en `hidden` (`409 PROFILE_HIDDEN`) y cuando `deleted_at IS NOT NULL` (`404`). En `approved` y `rejected` hay transición auto a `pending` (D3); en `pending` se aplica el cambio sin transición.
```

### Rationale

`hidden` es estado admin-driven (US-041 D3): permitir mutaciones quitaría la decisión del admin. `rejected` permite re-someter el perfil aplicando cambios y volviendo a `pending` para revisión (alinea con flujo `POST /vendors/me/submit-approval` de US-041 sin duplicar lógica). Soft delete debe ser inalcanzable porque el recurso ya no debería responder a operaciones de mutación.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D4.                                                                       |
| Acceptance Criteria     | Añadir AC-03 (cambio en `pending`), AC-04 (`rejected`), EC-02 (`hidden`), EC-03 (soft-deleted). |
| Validation Rules        | VR-03 (status `hidden` → 409), VR-04 (deleted → 404).                            |
| Authorization & Security| SEC-03 (verificación de estado).                                                 |
| Test Scenarios          | Añadir AUTH-TS-03 y AUTH-TS-04.                                                   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Definición operacional de "no cambio"

### Pregunta original

> Definición operacional de "no cambio" en EC-01.

### Respuesta PO/BA

Mismo conjunto de `service_category_id` **ignorando orden y duplicados** ⇒ `200 OK` con `noop=true`.

### Decisión formal

```text
El backend normaliza el payload a un `Set<service_category_id>` y lo compara con el conjunto persistido del vendor. Si los conjuntos son iguales, la respuesta es `200 OK` con `noop=true`; no se modifica `category_change_count`, ni `last_category_change_at`, ni `requires_admin_review`, ni se inserta `AdminAction`, ni se transiciona status.
```

### Rationale

La normalización por conjunto evita falsos positivos por reordenamiento desde la UI (multi-select puede emitir órdenes distintos) y por duplicados accidentales. Es replicable en tests con `Set` semantics. Devolver `200` mantiene idempotencia para reintentos.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D5.                                                                       |
| Acceptance Criteria     | EC-01 reescrito con regla operativa.                                             |
| Technical Notes         | Backend: `Set` semantics; ignorar orden y duplicados en la comparación.          |
| Test Scenarios          | TS-04: payload reordenado retorna `noop=true`.                                   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 6 — Cardinalidad del set de categorías

### Pregunta original

> ¿1-3 categorías (VR-01) o cuál es el rango canónico?

### Respuesta PO/BA

**1 a 5 categorías** por vendor.

### Decisión formal

```text
El backend valida que el set entrante tenga `1 ≤ size ≤ 5`. Fuera de este rango: `400 INVALID_CATEGORIES`. Cada `service_category_id` debe existir y estar `active=true` en el catálogo; categoría desconocida o inactiva: `400 INVALID_CATEGORY`.
```

### Rationale

PB-P1-025 y BR-VENDOR-004 no fijan un upper bound; la regla "máx 5 cambios" sugiere paralelismo con "máx 5 categorías" para mantener una oferta enfocada. 1 como mínimo previene perfiles aprobados sin categorías (rompería el directorio). El catálogo activo (BR-SERVICE-003) es la fuente única.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                |
| ----------------------- | ------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Añadir D6.                                                                       |
| Validation Rules        | VR-01: 1-5 categorías; VR-05: catálogo activo.                                   |
| Acceptance Criteria     | Añadir AC con cardinalidad inválida.                                             |
| Test Scenarios          | NT-02 (categoría inexistente o inactiva → 400).                                  |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                          | Decisión                                                                                                                                                       | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------- | -------------------- |
|  1 | HTTP code límite               | `409 CATEGORY_CHANGE_LIMIT`.                                                                                                                                   | PO   | Sí                     | No                   |
|  2 | Alcance trigger revisión admin| Toda mutación del set → `requires_admin_review=true` + `AdminAction`.                                                                                          | PO   | Sí                     | No                   |
|  3 | Transición auto status         | `approved → pending` automático en la misma transacción + `repending=true` en response. `rejected → pending`. `pending` sin transición.                       | PO   | Sí                     | No                   |
|  4 | Política por status            | Permitido en `pending`/`approved`/`rejected`. Bloqueado en `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted (`404`).                                              | PO   | Sí                     | No                   |
|  5 | "No cambio" operacional        | Comparación por `Set` ignorando orden/duplicados → `200 noop=true` sin side-effects.                                                                          | PO   | Sí                     | No                   |
|  6 | Cardinalidad                   | `1 ≤ size ≤ 5`; cada `service_category_id` debe existir y estar `active=true`.                                                                                | PO   | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- Añadido `Backlog Item: PB-P1-025`.
- `Status: Ready for Approval`.
- `Last Updated: 2026-06-26`.

### Business Context
- Reformulado: el flujo persiste el cambio, marca `requires_admin_review=true`, transiciona status según D3 y registra `AdminAction`.

### PO/BA Decisions Applied
- Sección nueva con D1–D6.

### Assumptions
- Confirmado: cada mutación cuenta. Añadido: comparación por Set para "no cambio".

### Traceability
- `FR-VENDOR-003` → `FR-VENDOR-004, FR-VENDOR-005`.
- `UC-VENDOR-003` → `UC-VENDOR-002`.
- Añadidos: `BR-VENDOR-003`, `BR-ADMIN-011`.
- `NFR-PERF-API-001` → `NFR-PERF-001`.

### Scope Guardrails
- Out of Scope: subcategorías ilimitadas (existente); añadido: reversa/UNDO de cambios; rotación admin del contador (Future).

### Acceptance Criteria
- AC-01 reescrito (incremento + `last_category_change_at` + `requires_admin_review` + `AdminAction` + transición auto desde `approved` con `repending=true`).
- AC-02 reescrito (`409 CATEGORY_CHANGE_LIMIT`).
- AC-03 (cambio desde `pending` sin transición).
- AC-04 (cambio desde `rejected` → `pending`).
- EC-01 reescrito (regla Set).
- EC-02 (bloqueo en `hidden` → `409 PROFILE_HIDDEN`).
- EC-03 (perfil soft-deleted → `404`).
- AC para cardinalidad fuera de rango (`400 INVALID_CATEGORIES`).

### Technical Notes
- Backend: `prisma.$transaction` que aplica diff, actualiza contador, marca flag, inserta `AdminAction`, transiciona status si aplica.
- Database: confirmar `category_change_count`, `last_category_change_at`, `requires_admin_review`.
- API: documentar response shape (`repending`, `noop`, `requires_admin_review`).

### QA Notes
- Añadidos TS-03 (AdminAction), TS-04 (noop), NT-02 (categoría inactiva), AUTH-TS-03 (hidden), AUTH-TS-04 (deleted).

### Definition of Ready
- `PO/BA validó` ✅.

### Definition of Done
- Añadido: auditoría `AdminAction` registrada; banner i18n; contador accesible con `aria-live`.

### Notes
- Eliminada la duda bloqueante "Confirmar si los cambios requieren re-aprobación admin (sugerido sí)".

---

## 5. Documentation Alignment Required

| Documento / Fuente             | Conflicto detectado                                                                                              | Decisión vigente                                          | Acción recomendada                                                                                                   | ¿Bloquea aprobación? |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/9 §FR-VENDOR-004`        | PB-P1-025 dice `HTTP 400` al exceder.                                                                            | `409 CATEGORY_CHANGE_LIMIT` (D1).                         | Housekeeping: actualizar PB-P1-025 Acceptance Summary al código `409`.                                                | No                   |
| `docs/8 §UC-VENDOR-002 E2`     | UC-VENDOR-002 dice `422` al exceder el tope.                                                                     | `409 CATEGORY_CHANGE_LIMIT` (D1).                         | Housekeeping: actualizar UC-VENDOR-002 E2 al código `409`.                                                            | No                   |
| `docs/4 §BR-VENDOR-004`        | BR-VENDOR-004 limita el trigger admin a "cambios sustantivos que afectan visibilidad pública".                   | Toda mutación marca `requires_admin_review` (D2).         | Housekeeping: alinear BR-VENDOR-004 con la regla operativa "cada cambio dispara revisión admin" de PB-P1-025.        | No                   |
| `docs/4 §BR-VENDOR-003`        | Enum de status no menciona `pending_review`.                                                                     | `pending_review` no existe; usar `pending` + flag (D3).   | Nota interpretativa: la US-042 referencia `pending` y `requires_admin_review`, no `pending_review`.                  | No                   |
| `docs/10 §NFR-PERF-001`        | La US cita `NFR-PERF-API-001` que no existe.                                                                     | `NFR-PERF-001` es el ID canónico.                          | Housekeeping en la US y en docs futuras.                                                                              | No                   |
| `docs/16 §M07` (API Design)    | Falta documentar `POST /api/v1/vendors/me/categories` con códigos `200/noop`, `409 CATEGORY_CHANGE_LIMIT`, `409 PROFILE_HIDDEN`, `400 INVALID_CATEGORIES`. | Documentar tras D1–D5.                                    | Actualizar `docs/16` con el contrato resultante.                                                                       | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-042-change-vendor-categories.md`                       |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-042-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 6/6 decisiones PO formalizadas y aplicadas. Trazabilidad corregida.                |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

Las 6 decisiones bloqueantes fueron resueltas dentro de la autoridad PO/BA usando documentación oficial y patrones ya formalizados (US-041 D2/D3). Los hallazgos de Documentation Alignment Required no bloquean la aprobación de US-042.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo de User Story actualizado.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Si no quedan blockers, ejecutar `eventflow-user-story-approval`.
```

```text
User Story file updated: Yes
Path: management/user-stories/US-042-change-vendor-categories.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-042-decision-resolution.md
Next step: Run `eventflow-user-story-approval` (o revalidación con `eventflow-user-story-refinement`).
```
