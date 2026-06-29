# User Story Refinement Review — US-036

## Source User Story File
management/user-stories/US-036-crud-budget-items.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-036-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-036-decision-resolution.md`) y la actualización en sitio del archivo de la US, esta segunda pasada confirma:

| Verificación                                                                                                                                                       | Resultado |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Q1 (`committed` en PATCH) resuelta: Zod schema excluye `committed`; rechazo 400 `INVALID_FIELD`.                                                                    | OK        |
| Q2 (política DELETE) resuelta: soft delete con bloqueos por `committed > 0`, `BookingIntent.pending`, `paid > 0`; items soft-deleted filtrados en US-035.            | OK        |
| Q3 (bloqueo en `completed`) resuelta: mutaciones bloqueadas en `cancelled` y `completed` (409 `EVENT_NOT_EDITABLE`).                                                | OK        |
| Q4 (regla `paid ≤ committed`) resuelta: eliminada; solo `paid ≥ 0`; warnings advisory client-side.                                                                 | OK        |
| Q5 (`service_category_id` editable + multi-items) resuelta: editable si `committed = 0`; múltiples items por categoría permitidos.                                  | OK        |
| Traceability corregida: FR-BUDGET-001/003/006/007/008; UC-BUDGET-002; BR-BUDGET-002/005/007/009 + BR-AI-008 + BR-BOOKING-007/008; NFR-PERF-001; PB-P1-020 declarado. | OK        |
| AC reescritos (AC-01..10), EC ampliados (EC-01..09), VR-01..10, SEC-01..06.                                                                                         | OK        |
| Documentation Alignment Required (4 ítems no bloqueantes): `UC-BUDGET-002 §E2`, `docs/16 §M06`, `docs/16 §error format`, ID `NFR-PERF-001`.                          | OK        |
| Sin scope creep; bulk updates fuera de alcance (Future).                                                                                                            | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-036                                                                                                                      |
| File Path                                  | `management/user-stories/US-036-crud-budget-items.md`                                                                       |
| Backlog Item                               | PB-P1-020 — Gestión de presupuesto + BudgetItems                                                                            |
| Epic                                       | EPIC-BUD-001 — Budget Management & Currency                                                                                  |
| Estado actual                              | Draft                                                                                                                       |
| Estado recomendado                         | Needs Refinement                                                                                                            |
| Nivel de riesgo                            | Medio                                                                                                                       |
| Calidad general                            | Media                                                                                                                       |
| Requiere decisión PO                       | Sí                                                                                                                          |
| Requiere decisión técnica                  | Sí                                                                                                                          |
| Requiere decisión QA                       | No                                                                                                                          |
| Requiere decisión Seguridad                | No                                                                                                                          |
| Decision Resolution artifact found         | No                                                                                                                          |
| User Story file updated                    | No                                                                                                                          |
| Refinement review artifact created/updated | Yes                                                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-036-refinement-review.md`                                                    |

---

## 2. Diagnóstico PO/BA

US-036 entrega el CRUD de `BudgetItem` por categoría, ya catalogado en `docs/16 §M06` (`POST/PATCH/DELETE /api/v1/events/:eventId/budget/items`) y aprobado por la D1 de US-035 como el surface canónico de mutaciones de presupuesto. El alcance está alineado con `UC-BUDGET-002` ("Gestionar ítems de presupuesto") y `BR-BUDGET-009` (edición libre). La US es pequeña, demoable y "Must Have" del MVP.

Sin embargo, la historia llega con varias decisiones implícitas que deben formalizarse antes de aprobar:

