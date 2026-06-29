# User Story Refinement Review — `US-029`

## Source User Story File
management/user-stories/US-029-edit-delete-task.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-029-decision-resolution.md (no requerido)

## Review Date
2026-06-26

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-029                                                           |
| File Path                                  | management/user-stories/US-029-edit-delete-task.md               |
| Backlog Item                               | PB-P1-018                                                        |
| Epic                                       | EPIC-TASK-001 — Checklist & Task Management                      |
| Estado actual                              | Ready for Approval                                               |
| Estado recomendado                         | Ready for Approval                                               |
| Nivel de riesgo                            | Bajo                                                             |
| Calidad general                            | Alta                                                             |
| Requiere decisión PO                       | No                                                               |
| Requiere decisión técnica                  | No                                                               |
| Requiere decisión QA                       | No                                                               |
| Requiere decisión Seguridad                | No                                                               |
| Decision Resolution artifact found         | No                                                               |
| User Story file updated                    | Yes                                                              |
| Refinement review artifact created/updated | Yes                                                              |
| Refinement review path                     | management/user-stories/refinement-reviews/US-029-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-029 entrega las tres mutaciones canónicas sobre `EventTask` consistentes con `/docs/16` §25.2: PATCH content, PATCH status y DELETE soft. Es la pieza CRUD que cierra el ciclo de gestión manual y compartida con la fundación de tareas (PB-P1-018), reutilizando explícitamente la infraestructura de US-027 (lista) y US-028 (crear). La historia respeta los principios MVP: backend como source of truth para autorización, HITL ya cerrado en US-025/US-031 (no se toca `confirmed_at` aquí), soft delete enforced y `ai_generated`/`ai_recommendation_id` inmutables (`FR-TASK-012`). Las 3 alineaciones documentales son no bloqueantes y siguen los patrones formalizados en US-028.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                  | Impacto                                                              | Recomendación                                                                                                |
| --------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Media     | Draft original definía endpoint `/api/v1/tasks/:id` sin nesting de evento                | Inconsistencia con el patrón canónico de `/docs/16` §25.2             | Aplicado: tres endpoints anidados `/api/v1/events/:eventId/tasks/:taskId`. Coordina con snapshot OpenAPI vía US-098. |
| Media     | `FR-TASK-003` y `FR-TASK-004` mapeados sin distinción de endpoint                         | Confusión sobre cuál endpoint cubre qué                              | Aplicado: split en PATCH content (FR-TASK-003), PATCH status (FR-TASK-004), DELETE (FR-TASK-005 + PO Decision PB-P1-018). |
| Media     | `confirmed_at` podría haberse confundido con la transición a `done`                      | Posible doble fuente de verdad sobre la confirmación                  | Aplicado: PO Decision #6 deja `confirmed_at` exclusivamente bajo US-025/US-031. PATCH status no lo modifica. |
| Baja      | `BR-TASK-009` original aludía a soft delete; en `/docs/4` corresponde a "progreso"        | Inconsistencia documental                                            | Reclasificado como PO Decision PB-P1-018 (Acceptance Summary); Documentation Alignment Required no bloqueante. |
| Baja      | Servicio `category_code` vs `categoryHint` (`/docs/16` §25.3)                              | Drift entre spec OpenAPI y implementación adoptada                    | Sigue el patrón adoptado por US-028; cleanup snapshot vía US-098.                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                 |
| ------------------------------------ | --------- | -------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | N/A                                                                        |
| No introduce contratos firmados      | Pass      | N/A                                                                        |
| No introduce WhatsApp/chat/push      | Pass      | Notificaciones push declaradas fuera de scope.                              |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA; preserva trazabilidad inmutable.                              |
| Respeta backend como source of truth | Pass      | Ownership backend-only; estado y mutabilidad enforced server-side.          |
| Respeta seed/demo si aplica          | Pass      | No requiere cambios de seed.                                                |
| No introduce RAG/vector DB           | Pass      | N/A                                                                        |
| No introduce multi-tenant enterprise | Pass      | N/A                                                                        |
| No introduce P4/Future scope         | Pass      | Undo del toast, restauración self-service y bulk PATCH declarados Future.    |

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

Los 14 EC y 24 NT cubren explícitamente: estado cancelado/completado, transiciones inválidas, idempotencia, soft-deleted, doble DELETE, body vacío, server-controlled fields ignorados, due_date pasada bajo distintos estados, content-type, concurrencia. AC y EC alineados con `/docs/16` §25.4 y `BR-TASK-004`.

---

## 6. Gaps Detectados

### Producto / Negocio

No aplica — alcance MVP completo.

### Backend / API

No aplica — endpoints y validaciones formalizados.

### Frontend / UX

No aplica — inline edit, status menu, dialog de confirmación y banners por error code están especificados.

### Base de Datos

No aplica — sin migraciones nuevas; verificación de columnas `updated_by_user_id`, `deleted_by_user_id` e índice parcial ya cubierta por US-027.

### Seguridad / Autorización

No aplica — ownership, role exclusion, no-revelación, audit y lock cooperativo cubiertos por SEC-01..09.

### IA / PromptOps

No aplica — esta historia no invoca IA directamente.

### QA / Testing

No aplica — 12 TS, 24 NT, 3 CONC, 5 AUTH-TS y accesibilidad definidos.

### Seed / Demo

No requiere cambios de seed/demo.

### Documentación / Trazabilidad

