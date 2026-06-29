# User Story Refinement Review — `US-027`

## Source User Story File
management/user-stories/US-027-view-event-checklist.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-027-decision-resolution.md (no existe; no requerido)

## Review Date
2026-06-26

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-027                                                           |
| File Path                                  | management/user-stories/US-027-view-event-checklist.md            |
| Backlog Item                               | PB-P1-018 — CRUD de tareas manuales y máquina de estados          |
| Epic                                       | EPIC-TASK-001 — Checklist & Task Management                       |
| Estado actual                              | Draft (entrada); Ready for Approval (salida)                      |
| Estado recomendado                         | Ready for Approval                                                |
| Nivel de riesgo                            | Bajo                                                              |
| Calidad general                            | Alta                                                              |
| Requiere decisión PO                       | No                                                                |
| Requiere decisión técnica                  | No                                                                |
| Requiere decisión QA                       | No                                                                |
| Requiere decisión Seguridad                | No                                                                |
| Decision Resolution artifact found         | No                                                                |
| User Story file updated                    | Yes                                                               |
| Refinement review artifact created/updated | Yes                                                               |
| Refinement review path                     | management/user-stories/refinement-reviews/US-027-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-027 es la vista de lectura (GET) del checklist del evento — la pantalla operativa diaria del rol Organizer. El draft original era esquemático: trazabilidad mínima, AC limitados, paginación sugerida `10` (no canónica), un solo edge case, sin PO/BA Decisions Applied y sin distinción entre filtros básicos (de esta historia) y filtros temporales (PB-P1-019). El backlog confirma que US-027 comparte PB-P1-018 con US-028/029/030 (CRUD manual + estados) y que los filtros temporales y el % de progreso pertenecen a PB-P1-019 (US-032/033). La historia es valiosa para el MVP (acceso central del Organizer), implementable sobre la fundación ya cubierta por la familia US-028..US-031, y no requiere decisiones PO nuevas: la paginación canónica, ownership, soft delete enforced y status enum ya están formalizados en `/docs/16`, `/docs/18`, `/docs/4` y US-013.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                              | Impacto                                                              | Recomendación                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Media     | Paginación sugerida `10` en el draft no coincide con el canónico EventFlow (`20` default).            | Inconsistencia API entre US-013 y US-027.                            | Adoptar `pageSize=20` default, `100` máx; alineado con US-013 y `/docs/16` §28. Aplicado.                            |
| Media     | Trazabilidad NFR usaba `NFR-PERF-API-001` (stale); el canónico es `NFR-PERF-001`.                     | Trazabilidad incorrecta a documento NFR.                              | Reemplazado por `NFR-PERF-001` + `NFR-PERF-005` (paginación). Aplicado.                                              |
| Media     | Filtros temporales (próximos 7/30 días) estaban implícitos en el draft; pertenecen a US-032 (PB-P1-019). | Riesgo de scope creep; ambigüedad para el Tech Spec.                  | Excluidos explícitamente de US-027; documentados en Out of Scope con referencia a US-032/033.                       |
| Media     | Estado vacío sólo mencionaba CTAs sin distinguir manual vs IA.                                        | UX ambigua para Organizer nuevo.                                     | Estado vacío canónico con doble CTA: "Crear tarea" (US-028) + "Generar checklist IA" (US-018).                       |
| Baja      | DTO no estaba definido; riesgo de filtración de datos sensibles (`prompt_version_id`, `llm_provider`). | Posible scope creep / leak.                                          | Definido `TaskListItemDto` minimal con trazabilidad IA sin payloads del LLM (`ai_generated`, `ai_recommendation_id`, `confirmed_at`). |
| Baja      | Edge cases insuficientes (solo `EC-01: evento completed`).                                            | Cobertura QA pobre.                                                  | Expandido a EC-01..08 (filtros inválidos, pageSize/page fuera de rango, completed/cancelled/soft-deleted, due_date null, combinados). |
| Baja      | Authorization tests no cubrían admin ni soft-deleted.                                                 | Falta cobertura de no-revelación.                                    | AUTH-TS-01..05 + NT-01..11 cubren todos los escenarios.                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                              |
| ------------------------------------ | --------- | ----------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Endpoint de lectura sin montos.                                          |
| No introduce contratos firmados      | Pass      | Out of scope.                                                            |
| No introduce WhatsApp/chat/push      | Pass      | Recordatorios push explícitamente fuera de scope.                        |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA; sólo expone trazabilidad existente.                         |
| Respeta backend como source of truth | Pass      | Ownership backend-only; paginación server-side; filtros validados.        |
| Respeta seed/demo si aplica          | Pass      | No requiere seed nuevo; consume tareas creadas por US-028 / US-018/025/031. |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                               |
| No introduce multi-tenant enterprise | Pass      | Ownership por usuario.                                                   |
| No introduce P4/Future scope         | Pass      | Filtros temporales, % progreso, search FT, push, export: todos fuera de scope. |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                  | Acción recomendada                                                  |
| ----- | ------------ | --------------------------------------------------- | ------------------------------------------------------------------- |
| AC-01 | Clear        | Original ambiguo en orden y soft delete.            | Reescrito: orden `due_date asc nulls last` + desempate `created_at desc`; envelope `pagination`. |
| AC-02 | Clear        | No existía.                                         | Agregado: filtro por `status` con conservación de orden + paginación. |
| AC-03 | Clear        | No existía.                                         | Agregado: filtro por `aiGenerated` expone `ai_recommendation_id`.    |
| AC-04 | Clear        | No existía; categoría opcional sin definir.         | Agregado: filtro por `categoryCode` y valor literal `"null"`.        |
| AC-05 | Clear        | No existía.                                         | Agregado: paginación explícita con `page=2&pageSize=20`.             |
| AC-06 | Clear        | Original AC-02 confundía empty state con detalles.  | Reescrito: `items=[]`, `totalItems=0`, doble CTA UX.                 |
| AC-07 | Clear        | No existía.                                         | Agregado: trazabilidad IA sin payloads del LLM.                       |
| AC-08 | Clear        | No existía.                                         | Agregado: i18n con `Accept-Language` y fallback `es-LATAM`.          |