1. **`committed` editable o no**: la historia dice "Editar planned/paid" (AC-02), excluyendo `committed`. Pero `BR-BUDGET-005` establece que `committed` se actualiza automáticamente al confirmar un `BookingIntent`. Falta dejar explícito que el endpoint PATCH **rechaza** `committed` y, si se envía, devuelve 400 o lo ignora silenciosamente.
2. **Política de eliminación**: AC-03 dice "soft delete" y EC-01 dice `409 ITEM_HAS_COMMITMENT` cuando `committed > 0`. Pero no se aborda el caso de `BookingIntent` en estado `pending` (no confirmado) ni el caso de un item con `paid > 0` pero `committed = 0`. Tampoco se documenta cómo los items soft-deleted se reflejan en US-035 (¿se ocultan del listado y de los totales?).
3. **Edición de `service_category_id`**: la US no aclara si la categoría es editable post-creación. Cambiar la categoría tiene impacto en futuros mecanismos de sync con `BookingIntent` (US-038/US-039).
4. **`paid ≤ committed`** (VR-02): no hay BR que respalde esta regla. Es una asunción razonable pero requiere PO.
5. **Política para event status `completed`**: `UC-BUDGET-002 §E2` bloquea `cancelled` pero no menciona `completed`. Por consistencia con US-014/US-015 (read-only), debería bloquearse también.
6. **Múltiples items por categoría**: el domain model permite `Budget.composed of BudgetItem (1:N)` sin restricción de unicidad por categoría, pero no se documenta si el wizard inicial restringe a uno por categoría.

Hay también **traceability incorrecta o incompleta**:
- `BR-BUDGET-003` (cálculo) y `BR-BUDGET-004` (warning de exceso) aplican más a US-035 (vista) que al CRUD.
- Faltan: `BR-BUDGET-002` (estructura), `BR-BUDGET-005` (sync committed), `BR-BUDGET-009` (edición libre), `BR-AI-008` (`ai_generated`), `BR-EVENTTYPE-007` patrón soft delete equivalente.
- `FR-BUDGET-004` (live calc) impacta indirecto vía recalculo de totales.
- Faltan: `Backlog Item: PB-P1-020`, referencia a US-035 (consumidor del cache que se debe invalidar), referencia a US-038/US-039 (sync de `committed` por `BookingIntent`).

Y minor issues:
- `NFR-PERF-API-001` → ID inexistente; el canónico es `NFR-PERF-001`.
- AC-01 no menciona que `ai_generated` debe ser `false` para items creados manualmente (`BR-AI-008`).
- AC-02 no aclara si `service_category_id` es editable.
- EC-01 código `ITEM_HAS_COMMITMENT` no está documentado en el catálogo de errores de `docs/16`.
- Falta política de TanStack cache invalidation hacia US-035 (`['event', eventId, 'budget']`).
- Faltan AC para auth (401), admin (403), recurso ajeno (404 no-revelación).
- Falta política de event status: `cancelled` y `completed` → 409 / 403 (consistente con UC-BUDGET-002 §E2).
- "Considerar bulk update" en Notes debe quedar Out of Scope o moverse a Future.

