# User Story Refinement Review — `US-032`

## Source User Story File
`management/user-stories/US-032-filter-tasks-by-timerange.md`

## Decision Resolution Artifact
`management/user-stories/decision-resolutions/US-032-decision-resolution.md` (no creado — no requerido)

## Review Date
2026-06-26

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-032                                                                                                    |
| File Path                                  | `management/user-stories/US-032-filter-tasks-by-timerange.md`                                              |
| Backlog Item                               | PB-P1-019 — Filtros y progreso del checklist                                                              |
| Epic                                       | EPIC-TASK-001 — Checklist & Task Management                                                              |
| Estado actual                              | Ready for Approval                                                                                        |
| Estado recomendado                         | Ready for Approval                                                                                        |
| Nivel de riesgo                            | Bajo                                                                                                      |
| Calidad general                            | Alta                                                                                                      |
| Requiere decisión PO                       | No                                                                                                        |
| Requiere decisión técnica                  | No                                                                                                        |
| Requiere decisión QA                       | No                                                                                                        |
| Requiere decisión Seguridad                | No                                                                                                        |
| Decision Resolution artifact found         | No                                                                                                        |
| User Story file updated                    | Yes                                                                                                        |
| Refinement review artifact created/updated | Yes                                                                                                        |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-032-refinement-review.md`                                  |

---

## 2. Diagnóstico PO/BA

US-032 es una extensión natural y de bajo riesgo del endpoint canónico ya implementado en US-027. La historia entrega un filtro temporal operativo (`Vencidas`, `Próx. 7 días`, `Próx. 30 días`, `Todas`) que reduce el ruido visual y permite al organizador priorizar trabajo inmediato.

La decisión clave de refinamiento fue **adoptar un enum único `range` con 4 valores mutuamente excluyentes** en lugar de `within=7d|30d` + `overdue=true` como parámetros independientes. Esta decisión:

1. Preserva la semántica del control segmentado UI (un solo toggle activo a la vez).
2. Elimina ambigüedad cuando el cliente envía combinaciones contradictorias.
3. Es consistente con el patrón de filtros tolerantes de US-027.
4. Simplifica el cálculo server-side (un solo `WHERE` por rango canónico).

La historia respeta íntegramente las invariantes de US-027 (ownership, soft delete, paginación, ordenamiento) y delega el cálculo de `% de progreso` a US-033 dentro del mismo backlog item.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                | Impacto                                                          | Recomendación                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Media     | Documentation Alignment Required: `FR-TASK-009/010` están clasificados como `Should Have` en `/docs/9`, pero PB-P1-019 los promueve a `Must Have` MVP. | Inconsistencia entre FRD y Backlog Prioritization.                | Formalizar la promoción en `/docs/9` o documentar en `Acceptance Summary` de PB-P1-019. No bloquea.        |
| Media     | Documentation Alignment Required: el draft original referenciaba `NFR-PERF-API-001` (stale); el canónico es `NFR-PERF-001`. | Renumeración.                                                    | Cleanup editorial en `/docs/10`. No bloquea.                                                              |
| Media     | Documentation Alignment Required: el snapshot OpenAPI debe regenerarse para reflejar el nuevo parámetro `range` en `GET /events/:eventId/tasks`. | Snapshot desactualizado.                                          | Coordinar regeneración vía US-098. No bloquea.                                                            |
| Baja      | El cálculo de `current_date` usa la zona horaria del servidor (`CURRENT_DATE` de PostgreSQL).             | Discrepancia eventual de 1 día con clientes en zonas extremas.    | Aceptable para filtro operativo. Si se vuelve crítico (Future), evaluar `event.timezone` como referencia.   |
| Baja      | El cache de TanStack `['tasks', eventId, { range, ... }]` no se invalida automáticamente cross-día.       | Vista stale al cambiar de día sin refetch.                       | Documentado en EC-09; se considera caso aceptable de cache corta. La UI invalida al cambiar de toggle.    |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | N/A                                                                                                       |
| No introduce contratos firmados      | Pass      | N/A                                                                                                       |
| No introduce WhatsApp/chat/push      | Pass      | Notificaciones de tareas vencidas quedan delegadas a UC-NOTIF-001, fuera de este backlog item.            |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA.                                                                                             |
| Respeta backend como source of truth | Pass      | `CURRENT_DATE` y los flags `overdue`/`is_t_minus_7` se derivan server-side.                                |
| Respeta seed/demo si aplica          | N/A       | Sin cambios de seed.                                                                                      |
| No introduce RAG/vector DB           | Pass      | N/A                                                                                                       |
| No introduce multi-tenant enterprise | Pass      | N/A                                                                                                       |
| No introduce P4/Future scope         | Pass      | Rangos custom, notifs y vistas guardadas explícitamente fuera de scope.                                    |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad | Problema detectado | Acción recomendada |
| ----- | ------- | ------------------ | ------------------ |
| AC-01 | Clear   | —                  | —                  |
| AC-02 | Clear   | —                  | —                  |
| AC-03 | Clear   | —                  | —                  |
| AC-04 | Clear   | —                  | —                  |
| AC-05 | Clear   | —                  | —                  |
| AC-06 | Clear   | —                  | —                  |
| AC-07 | Clear   | —                  | —                  |
| AC-08 | Clear   | —                  | —                  |

Los 8 AC cubren los 4 rangos canónicos, la combinabilidad con otros filtros, el comportamiento del control UI y los badges visuales. Las EC complementan con casos boundary (medianoche, `due_date IS NULL`, intersecciones vacías, evento ajeno).

---

## 6. Gaps Detectados

### Producto / Negocio

No aplica. La historia tiene scope claro y delegado.

### Backend / API

No aplica. La extensión del schema Zod y del WHERE es trivial. El use case y repository de US-027 ya soportan la extensión.

### Frontend / UX

No aplica. El componente `TaskRangeFilter` es un patrón conocido (segmented control) con accesibilidad documentada.

### Base de Datos

No aplica. El índice canónico ya cubre los WHERE. La nota de Future sobre índice parcial queda documentada para evaluación post-MVP si NFR-PERF-001 se incumple.

### Seguridad / Autorización

No aplica. Reuso íntegro de US-027.

### IA / PromptOps

No aplica — esta historia no invoca IA directamente.

### QA / Testing

No aplica. La suite de tests cubre funcional, negativo, autorización, accesibilidad, performance y boundary (medianoche, DST).

### Seed / Demo

No requiere cambios de seed/demo.

### Documentación / Trazabilidad

Tres alineamientos documentales no bloqueantes (ver sección 8).

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| `/docs/9-FRD.md` (`FR-TASK-009/010`) | `Should Have` en FRD vs `Must Have` en PB-P1-019 | `Must Have` por Backlog Prioritization | Formalizar promoción en `/docs/9` o nota en Acceptance Summary | No |
| `/docs/10-NFR.md` | Draft original referenciaba `NFR-PERF-API-001` (stale) | `NFR-PERF-001` canónico | Cleanup editorial | No |
| `/docs/16-API-Design-Specification.md` | Snapshot OpenAPI no refleja `range` | Documentado en este refinamiento | Coordinar regeneración vía US-098 | No |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                                       |
| User Story file path                       | `management/user-stories/US-032-filter-tasks-by-timerange.md`                                              |
| User Story ID verified                     | Yes                                                                                                       |
| Decision Resolution artifact found         | No                                                                                                        |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-032-decision-resolution.md` (no requerido)                |
| Refinement review artifact created/updated | Yes                                                                                                       |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-032-refinement-review.md`                                  |
| Final recommended status                   | Ready for Approval                                                                                        |
| Next recommended skill                     | `eventflow-user-story-approval`                                                                            |
| Reason                                     | Sin bloqueadores. Decisiones formalizadas. 3 alineamientos documentales no bloqueantes.                  |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* Agregado `Backlog Item: PB-P1-019 — Filtros y progreso del checklist`.
* Agregado `UI Surface: Página "Mi checklist" del evento, control segmentado por rango temporal`.
* Status cambiado a `Ready for Approval`.
* `Last Updated` actualizado a `2026-06-26`.

### Business Context

* Expandido `Context Summary` con la decisión de extensión sobre US-027.
* Agregado `Related Domain Concepts` con `current_date()`, `TaskListItemDto` extendido.
* Agregadas `Assumptions` sobre `due_date` puro sin TZ, exclusión de `due_date IS NULL` en rangos temporales y exclusividad mutua.
* Expandida sección `Dependencies` con `PB-P1-018`, `PB-P1-012`, `PB-P1-019/US-033`.

### PO/BA Decisions Applied

* Agregada nueva sección con 15 decisiones canónicas, incluyendo:
  * Extensión (no nuevo endpoint).
  * Enum `range` único con 4 valores mutuamente excluyentes.
  * Tolerancia Zod `.catch('all')`.
  * Definición canónica de "Vencidas".
  * Exclusión de `due_date IS NULL` en rangos temporales.
  * Cálculo server-side de "today" con `CURRENT_DATE`.
  * DTO extendido con `overdue` e `is_t_minus_7`.
  * Combinabilidad con otros filtros.
  * Read-only en `completed`/`cancelled`.
  * Ordenamiento canónico inalterado.
  * Sin migraciones nuevas.
  * Telemetría con `range_filter` y `range_dropped`.

### Traceability

* Trazabilidad corregida: `FR-TASK-009/010` (no `FR-TASK-009` solo), `UC-TASK-006`, `BR-TASK-007/008/009/010` (no `BR-TASK-006`), `NFR-PERF-001/005`, `NFR-OBS-001/002`.
* Agregada `PO Decision(s)` referenciando Acceptance Summary de PB-P1-019 y la decisión interna del refinamiento sobre el enum `range`.
* Agregado `Related Document(s)` con `/docs/4`, `/docs/6`, `/docs/16` §28, `/docs/18`, `/docs/19`, `4-Product-Backlog-Prioritized.md`.

### Scope Guardrails

* Expandido `Explicitly Out of Scope` con: rangos personalizados, % progreso (US-033), notifs (UC-NOTIF-001), búsqueda full-text, vistas guardadas, filtros sobre soft-deleted, modificación de ordenamiento, endpoint admin.
* Agregado `Scope Notes` reforzando reuso de US-027.

### Acceptance Criteria

* Expandidos de 2 a 8 AC (4 rangos canónicos + combinaciones + UI + badges).
* AC reescritos en GWT estricto con detalles de SQL y DTO.

### Edge Cases

* Expandidos de 1 a 10 EC: descarte silencioso, `due_date IS NULL`, boundary `due_date=today`, `done`/`skipped` con fecha pasada, intersección vacía, evento `completed`/`cancelled`, paginación con filtros, cambio de día a medianoche, evento ajeno.

### Validation Rules

* Expandidos de 1 a 8 VR.

### Authorization & Security Rules

* Expandidos de 1 a 8 SEC con reuso explícito de US-027.

### Technical Notes

* Frontend, Backend, Database, API y Observability re-escritos con detalles de extensión sobre US-027 (sin duplicar implementación).

### Test Scenarios

* Expandidos: 10 TS funcionales, 9 NT, 5 AUTH-TS, 3 CONC, 4 A11Y, 3 PERF.

### Definition of Ready

* Todos los checks marcados; queda pendiente solo `PO/BA validó` (corresponde al approval gate).

### Definition of Done

* Reescrito con criterios concretos de implementación.

### Notes

* Documentación de alineamientos no bloqueantes y decisiones de cache UI.

---

## 11. Recomendación Final

`Ready for Approval`.

US-032 está completa, clara, testeable, trazable y consistente con la arquitectura EventFlow. Las decisiones canónicas están aplicadas y los 3 alineamientos documentales son cleanup editorial no bloqueante. El próximo paso es ejecutar `eventflow-user-story-approval`.