---

## 6. Gaps Detectados

### Producto / Negocio

* Filtros temporales y % progreso aclarados como dependencia futura (US-032/033/PB-P1-019), no parte de US-027.

### Backend / API

* DTO `TaskListItemDto` ahora definido con campos exactos y sin payloads sensibles.
* `ListEventTasksUseCase` y `EventTaskRepository.findByEventPaginated` propuestos.
* Guard `adminExclusionGuard` reutilizable.

### Frontend / UX

* Componente `EmptyChecklistState` con doble CTA.
* `useEventTasks` con TanStack + invalidación tras mutaciones de US-028/029/030/031.
* Filtros colapsables en mobile.

### Base de Datos

* Sin migraciones nuevas. Índice canónico `idx_event_tasks_event_status_due` ya documentado en `/docs/18`.

### Seguridad / Autorización

* Ownership + no-revelación + admin excluido formalizados (SEC-01..08).
* Logs sin PII (sin `title` ni `description`).

### IA / PromptOps

* No aplica directamente. Trazabilidad IA expuesta como metadata read-only.

### QA / Testing

* 8 functional + 11 negative + 5 authorization + accesibilidad + perf con dataset 200 tareas.

### Seed / Demo

* No requiere cambios de seed; reusa fixtures de US-018/025/028.

### Documentación / Trazabilidad

* 3 Documentation Alignment Required identificadas (no bloqueantes).

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