No hay scope creep ni P4/Future en juego. La historia es MVP-first, pero requiere formalizar 5 decisiones (Q1–Q5) y corregir traceability antes de aprobar.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                                            | Impacto                                                                                                                                                  | Recomendación                                                                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | AC-02 excluye `committed` del PATCH pero no es explícito como regla. `BR-BUDGET-005` exige que `committed` se actualice solo vía `BookingIntent`.                                                                                                                                    | Riesgo de que el endpoint acepte `committed` por error y rompa el contrato con US-038/US-039.                                                            | Resolver vía PO + Tech: el PATCH debe rechazar (400) o ignorar `committed` en el body. Documentar como VR explícita. Ver §7 Q1.                                                                                                                                                            |
| Alta      | Política de eliminación incompleta: EC-01 cubre `committed > 0` pero no cubre `BookingIntent.pending`, `paid > 0` con `committed = 0`, ni la semántica de soft delete frente al listado de US-035.                                                                                  | Inconsistencia entre US-036 (que crea items soft-deleted) y US-035 (que los puede o no listar).                                                            | Resolver vía PO: ¿soft delete oculta del listado y de los totales en US-035? ¿`pending BookingIntent` también bloquea? ¿`paid > 0` también bloquea? Ver §7 Q2.                                                                                                                              |
| Alta      | Política para event status `completed` no documentada. `UC-BUDGET-002 §E2` solo bloquea `cancelled`.                                                                                                                                                                                  | Riesgo de permitir mutaciones en eventos `completed`, inconsistente con US-014/US-015 (read-only).                                                       | Resolver vía PO: bloquear mutaciones en `completed` (devolver 409 o 403) y mantener consistencia. Ver §7 Q3.                                                                                                                                                                              |
| Alta      | Traceability incompleta: faltan `BR-BUDGET-002`, `BR-BUDGET-005`, `BR-BUDGET-009`, `BR-AI-008`, `Backlog Item: PB-P1-020`. `BR-BUDGET-003`/`BR-BUDGET-004` aplican indirectamente.                                                                                                    | Trazabilidad académica rota.                                                                                                                              | Reemplazar IDs durante la refinación. Corrección objetiva contra `docs/4/8/9`.                                                                                                                                                                                                          |
| Media     | VR-02 `paid ≤ committed` no está respaldado por una BR explícita.                                                                                                                                                                                                                  | Regla podría ser arbitraria o entrar en conflicto con futuros casos (pago anticipado).                                                                  | Resolver vía PO: ¿la regla `paid ≤ committed` se mantiene, se relaja a `paid ≤ planned`, o se elimina? Ver §7 Q4.                                                                                                                                                                          |
| Media     | Editabilidad de `service_category_id` no documentada. El domain model permite N:1 BudgetItem→ServiceCategory, pero la US no aclara si es editable post-creación.                                                                                                                       | Cambiar la categoría tiene impacto en `BookingIntent`/`Quote` futuros que apunten al item.                                                                | Resolver vía PO: ¿`service_category_id` es editable? Si sí, ¿requiere `committed = 0` para evitar drift con `BookingIntent`? Ver §7 Q5.                                                                                                                                                     |
| Media     | EC-01 código `ITEM_HAS_COMMITMENT` no documentado en `docs/16 §error format`.                                                                                                                                                                                                       | Inconsistencia con el formato canónico de errores.                                                                                                       | Tras Q2, registrar el código en el catálogo de errores siguiendo el formato (snake_case + `error_code`).                                                                                                                                                                                |
| Media     | NFR-PERF-API-001 no existe; el ID canónico es NFR-PERF-001.                                                                                                                                                                                                                          | Métrica de éxito no traza.                                                                                                                                | Reemplazar por NFR-PERF-001. Documentation Alignment Required (no bloqueante; misma alineación que US-032/033/035).                                                                                                                                                                     |
| Media     | AC-01 no menciona `ai_generated = false` para items creados manualmente (`BR-AI-008`/`FR-TASK-012` equivalente).                                                                                                                                                                     | Riesgo de ambigüedad de origen al inspeccionar items.                                                                                                     | Tras Q1, añadir AC explícito: items creados via POST llevan `ai_generated = false`.                                                                                                                                                                                                     |
| Media     | Falta política de TanStack cache invalidation hacia US-035 (`['event', eventId, 'budget']`).                                                                                                                                                                                          | US-035 no refresca tras mutaciones de US-036.                                                                                                            | Añadir AC: cada mutación exitosa invalida la query key canónica `['event', eventId, 'budget']` (consistente con US-035 D1 handoff).                                                                                                                                                       |
| Media     | Faltan AC para auth (401), admin (403), recurso ajeno (404). EC-01 solo cubre `committed > 0`.                                                                                                                                                                                       | Cobertura QA insuficiente para una historia Must Have.                                                                                                    | Añadir AC y test scenarios explícitos siguiendo el patrón de US-035.                                                                                                                                                                                                                    |
| Baja      | Notes incluye "Considerar bulk update para varios items" — ambiguo (¿in scope o Future?).                                                                                                                                                                                            | Riesgo menor de scope creep.                                                                                                                              | Mover a `Explicitly Out of Scope` como Future (o aclarar como tarea de exploración).                                                                                                                                                                                                    |
| Baja      | "i18n Notes: 4 locales" sin enumerar.                                                                                                                                                                                                                                                | Riesgo menor de QA incompleto.                                                                                                                            | Enumerar `es-LATAM`, `es-ES`, `pt`, `en`.                                                                                                                                                                                                                                                |
| Baja      | "Loading State: Skeleton" sin nota de A11Y.                                                                                                                                                                                                                                          | Riesgo menor de A11Y.                                                                                                                                     | Documentar `aria-busy="true"` y atributos ARIA del inline edit.                                                                                                                                                                                                                          |
| Baja      | Múltiples items por categoría no documentado.                                                                                                                                                                                                                                       | Riesgo de UX confusa o constraint accidental.                                                                                                            | Aclarar: domain model permite N:1 sin unicidad por categoría; documentar que el wizard inicial crea uno por categoría pero el usuario puede agregar más (alineado con BR-BUDGET-009).                                                                                                    |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA; `ai_generated` se preserva en edición.                                                                |
| Respeta backend como source of truth | Pass      | Cálculos derivados; `committed` solo vía BookingIntent.                                                              |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-035/PB-P1-013.                                                                                |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                          |
| No introduce multi-tenant enterprise | Pass      | Ownership por `Event.owner_id`.                                                                                     |
| No introduce P4/Future scope         | Pass      | "Bulk update" debe quedar Out of Scope (Future).                                                                     |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                          | Problema detectado                                                                                                                                       | Acción recomendada                                                                                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail                                                      | No documenta shape del body, `ai_generated = false`, normalización `paid`, ni el response 201.                                                            | Reescribir con request/response shape, `ai_generated = false`, normalización `paid null → 0` (consistente con US-035 D3), respuesta `201 Created` con el item creado.                                                                                                              |
| AC-02 | Needs Detail                                                      | "Editar planned/paid" implícitamente excluye `committed` pero no es testeable como está. No cubre edición de `service_category_id` ni de `label`.         | Reescribir tras Q1/Q5: el body permite `planned`, `paid`, `service_category_id?`, `label?`; rechaza `committed` con 400 explícito. Respuesta `200 OK` con item actualizado.                                                                                                       |
| AC-03 | Needs Detail                                                      | Soft delete sin documentar el filtro en US-035 (Q2). No documenta `204 No Content`.                                                                       | Reescribir tras Q2 con: soft delete (`deleted_at = NOW()`), respuesta `204`, item se oculta del listado de US-035 y deja de contribuir a `summary`.                                                                                                                                |

