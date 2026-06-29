# User Story Refinement Review — `US-031`

## Source User Story File
management/user-stories/US-031-confirm-ai-tasks-bulk.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-031-decision-resolution.md (no requerido — decisiones formalizadas en backlog PB-P1-017 y `/docs/4`/`/docs/8`/`/docs/9`)

## Review Date
2026-06-26

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-031                                                            |
| File Path                                  | management/user-stories/US-031-confirm-ai-tasks-bulk.md           |
| Backlog Item                               | PB-P1-017                                                         |
| Epic                                       | EPIC-TASK-001                                                     |
| Estado actual                              | Draft → Ready for Approval                                        |
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
| Refinement review path                     | management/user-stories/refinement-reviews/US-031-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-031 cubre el HITL bulk del checklist IA generado por US-018 / aplicado por US-025. Es valiosa para reducir la fricción del onboarding IA: el organizador puede activar hasta 50 tareas de un solo gesto con feedback granular por ítem. El draft original era esquelético y contenía contradicciones con el backlog (decisión PO US-031 ya formalizada). La historia refinada:

* Alinea trazabilidad con el FRD/UCS/BRD canónicos (`FR-TASK-005`, `UC-TASK-001`, `BR-TASK-003/005`, `BR-AI-008/010`).
* Aplica la decisión PO formalizada en PB-P1-017: **máx 50 IDs**, **reporte por ID `{id, accepted, error?}`**, **éxito parcial controlado** (NO all-or-nothing).
* Clarifica el modelo `EventTask.status: pending → active` sin modificar `AIRecommendation` (la padre ya fue `accepted` por `apply` de US-025).
* Define explícitamente 4 códigos por ítem (`TASK_NOT_FOUND`, `TASK_NOT_IN_EVENT`, `TASK_NOT_AI`, `TASK_NOT_PENDING`) y 5 códigos globales (`VALIDATION`, `BULK_LIMIT_EXCEEDED`, `EVENT_NOT_MUTABLE`, `FORBIDDEN` admin, `NOT_FOUND` ajeno).
* Documenta idempotencia natural por la cláusula `WHERE status='pending'` y concurrencia segura por row-level lock.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                | Impacto                                                              | Recomendación                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Media     | Documentation Alignment Required: el draft original referenciaba `FR-TASK-006`, `UC-TASK-005`, `BR-TASK-005` solo, `BR-AI-013` y `NFR-PERF-API-001`. El canónico es `FR-TASK-005`, `UC-TASK-001`, `BR-TASK-003 + BR-TASK-005`, `BR-AI-001..010`, `NFR-PERF-001`. | Riesgo de confusión y trazabilidad inválida en QA / auditoría.       | Trazabilidad corregida en la User Story refinada. Sin impacto en aprobación.                                                  |
| Media     | Documentation Alignment Required: AC-02 original pedía rollback transaccional all-or-nothing. PB-P1-017 (Decisión PO US-031) establece éxito parcial controlado con reporte por ID.                       | Contradicción interpretativa entre la US y el backlog formal.        | Se alinea con la decisión PO formalizada en backlog. Sin impacto en aprobación.                                                |
| Baja      | El draft original afirmaba "se marca AIRecommendation accepted" como parte del bulk. En el modelo canónico US-018 → US-025 → US-031, la `AIRecommendation` padre ya queda `accepted` durante el `apply` de US-025.                                  | Doble lifecycle si no se aclara.                                     | PO/BA Decision #5 lo formaliza: US-031 no modifica `AIRecommendation`.                                                         |
| Baja      | El snapshot OpenAPI de `/docs/16` debe regenerarse para incluir el endpoint nuevo `POST /events/:eventId/tasks/confirm-bulk`.                                                                              | Snapshot OpenAPI desactualizado.                                     | Coordinar vía US-098.                                                                                                          |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                 |
| ------------------------------------ | --------- | -------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Sin lógica de pagos.                                                       |
| No introduce contratos firmados      | Pass      | Sin contratos.                                                             |
| No introduce WhatsApp/chat/push      | Pass      | Sin canales externos.                                                      |
| Respeta human-in-the-loop IA         | Pass      | Esta historia ES el HITL bulk.                                             |
| Respeta backend como source of truth | Pass      | Toda autorización y transición ocurre en backend.                          |
| Respeta seed/demo si aplica          | N/A       | Sin nuevos datos seed; reusa el seed del checklist IA (US-018).            |
| No introduce RAG/vector DB           | Pass      | Sin RAG.                                                                   |
| No introduce multi-tenant enterprise | Pass      | Sin multi-tenant.                                                          |
| No introduce P4/Future scope         | Pass      | Bulk discard explícitamente Future; solo bulk confirm en MVP.              |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad | Problema detectado                                                                       | Acción recomendada                                                                                                            |
| ----- | ------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Clear   | El draft original mezclaba transición de `EventTask` con cambio de `AIRecommendation`.   | Reescrito: el bulk solo transiciona `EventTask.status: pending → active` y persiste auditoría; `AIRecommendation` no se toca. |
| AC-02 | Clear   | El draft original pedía rollback global incompatible con la decisión PO PB-P1-017.       | Reescrito: éxito parcial controlado con `{ results, summary }`. Documentation Alignment aplicado.                              |
| AC-03 | Clear   | El draft mencionaba dedup en EC sin formalizar el contrato.                              | Nuevo AC: dedup silencioso con conteo en `summary.deduped`.                                                                    |
| AC-04 | Clear   | Faltaba criterio explícito de trazabilidad post-confirmación.                            | Nuevo AC: preserva `ai_recommendation_id` y `ai_generated=true`; `AIRecommendation` intacta.                                  |
| AC-05 | Clear   | Faltaba criterio de idempotencia para reintentos.                                        | Nuevo AC: segundo request idéntico devuelve todos los ítems con `TASK_NOT_PENDING`; seguro de reintentar.                       |