| Documento / Fuente            | Conflicto detectado                                                                                  | Decisión vigente                                                                              | Acción recomendada                                                                                   | ¿Bloquea aprobación? |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- |
| `/docs/16` §28                | Draft sugería `pageSize=10` default; canónico EventFlow es `pageSize=20`, máx `100`.                  | `pageSize=20` default, `100` máx (aplicado en US-013 y `/docs/16`).                            | Cleanup editorial en `/docs/16` para reafirmar el patrón; no es contradicción real.                    | No                   |
| `/docs/10` NFR                | Draft usaba `NFR-PERF-API-001` (renumerado).                                                         | `NFR-PERF-001` (P95 ≤ 1.5 s) y `NFR-PERF-005` (paginación) son los canónicos.                  | Cleanup editorial en `/docs/10`.                                                                       | No                   |
| `/docs/16` OpenAPI snapshot   | Snapshot debe regenerarse para reflejar filtros `status`, `aiGenerated`, `categoryCode`.              | Patrón canónico ya documentado; falta regeneración del snapshot.                              | Coordinar regeneración vía US-098.                                                                     | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                   |
| User Story file path                       | `management/user-stories/US-027-view-event-checklist.md`                              |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-027-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-027-refinement-review.md`              |
| Final recommended status                   | Ready for Approval                                                                    |
| Next recommended skill                     | eventflow-user-story-approval                                                          |
| Reason                                     | Todas las decisiones están formalizadas; trazabilidad corregida; scope acotado a la vista de lectura paginada; 3 Documentation Alignment no bloqueantes. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* Agregado `Backlog Item: PB-P1-018`.
* Agregado `UI Surface: Página "Mi checklist" del evento, vista listado paginada`.
* Renombrado `Feature: Visualización paginada del checklist del evento`.
* `Status: Draft → Ready for Approval`.
* `Last Updated: 2026-06-09 → 2026-06-26`.

### Business Context

* Reescrito el `Context Summary` para distinguir lectura vs CRUD (US-028..030) y bulk (US-031).
* Lista canónica de `Related Domain Concepts` con tipos y estados exactos.
* `Assumptions` ampliados con paginación canónica y ausencia de cálculos de progreso.
* `Dependencies` expandidas a PB-P1-018/012/016/017/006, PB-P0-001/014.

### PO/BA Decisions Applied

* Sección nueva con 13 decisiones formalizadas (endpoint canónico, paginación canónica, validación tolerante, orden por defecto, soft delete enforced, ownership backend-only, read-only UX por `event.status`, trazabilidad IA sin payloads, categoría opcional, doble CTA, i18n response, performance budget, sin telemetría de mutación).

### Traceability

* Corregida a `FR-TASK-001/002`, `FR-AI-019`, `UC-TASK-001/002`, `BR-TASK-001/002/008/009`, `BR-AI-008/010`, `NFR-PERF-001/005`, `NFR-OBS-001/002`, `NFR-SEC-005`, `ADR-API-001/004`. Eliminados IDs stale (`NFR-PERF-API-001`).

### Scope Guardrails

* `Explicitly Out of Scope` expandido (CRUD, bulk confirm, filtros temporales, % progreso, search FT, push, export, admin global, vistas guardadas).
* `Scope Notes` con confirmación de sin migraciones y reuso de índices canónicos.

### Acceptance Criteria

* Ampliados a 8 AC en GWT con resultados verificables.

### Technical Notes

* Frontend: componentes, hook y cache key.
* Backend: use case, repository, controller, policy, validación Zod tolerante.
* Database: índices canónicos, sin migración.
* API: endpoint canónico con query params.
* Observability: log + métricas.

### QA Notes

* Expandido a 8 functional, 11 negative, 5 authorization, accesibilidad, perf.

### Definition of Ready

* 12/13 checks marcados; falta sólo la validación PO/BA (sigue a aprobación).

### Definition of Done

* Endpoint operativo, ownership enforced, soft delete enforced, DTO redactado, i18n verificada, performance verificada, tests verdes, demo PO.

### Notes

* 3 Documentation Alignment Required.
* Aclaraciones sobre filtros temporales (US-032/033), DTO minimal sin `description`, performance budget.

---

## 11. Recomendación Final

`Ready for Approval`.

US-027 cubre completamente la vista de lectura del checklist del evento con scope acotado, trazabilidad correcta, paginación canónica consistente con US-013, validación tolerante alineada con el patrón EventFlow, no-revelación enforced, doble CTA en estado vacío y i18n en 4 locales. Las 3 notas de Documentation Alignment son no bloqueantes y se resuelven con cleanup editorial menor en `/docs/16` y `/docs/10` más la regeneración del snapshot OpenAPI vía US-098. No requiere decisiones PO/Tech/QA/Security adicionales. Siguiente paso: `eventflow-user-story-approval`.
