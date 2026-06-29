# User Story Refinement Review — US-028

## Source User Story File
management/user-stories/US-028-create-manual-task.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-028-decision-resolution.md (no requerido — no creado)

## Review Date
2026-06-26

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                |
| ------------------------------------------ | ----------------------------------------- |
| User Story ID                              | US-028                                    |
| File Path                                  | management/user-stories/US-028-create-manual-task.md |
| Backlog Item                               | PB-P1-018                                 |
| Epic                                       | EPIC-TASK-001 — Checklist & Task Management |
| Estado actual                              | Ready for Approval                        |
| Estado recomendado                         | Ready for Approval                        |
| Nivel de riesgo                            | Bajo                                       |
| Calidad general                            | Alta                                       |
| Requiere decisión PO                       | No                                         |
| Requiere decisión técnica                  | No                                         |
| Requiere decisión QA                       | No                                         |
| Requiere decisión Seguridad                | No                                         |
| Decision Resolution artifact found         | No                                         |
| User Story file updated                    | Yes                                        |
| Refinement review artifact created/updated | Yes                                        |
| Refinement review path                     | management/user-stories/refinement-reviews/US-028-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-028 es la mutación canónica de creación de tareas manuales del checklist. Es valiosa, clara y testable, y se integra al patrón POST de EventFlow con ownership backend-only, validación Zod, mutabilidad atómica del evento y consistencia con la state machine `pending → in_progress → done | skipped` (`FR-TASK-004`, `C-027`). La historia es de bajo riesgo: no invoca IA, no abre transacciones complejas y reusa toda la fundación de `event_tasks`, `events` y `service_categories`.

La historia respeta el principio MVP de "no scope creep": no introduce bulk create, no abre asignación a otros usuarios y delega claramente la edición/transición a US-029, la eliminación a US-030 y el bulk confirm IA a US-031. La trazabilidad IA por simetría queda preservada vía `ai_generated=false`/`ai_recommendation_id=null` server-controlled.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo | Impacto | Recomendación |
| --------- | -------- | ------- | ------------- |
| Media | Draft original referenciaba `NFR-PERF-API-001` (stale) | Inconsistencia con `/docs/10` canónico | Adoptado `NFR-PERF-001`; sugerir cleanup editorial en `/docs/10`. |
| Media | Draft mencionaba `UC-TASK-002`; el canónico de `/docs/9` mapea `FR-TASK-002 → UC-TASK-001` | Inconsistencia | Adoptado `UC-TASK-001`; sugerir cleanup en `/docs/8`. |
| Baja | Snapshot OpenAPI debe regenerarse para reflejar body con `description`, `due_date`, `category_code` | No bloqueante | Coordinar con US-098. |
| Baja | El draft sugería `due_date < hoy → 400`; refinado introduce tolerancia de 60 s para clock skew | Mejora UX | Adoptado en VR-07 / EC-04. |
| Baja | El draft no aclaraba el estado inicial; refinado fija `status='pending'` canónico (`C-027`, `FR-TASK-004`) | Mejora consistencia con tareas IA y state machine | Adoptado en PO/BA Decision #2. |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario |
| ------------------------------------ | --------- | ---------- |
| No introduce pagos reales            | Pass      | Mutación operativa pura sobre `event_tasks`. |
| No introduce contratos firmados      | Pass      |            |
| No introduce WhatsApp/chat/push      | Pass      | Sin recordatorios push (Future). |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA. |
| Respeta backend como source of truth | Pass      | Ownership y `status` siempre backend-controlled. |
| Respeta seed/demo si aplica          | N/A       | Sin seed nuevo. |
| No introduce RAG/vector DB           | Pass      |            |
| No introduce multi-tenant enterprise | Pass      |            |
| No introduce P4/Future scope         | Pass      | Bulk create, asignación múltiple, push, recurrencia, `Idempotency-Key` quedan Future. |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad | Problema detectado | Acción recomendada |
| ----- | ------- | ------------------ | ------------------ |
| AC-01 | Clear   | Ninguno             | Ninguna             |
| AC-02 | Clear   | Ninguno             | Ninguna             |
| AC-03 | Clear   | Ninguno (server-controlled fields) | Ninguna |
| AC-04 | Clear   | Ninguno (categoría null explícita) | Ninguna |
| AC-05 | Clear   | Ninguno (i18n)      | Ninguna             |

Edge cases EC-01..12 cubren: title vacío/min/max, description max, due_date pasada/formato inválido, category inexistente/inactiva, event cancelled/completed/soft-deleted, race condition, evento ajeno, vendor/admin, body keys extras y Content-Type inválido.

---

## 6. Gaps Detectados

### Producto / Negocio
No aplica.

### Backend / API
No aplica. Tech notes explícitas: `CreateEventTaskUseCase`, `EventTaskRepository.create`, `prismaService.$transaction` con `SELECT FOR UPDATE` corto o lock advisory.

### Frontend / UX
No aplica. `CreateTaskDialog` con RHF + Zod, hook TanStack con cache invalidation.

### Base de Datos
No aplica. Sin migraciones; reusa enum `event_task_status` y columnas existentes.

### Seguridad / Autorización
No aplica. SEC-01..09 cubre ownership, no-revelación, mutabilidad atómica, logs sin PII.