* Documentation Alignment Required: 3 ítems (ver sección 8).

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado                                                                                | Decisión vigente                                                            | Acción recomendada                                                  | ¿Bloquea aprobación? |
| ------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------- |
| `/docs/10`         | Draft referenciaba `NFR-PERF-API-001` (stale).                                                     | Canónico `NFR-PERF-001` (P95 ≤ 1.5 s endpoints no-IA).                       | Cleanup editorial en `/docs/10`.                                    | No                   |
| `/docs/9` + `/docs/8` | FRD mapea `FR-TASK-003 → UC-TASK-002`, pero UCS define `UC-TASK-003 — Editar tarea`.            | Se sigue la autoridad de `/docs/8`: `UC-TASK-003`.                          | Cleanup editorial en `/docs/9` (alinear con UCS).                   | No                   |
| `/docs/16` §25.3   | DTO documenta `categoryHint: string` y `isSeed`; la implementación canónica (US-028) usa `category_code`. | Adopción `category_code` con FK a `ServiceCategory.code` por consistencia. | Regenerar snapshot OpenAPI vía US-098.                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                   |
| User Story file path                       | `management/user-stories/US-029-edit-delete-task.md`                                  |
| User Story ID verified                     | Yes                                                                                   |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-029-decision-resolution.md` (no requerido) |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-029-refinement-review.md`              |
| Final recommended status                   | Ready for Approval                                                                    |
| Next recommended skill                     | eventflow-user-story-approval                                                          |
| Reason                                     | Todas las decisiones formalizadas; no quedan blockers PO/Tech/QA/Security. Las alineaciones documentales son no bloqueantes. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* Status: `Draft` → `Ready for Approval`.
* Last Updated: `2026-06-09` → `2026-06-26`.
* Backlog Item: `PB-P1-018 — CRUD de tareas manuales y máquina de estados`.
* UI Surface y Feature explicitados.
* Título ampliado a "Editar, transicionar estado o eliminar mi tarea (Organizer)".

### Business Context

* Context Summary describe las tres mutaciones canónicas y la separación de responsabilidades respecto a US-025/US-031.
* Related Domain Concepts amplía con state machine, `ai_generated` inmutable, `confirmed_at` no tocado, soft delete.
* Assumptions y Dependencies alineadas con US-027/028 y PB-P1-018.

### PO/BA Decisions Applied

* 17 decisiones explícitas: tres endpoints canónicos, bodies Zod, state machine, inmutabilidad IA, `confirmed_at`, validación de `category_code`, `due_date` por estado, mutabilidad atómica, completed bloqueado, soft delete enforced, idempotencia DELETE, PATCH sobre soft-deleted, ownership backend-only, response canónico, auditoría, telemetría sin PII.

### Traceability

* Corrección de IDs: `FR-TASK-003/004/005/011/012`, `UC-TASK-003`, `BR-TASK-002/004/005/006/010`, `BR-AI-008/010`, `NFR-PERF-001/OBS-001/002/SEC-005`, ADR-API-001/004, PO Decision PB-P1-018.

### Scope Guardrails

* Out of Scope ampliado: restauración self-service, hard delete, bulk PATCH/DELETE, edición de server-controlled fields, undo del toast, asignación múltiple, push/email, recordatorios externos, endpoint admin, import CSV.

### Acceptance Criteria

* AC ampliados a 6 cubriendo edición, transición, soft delete, preservación IA, vaciado de category_code y separación de operaciones.

### Edge Cases

* EC ampliados a 14 (cancelled/completed, transición inválida, idempotencia, soft-deleted, doble DELETE, body vacío, server-controlled fields, due_date pasada por estado, category inválida, description null, vendor/admin, concurrencia, content-type).

### Validation Rules

* VR-01..VR-14 cubren UUID, ownership, mutabilidad, body no vacío, longitudes, fechas, categoría, status enum, transiciones, server-controlled fields, DELETE sin body, Content-Type.

### Technical Notes

* Frontend: `TaskItemInlineEdit`, `TaskStatusMenu`, `DeleteTaskDialog`, hooks con invalidación de US-027.
* Backend: `UpdateEventTaskUseCase`, `UpdateEventTaskStatusUseCase`, `SoftDeleteEventTaskUseCase`, `EventTaskMutateRepository` (extiende US-027/028), `EventTaskStateMachineService`, lock cooperativo `pg_advisory_xact_lock`.
* Database: verificación de columnas y reuso del índice parcial; sin migraciones nuevas.
* API: tres endpoints documentados con request/response.
* Observability: 5 tipos de logs + 4 métricas Prometheus.

### QA Notes

* TS-01..12, NT-01..24, AUTH-TS-01..05, CONC-01..03 + accesibilidad + perf budget.

### Definition of Ready

* Marca `PO/BA validó` como pendiente de aplicación por el approval gate.

### Definition of Done

* 9 ítems cubriendo endpoints, state machine, soft delete, inmutabilidad IA, response, telemetría, tests, perf, demo.

### Notes

* 3 Documentation Alignment Required explícitos + clarificación sobre `BR-TASK-009` + nota sobre `confirmed_at` y monitoreo de divergencias UI/backend.

---

## 11. Recomendación Final

`Ready for Approval`

US-029 queda alineada con el patrón canónico `/docs/16` §25.2, reutiliza la infraestructura de US-027/028 y respeta la separación de responsabilidades del state machine (`confirmed_at` exclusivo de US-025/US-031). Las decisiones PO están formalizadas; no quedan preguntas bloqueantes. Las 3 alineaciones documentales se cierran como cleanup editorial (DOC-001 snapshot OpenAPI vía US-098, DOC-002 `/docs/9` y `/docs/10`). Siguiente paso: `eventflow-user-story-approval`.