---

## 6. Gaps Detectados

### Producto / Negocio

* Resuelto: contradicción del draft con la decisión PO PB-P1-017 (rollback vs éxito parcial). Aplicada la decisión canónica.

### Backend / API

* Resuelto: contrato de response `{ results, summary }` formalizado.
* Resuelto: 4 códigos por ítem + 5 códigos globales documentados.
* Resuelto: per-item micro-transacción con `WHERE status='pending'` para idempotencia y concurrencia.

### Frontend / UX

* Resuelto: `BulkResultBanner` para éxito parcial controlado; estados loading/error/partial/success diferenciados.
* Resuelto: copy y `error.code` traducidos en los 4 locales.

### Base de Datos

* Sin migraciones nuevas; columnas `ai_generated`, `ai_recommendation_id`, `confirmed_by_user_id`, `confirmed_at`, `status` ya existentes en `event_tasks`.

### Seguridad / Autorización

* Resuelto: ownership + admin excluido (`FR-ADMIN-010`); no-revelación global y por ítem.

### IA / PromptOps

* No aplica — este endpoint no invoca al `LLMProvider`.

### QA / Testing

* Cobertura ampliada: 6 functional + 12 negative + 3 AI + 5 authorization + 2 performance + accesibilidad. Incluye idempotencia, concurrencia y dedup.

### Seed / Demo

* No requiere cambios de seed/demo.

### Documentación / Trazabilidad