### IA / PromptOps
No aplica — esta historia no invoca IA directamente.

### QA / Testing
No aplica. Cobertura: 9 functional, 19 negative, 5 authorization, 2 concurrency, accesibilidad.

### Seed / Demo
No requiere cambios de seed/demo.

### Documentación / Trazabilidad
Tres Documentation Alignment Required no bloqueantes (sección 8).

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| `/docs/10` NFR     | Draft referenciaba `NFR-PERF-API-001` (stale) | `NFR-PERF-001` canónico | Cleanup editorial en `/docs/10`. | No |
| `/docs/8` UCS      | Draft mencionaba `UC-TASK-002`; canónico `FR-TASK-002 → UC-TASK-001` | `UC-TASK-001` | Cleanup en `/docs/8` si falta. | No |
| `/docs/16` OpenAPI | Snapshot debe reflejar body `{ title, description?, due_date?, category_code? }` | Endpoint canónico `POST /events/:eventId/tasks` | Regenerar snapshot vía US-098. | No |

---

## 9. File Update Result

| Campo                                      | Valor |
| ------------------------------------------ | ----- |
| User Story file updated                    | Yes   |
| User Story file path                       | `management/user-stories/US-028-create-manual-task.md` |
| User Story ID verified                     | Yes (US-028) |
| Decision Resolution artifact found         | No    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-028-decision-resolution.md` |
| Refinement review artifact created/updated | Yes   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-028-refinement-review.md` |
| Final recommended status                   | Ready for Approval |
| Next recommended skill                     | `eventflow-user-story-approval` |
| Reason                                     | Decisiones formalizadas; sin bloqueos; 3 alignments documentales no bloqueantes. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata
* Backlog Item: `PB-P1-018 — CRUD de tareas manuales y máquina de estados`.
* UI Surface: Página "Mi checklist" del evento, diálogo "Crear tarea".
* Feature: Creación manual de `EventTask` (origen no IA).
* Status: `Ready for Approval`.
* Last Updated: 2026-06-26.

### Business Context
* Context Summary expandido con la state machine canónica `pending → in_progress → done | skipped` y delegación clara a US-027 (lectura), US-029 (edición), US-030 (delete), US-031 (bulk confirm IA).
* Domain concepts ampliados con `Event.status`, `Event.deleted_at`, `ServiceCategory.is_active`, `EventTask.language_code`.

### PO/BA Decisions Applied
* 15 decisiones formalizadas que cubren endpoint, estado inicial, server-controlled fields, body schema, fechas, categoría, mutabilidad, ownership, idioma, auditoría, response, i18n, telemetría, sin LLM, idempotencia.

### Traceability
* Corregida: `FR-TASK-002` (crear), `FR-TASK-004` (state machine), `FR-TASK-011` (eventos bloqueados), `FR-TASK-012` (`ai_generated` distinguido).
* `UC-TASK-001` (canónico de `FR-TASK-002`).
* `BR-TASK-001/002/006/008/009/010`, `BR-AI-008`.
* `NFR-PERF-001`, `NFR-OBS-001/002`, `NFR-SEC-005`, `NFR-I18N-001`.
* ADRs: `ADR-API-001`, `ADR-API-004`, `ADR-DB-001`.

### Scope Guardrails
* Out of Scope ampliado: edición, transición, delete, bulk confirm IA, asignación múltiple, subtareas, recurrencia, push, voz/adjuntos, bulk create, `Idempotency-Key`, override de `language_code`, selección automática de categoría por LLM.

### Acceptance Criteria
* 5 AC (happy path).
* 12 EC (edge cases).
* VR-01..10 (validation rules).
* SEC-01..09 (security).
* 9 TS, 19 NT, 5 AUTH-TS, 2 CONC, accesibilidad.

### Technical Notes
* Frontend: `CreateTaskDialog`, hook TanStack `useCreateEventTask` con cache invalidation de `['tasks', eventId]`.
* Backend: `CreateEventTaskUseCase` con orquestación atómica; lock advisory o `SELECT FOR UPDATE` corto sobre `events`.
* Database: sin migraciones; reusa enum + columnas.
* API: `POST /api/v1/events/:eventId/tasks` con body Zod estricto + tolerancia para campos extras (descarte silencioso).
* Observability: log `tasks.created` sin PII; métricas `tasks_created_total`, `tasks_created_latency_ms`.

### Definition of Ready
* Todos los criterios marcados excepto `PO/BA validó` (pendiente para approval gate).

### Definition of Done
* 9 criterios formales para sprint planning.

### Notes
* Tres Documentation Alignment Required no bloqueantes.
* Prefill de categoría desde IA-004 (US-020) se materializa en frontend; backend no consulta IA.
* Timezone UTC asumido para `due_date` en MVP.

---

## 11. Recomendación Final

`Ready for Approval`.

US-028 cumple Definition of Ready, respeta el guardrail MVP, expone trazabilidad consistente con la fundación de tasks (US-027) y la state machine canónica, no introduce blockers ni decisiones pendientes. Las 3 alineaciones documentales son cleanup editorial. Siguiente paso: ejecutar `eventflow-user-story-approval`.