Negative tests presentes:
- `NT-01 planned negativo → 400` (alineado con VR-01).
- `NT-02 categoría inexistente → 400` (alineado con VR-03).
- `NT-03 ajeno → 403/404` (correcto, 404 no-revelación).

Faltantes:
- No-auth → 401.
- Admin sobre endpoint de organizer → 403.
- Event `cancelled` → 409/403 (UC-BUDGET-002 §E2).
- Event `completed` → 409/403 (tras Q3).
- Eliminar con `BookingIntent.pending` (tras Q2).
- Eliminar con `paid > 0` (tras Q2).
- Editar `committed` → 400 (tras Q1).
- Idempotencia / concurrencia (dos pestañas editando el mismo item).
- Performance / NFR-PERF-001.
- A11Y del inline edit + form errors.
- Contract test contra OpenAPI snapshot.

---

## 6. Gaps Detectados

### Producto / Negocio
- Política exacta de DELETE (committed, pending BookingIntent, paid > 0).
- Política exacta de PATCH (categoría editable, committed rechazado).
- Política para `event.status = completed`.
- Política sobre múltiples items por categoría.
- Regla `paid ≤ committed` formalizada o eliminada.

### Backend / API
- Reuso del módulo `modules/budget` creado por US-035.
- Reuso explícito de `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`.
- Validación Zod del body y path params.
- Códigos de error consistentes con `docs/16 §error format` (`error_code` snake_case).
- Transaccionalidad: ¿se materializan `total_planned`/`total_committed` en `Budget` y se actualizan en la misma transacción? (decisión técnica delegada al Tech Spec, ambas opciones son compatibles).
- Política de `ai_generated`: false en POST, preservado en PATCH (no editable por el cliente).

### Frontend / UX
- Inline edit con `react-hook-form` + Zod en la tabla `BudgetItemsTable` de US-035.
- Confirmación destructiva para DELETE (modal con `event_code: ITEM_HAS_COMMITMENT` traducido).
- Cache invalidation: `['event', eventId, 'budget']` tras cada mutación exitosa.
- Estados: optimistic update opcional (decisión técnica).
- Empty state ya cubierto por `EmptyBudgetState` de US-035.

### Base de Datos
- Sin migraciones nuevas (schema entregado por PB-P0-001 con `deleted_at` ya disponible).
- Validar que `budget_items.deleted_at` está indexado o filtrado con índice parcial.