* Corregida la trazabilidad a `FR-TASK-005`, `UC-TASK-001`, `BR-TASK-003/005`, `BR-AI-001..010`, `NFR-PERF-001`.
* Pendiente regenerar snapshot OpenAPI vía US-098 (no bloqueante).

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| `/docs/9-FRD` `FR-TASK-005` | Draft original anclaba en `FR-TASK-006` (eliminar tareas), no en `FR-TASK-005` (confirmar tareas IA) | `FR-TASK-005` es canónico (línea 393 FRD) | Trazabilidad corregida en la US refinada | No |
| `/docs/8-UCS` `UC-TASK-001` | Draft original anclaba en `UC-TASK-005` (eliminar) | `UC-TASK-001` es canónico para aceptación bulk (línea 640 UCS) | Trazabilidad corregida en la US refinada | No |
| `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P1-017 | Draft pedía rollback all-or-nothing | Decisión PO: éxito parcial controlado con reporte por ID | Aplicada en AC-02 y PO/BA Decision #3 | No |
| `/docs/10-NFR` `NFR-PERF-001` | Draft referenciaba `NFR-PERF-API-001` (no existe) | `NFR-PERF-001` (P95 ≤ 1.5 s endpoints no-IA) | Trazabilidad corregida | No |
| `/docs/16-API` snapshot OpenAPI | Endpoint nuevo aún no documentado | Endpoint canónico definido en la US refinada | Regenerar snapshot vía US-098 | No |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                    |
| User Story file path                       | `management/user-stories/US-031-confirm-ai-tasks-bulk.md`                              |
| User Story ID verified                     | Yes                                                                                    |
| Decision Resolution artifact found         | No                                                                                     |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-031-decision-resolution.md` (no requerido) |
| Refinement review artifact created/updated | Yes                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-031-refinement-review.md`               |
| Final recommended status                   | Ready for Approval                                                                     |
| Next recommended skill                     | eventflow-user-story-approval                                                          |
| Reason                                     | Trazabilidad corregida, decisiones PO formalizadas aplicadas (PB-P1-017), AC ampliados a 5 + 10 EC + 10 VR + 9 SEC + 12 negative tests + 3 AI tests + 5 auth tests + 2 perf tests. Sin bloqueos. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* Añadido `Backlog Item: PB-P1-017`, `UI Surface`, `Status: Ready for Approval`, `Last Updated: 2026-06-26`.

### Business Context

* Reescrito el `Context Summary` para clarificar la cadena US-018 → US-025 → US-031.
* `Related Domain Concepts` expandido con `EventTask.ai_generated`, `ai_recommendation_id`, `Event`.
* Assumptions y Dependencies completos con backlog IDs (PB-P1-012, PB-P1-016, PB-P0-009..011/014, PB-P1-006).

### PO/BA Decisions Applied

* Sección nueva con 13 decisiones formalizadas, incluyendo límite 50, éxito parcial, dedup, no modificación de `AIRecommendation`, admin excluido, no-revelación, estado del evento, telemetría granular, no bulk discard.

### Traceability

* Corregida a `FR-TASK-005`, `FR-AI-019`, `UC-TASK-001`, `UC-AI-002`, `BR-TASK-003/005`, `BR-AI-001/002/004/008/010`, `NFR-PERF-001`, `NFR-OBS-001..003`, `NFR-SEC-005`, `ADR-AI-001`, decisión PO PB-P1-017.

### Scope Guardrails

* Out of Scope ampliado con bulk discard, edición masiva, bulk transversal, `If-Match`/`ETag`, AdminAction, notificación post-confirmación.

### Acceptance Criteria

* Ampliados a 5 AC con éxito parcial, dedup, trazabilidad e idempotencia.

### Edge Cases

* Ampliados a 10 EC.

### Validation Rules

* Ampliadas a 10 VR con códigos por ítem específicos.

### Authorization & Security Rules

* Ampliadas a 9 SEC con no-revelación global y por ítem, anti-admin explícito, auditoría completa.

### AI Behavior

* Aclarado que el endpoint no invoca al `LLMProvider` y no persiste `AIRecommendation` nuevos.

### UX / UI Notes

* Estados ampliados (loading, error, partial success, success) con `aria-live`.

### Technical Notes

* Backend: `ConfirmAITasksBulkUseCase`, micro-transacción por ítem, Zod schemas.
* DB: sin migraciones; reusa índices existentes.
* API: request/response schemas + códigos de error globales y por ítem documentados.
* Observability: 5 logs + 5 métricas Prometheus.

### Test Scenarios

* 6 functional + 12 negative + 3 AI + 5 authorization + 2 performance + accesibilidad.

### Definition of Ready

* `PO/BA validó` queda como pendiente para el approval gate.

### Definition of Done

* DoD reescrito para incluir éxito parcial, per-item transacción, métricas y demo end-to-end.

### Notes

* 5 Documentation Alignment Required no bloqueantes documentados.

---

## 11. Recomendación Final

`Ready for Approval`.

La User Story está alineada con `/docs/9`, `/docs/8`, `/docs/4`, `/docs/10`, `/docs/16` y con la decisión PO formalizada en `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P1-017. Las 5 Documentation Alignment Required no bloquean: corresponden a (a) corrección de trazabilidad ya aplicada en la US refinada y (b) regeneración del snapshot OpenAPI delegada a US-098. No requiere Decision Resolution: las decisiones PO ya están formalizadas en backlog y BRD.

Siguiente skill: `eventflow-user-story-approval`.