### Seguridad / Autorización
- `EventOwnershipPolicy` + `OrganizerRoleGuard` + `adminExclusionGuard`.
- No-revelación 404 ante recurso ajeno.
- Validación de `itemId` pertenece al `budget` del `eventId` del path (evita IDOR cruzado).
- Logging sin PII.

### IA / PromptOps
No aplica — esta historia no invoca IA directamente. `ai_generated` se preserva en edición pero no se mutua manualmente.

### QA / Testing
- Tests para auth (401), admin (403), recurso ajeno (404), event status, idempotencia, concurrencia.
- Tests de soft delete y filtro en US-035.
- Tests de invalidación TanStack hacia US-035.
- Test PERF dedicado contra `NFR-PERF-001`.
- Tests A11Y para inline edit y errores de formulario.
- Contract test contra OpenAPI snapshot (handoff US-098).

### Seed / Demo
- Sin cambios; reuso del seed de US-035/US-031.

### Documentación / Trazabilidad
- IDs incorrectos/incompletos en Traceability.
- Falta `Backlog Item: PB-P1-020`, dependencia explícita a US-035.
- Falta enumerar locales i18n.

---

## 7. Preguntas Pendientes

| Tipo   | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Bloquea aprobación | Responsable      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------- |
| Tech+PO | Q1. ¿Cómo se trata `committed` en el body del PATCH? Opciones: (a) **rechazar con 400** si viene en el body (explícito y testeable, consistente con `BR-BUDGET-005`); (b) ignorar silenciosamente; (c) permitir override administrativo (no aplica en MVP). Recomendado (a).                                                                                                                                                                                                                                                                                                                                                                                                                  | Sí                 | Tech Lead + PO   |
| PO     | Q2. ¿Política exacta de DELETE? Definir: (a) si `committed > 0` → 409 `ITEM_HAS_COMMITMENT` (cubierto); (b) si existe `BookingIntent.pending` apuntando al item → 409 `ITEM_HAS_PENDING_INTENT` o se permite (porque pending no compromete); (c) si `paid > 0` con `committed = 0` (caso teórico) → ¿se permite?; (d) los items soft-deleted (`deleted_at IS NOT NULL`) deben filtrarse del listado y de los totales de US-035 (alineado con D3 de US-033 para tasks soft-deleted) — confirmar política.                                                                                                                                                                                       | Sí                 | Product Owner   |
| PO     | Q3. ¿Las mutaciones (POST/PATCH/DELETE) en eventos `completed` se permiten o se bloquean? `UC-BUDGET-002 §E2` solo bloquea `cancelled`. Por consistencia con US-014 (dashboard read-only en cancelled) y US-015 (auto-complete event read-only), recomendado bloquear ambos con 409 / 403.                                                                                                                                                                                                                                                                                                                                                                                                  | Sí                 | Product Owner   |
| PO     | Q4. ¿Se mantiene `VR-02 paid ≤ committed`? No hay BR explícita. Alternativas: (a) mantener (conservador); (b) relajar a `paid ≤ planned` (más laxo, permite pago anticipado); (c) eliminar (sin restricción cruzada, solo `paid ≥ 0`).                                                                                                                                                                                                                                                                                                                                                                                                                                                | Sí                 | Product Owner   |
| PO     | Q5. ¿`service_category_id` es editable en PATCH? Opciones: (a) sí, libremente (alineado con BR-BUDGET-009 "edición libre"); (b) sí solo si `committed = 0` (evita drift con `BookingIntent`); (c) no editable (forzar borrar + crear). Y por separado: ¿permitimos múltiples items por categoría (alineado con domain model 1:N)?                                                                                                                                                                                                                                                                                                                                                            | Sí                 | Product Owner   |

---

## 8. Documentation Alignment Required

| Documento / Fuente                          | Conflicto detectado                                                                                                | Decisión vigente                                                                              | Acción recomendada                                                                                                                              | ¿Bloquea aprobación? |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/10-Non-Functional-Requirements.md`    | US-036 usa `NFR-PERF-API-001`; el canónico es `NFR-PERF-001`.                                                       | `NFR-PERF-001`.                                                                                | Corregir durante la refinación. Alineación ya registrada en US-032/033/035.                                                                     | No                   |
| `docs/16-API-Design-Specification.md §error format` | EC-01 código `ITEM_HAS_COMMITMENT` no está catalogado.                                                              | Tras Q2, registrar el código en el catálogo de errores siguiendo el formato `error_code` snake_case. | Tras Q2, añadir a `docs/16 §errors`.                                                                                                            | No (tras Q2)         |
| `docs/8 §UC-BUDGET-002`                      | E2 solo bloquea `cancelled`; no menciona `completed`.                                                                | Tras Q3, decisión PO.                                                                          | Tras Q3, añadir nota interpretativa en `UC-BUDGET-002` y/o crear ADR si se prefiere.                                                            | No (tras Q3)         |
| `docs/16 §M06 Budget` (Items)                | Falta documentar response shapes (`BudgetItemDto`) y código de error 409 `ITEM_HAS_COMMITMENT`.                       | Tras Q1/Q2, alineación.                                                                        | Actualizar `docs/16 §M06`. Snapshot OpenAPI por US-098 (Future).                                                                                | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                          |
| User Story file path                       | `management/user-stories/US-036-crud-budget-items.md`                                       |
| User Story ID verified                     | Yes                                                                                         |
| Decision Resolution artifact found         | No                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-036-decision-resolution.md`                |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-036-refinement-review.md`                    |
| Final recommended status                   | Needs Refinement                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                         |
| Reason                                     | 5 preguntas bloqueantes (Q1–Q5) requieren decisión PO + Tech Lead. Resolverlas obliga a reescribir AC-01..03, VR-02, EC, SEC y Traceability. |

---

## 10. Cambios Aplicados o Recomendados

(El archivo no fue actualizado. Lista prescriptiva para aplicar tras la resolución de Q1–Q5.)

### Metadata
- Añadir `Backlog Item: PB-P1-020`.
- `Last Updated` → próxima ejecución.
- `Status` → `Ready for Approval` tras decisiones.

### Business Context
- `Context Summary` reformulado: CRUD libre por categoría (BR-BUDGET-009), `committed` system-managed (BR-BUDGET-005), soft delete con filtrado en US-035.
- `Assumptions`: `paid` opcional normalizado (consistencia con US-035 D3), `ai_generated = false` en POST y preservado en PATCH.
- `Dependencies`: añadir US-035 (consumidor de cache), PB-P1-020 (backlog), US-038/US-039 (sync de `committed` por `BookingIntent`).

### PO/BA Decisions Applied
- Sección nueva con D1–D5 formalizadas.

### Traceability
- `FRD Requirement(s)`: FR-BUDGET-003 (CRUD), FR-BUDGET-001 (1:1), FR-BUDGET-007 (sin FX), FR-BUDGET-008 (edición tras IA).
- `Use Case(s)`: UC-BUDGET-002.
- `Business Rule(s)`: BR-BUDGET-002, BR-BUDGET-005, BR-BUDGET-007, BR-BUDGET-009, BR-AI-008.
- `Permission Rule(s)`: Ownership + `OrganizerRoleGuard` + `adminExclusionGuard`.
- `Data Entity / Entities`: `BudgetItem`, `Budget`, `ServiceCategory`.
- `API Endpoint(s)`: `POST/PATCH/DELETE /api/v1/events/:eventId/budget/items` (consistente con `docs/16 §M06`).
- `NFR Reference(s)`: NFR-PERF-001.
- `Related Document(s)`: `/docs/4 §BR-BUDGET-*`, `/docs/6 §BudgetItem`, `/docs/8 §UC-BUDGET-002`, `/docs/9 §FR-BUDGET-*`, `/docs/10 §NFR-PERF-001`, `/docs/16 §M06`, `management/user-stories/US-035-view-edit-budget.md`.

### Scope Guardrails
- `Explicitly Out of Scope`: bulk update / batch endpoints (Future), edición de `committed` (system-managed), captura de tarjeta, workflow de aprobación interna.

### Acceptance Criteria
- AC-01 reescrito con body, response 201, `ai_generated = false`, normalización `paid`, invalidación de cache.
- AC-02 reescrito tras Q1/Q5: body permitido (planned, paid, service_category_id?, label?), rechazo de `committed` con 400.
- AC-03 reescrito tras Q2: soft delete, 204, filtrado en US-035, manejo de `committed > 0` / `BookingIntent.pending` / `paid > 0`.
- AC-04 nuevo: bloqueo en `cancelled` y `completed` (tras Q3).
- AC-05 nuevo: invalidación TanStack `['event', eventId, 'budget']`.
- AC-06 nuevo: `ai_generated` se preserva en PATCH.
- AC-07 nuevo: A11Y inline edit con anuncios de errores.
- AC-08 nuevo: P95 < 1.5 s (NFR-PERF-001).

### Edge Cases
- EC-01 reescrito (committed > 0).
- EC-02 nuevo: BookingIntent.pending apuntando al item (tras Q2).
- EC-03 nuevo: paid > 0 con committed = 0 (tras Q2).
- EC-04 nuevo: event `cancelled` (UC-BUDGET-002 §E2).
- EC-05 nuevo: event `completed` (tras Q3).
- EC-06 nuevo: concurrencia (dos pestañas editando).

### Validation Rules
- VR-01 `planned ≥ 0`.
- VR-02 reescrita tras Q4 (`paid ≥ 0` ± relación con committed/planned).
- VR-03 categoría existente y activa.
- VR-04 nuevo: `committed` no editable (Q1).
- VR-05 nuevo: `service_category_id` editabilidad (Q5).
- VR-06 nuevo: `eventId` y `itemId` UUID válidos.
- VR-07 nuevo: itemId pertenece al budget del eventId (anti-IDOR).
- VR-08 nuevo: sin sesión → 401.

### Authorization & Security Rules
- SEC-01 `EventOwnershipPolicy` + `OrganizerRoleGuard`.
- SEC-02 `adminExclusionGuard`.
- SEC-03 no-revelación 404.
- SEC-04 `itemId` cross-event check.
- SEC-05 logging sin PII (montos como atributos auditables).

### Technical Notes
- Backend: `CreateBudgetItemUseCase`, `UpdateBudgetItemUseCase`, `DeleteBudgetItemUseCase` con `BudgetItemRepository`.
- Frontend: integración con `BudgetItemsTable` de US-035 (edición inline RHF + Zod); modal de confirmación para DELETE.
- API: mismo path base `/budget/items/*` (consistente con `docs/16 §M06`).
- Observability: log `budget.item.created`, `budget.item.updated`, `budget.item.deleted` con `eventId`, `userId`, `itemId`, `service_category_id`, `correlationId`. Sin PII.

### Test Scenarios
- Functional: TS-01 CRUD básico, TS-02 DELETE blocked committed > 0, TS-03 cache invalidation, TS-04 ai_generated preservado.
- Negative: NT-01..NT-08 (planned negativo, categoría inexistente, ajeno, no-auth, admin, committed editable, cancelled, completed).
- AUTH-TS-01..05 (owner, otro, vendor, admin, no-auth).
- PERF-01 P95 < 1.5 s.
- A11Y-01..03 (inline edit, modal confirmación, anuncios).
- CONTRACT-01.

### Definition of Ready
- Marcar `[x] PO/BA validó`.

### Definition of Done
- Añadir: cache invalidation verificada, contract test verde, log emitido, A11Y verificada, snapshot OpenAPI (US-098 handoff).

### Notes
- Reemplazar "Considerar bulk update" por nota Out of Scope (Future).

---

## 11. Recomendación Final

`Needs Refinement`

5 preguntas (Q1: committed en PATCH; Q2: política exacta de DELETE; Q3: bloqueo en `completed`; Q4: regla `paid ≤ committed`; Q5: editabilidad de `service_category_id` + múltiples items por categoría) requieren decisión PO/Tech Lead antes de reescribir AC, EC, VR, SEC y Traceability. Las decisiones están bien acotadas y se pueden resolver con respaldo en `BR-BUDGET-002/005/009`, `UC-BUDGET-002`, `docs/16 §M06` y D1 de US-035.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review.

---

User Story file updated: No
Path: management/user-stories/US-036-crud-budget-items.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-036-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
