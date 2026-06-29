# User Story Refinement Review — US-018

## Source User Story File
management/user-stories/US-018-generate-ai-checklist.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-018-decision-resolution.md (no requerido / no creado)

## Review Date
2026-06-25

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story ID                              | US-018                                                                                      |
| File Path                                  | management/user-stories/US-018-generate-ai-checklist.md                                     |
| Backlog Item                               | PB-P1-012                                                                                   |
| Epic                                       | EPIC-AIP-001 — AI-Assisted Event Planning                                                   |
| Estado actual                              | Ready for Approval                                                                          |
| Estado recomendado                         | Ready for Approval                                                                          |
| Nivel de riesgo                            | Medio (feature IA + alcance corregido)                                                       |
| Calidad general                            | Alta                                                                                        |
| Requiere decisión PO                       | No (cap por evento delegado a US-031/US-026; sin impacto MVP)                               |
| Requiere decisión técnica                  | No                                                                                          |
| Requiere decisión QA                       | No                                                                                          |
| Requiere decisión Seguridad                | No                                                                                          |
| Decision Resolution artifact found         | No                                                                                          |
| User Story file updated                    | Yes                                                                                         |
| Refinement review artifact created/updated | Yes (no bloqueante, como evidencia)                                                          |
| Refinement review path                     | management/user-stories/refinement-reviews/US-018-refinement-review.md                      |

---

## 2. Diagnóstico PO/BA

US valiosa y crítica para AI-002. La versión previa mezclaba la **generación** con la **confirmación bulk** (que pertenece a US-031) y materializaba `EventTask` durante la generación, contradiciendo el HITL canónico (`C-012`, `/docs/7`, `/docs/18`). Tras la corrección de scope y trazabilidad, la historia queda alineada con el backlog (PB-P1-012), el FRD (`FR-AI-002`), `BR-AI-001..011`, `BR-TASK-002..006/010`, NFR-AI canónicos y `SEC-POL-AI-007`. No quedan preguntas bloqueantes.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                            | Impacto                                                                          | Recomendación                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Alta      | Scope creep: la US incluía confirmación bulk (AC-02, endpoint `confirm-bulk`, `ConfirmAITasksBulkUseCase`, `BulkConfirmBar`, `tasksApi.confirmBulk`, TS-03). | Solapamiento con US-031.                                                          | Removido. US-018 cubre solo la generación; la confirmación vive en US-031 (PB-P1-017).                          |
| Alta      | HITL no canónico: la US persistía `EventTask(ai_generated=true, status=pending)` en la generación, en contra de `C-012` y `/docs/7` (creación al aceptar). | Modelo de datos inconsistente; doble fuente de verdad.                            | Corregido: la generación crea solo `AIRecommendation(type='checklist', status='pending')` con el JSON crudo.    |
| Media     | Trazabilidad FR incorrecta (`FR-AI-003/004` aplican a presupuesto/categorías).                                                                       | Trazabilidad rota.                                                               | Corregido a `FR-AI-002` + `FR-AI-009`.                                                                          |
| Media     | NFRs incorrectos (`NFR-AI-001/002` no aplican a timeout/fallback).                                                                                   | Trazabilidad rota.                                                               | Corregido a `NFR-AI-003/005/007/008`.                                                                           |
| Media     | Faltaban BR-AI-007..011 y BR-TASK-002/003/004/006/010 que sustentan el flujo HITL y T-x.                                                              | Cobertura de reglas incompleta.                                                  | Agregadas.                                                                                                      |
| Media     | Faltaba Backlog Item PB-P1-012, dependencias (`PB-P1-011`, `PB-P1-015`, `PB-P0-007/014`).                                                            | Planificación de sprint dificultada.                                              | Agregadas en metadata y dependencias.                                                                           |
| Media     | Rate limit IA no cuantificado en SEC-02; faltaba EC dedicado al `429`.                                                                                | Operación sin criterio.                                                          | Cuantificado a 20/usuario/h (`SEC-POL-AI-007`); agregado EC-05 y AI-TS-07.                                       |
| Baja      | "Confirmar límite de tareas por generación (sugerido 20)" — pregunta abierta.                                                                          | Bajo impacto MVP.                                                                | Reclasificada: no se introduce cap por evento; cap operativo viene por bulk (US-031) y por bounding del LLM.    |
| Baja      | Tests cubrían poco la matriz negativa y filtro T-x.                                                                                                   | QA insuficiente.                                                                  | Agregados NT-03..NT-07, VR-04..06, TS-04 (filtrado T-x), AI-TS-04..07.                                          |
| Baja      | UI ruta sugerida `/tasks` se solapa con vista de tareas; mejor namespacing IA.                                                                        | Confusión UX.                                                                    | Cambiada a `/[locale]/organizer/events/:id/ai/checklist`.                                                       |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                          |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | N/A                                                                                 |
| No introduce contratos firmados      | Pass      | N/A                                                                                 |
| No introduce WhatsApp/chat/push      | Pass      | Sólo respuesta HTTP                                                                  |
| Respeta human-in-the-loop IA         | Pass      | `AIRecommendation` pending; `EventTask` se crean al aceptar (US-031)                  |
| Respeta backend como source of truth | Pass      | LLM solo desde backend                                                               |
| Respeta seed/demo si aplica          | Pass      | `MockAIProvider` determinista                                                        |
| No introduce RAG/vector DB           | Pass      | Out of Scope                                                                         |
| No introduce multi-tenant enterprise | Pass      | N/A                                                                                  |
| No introduce P4/Future scope         | Pass      | `AnthropicProvider` solo stub                                                        |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad         | Problema detectado                                                                | Acción recomendada                          |
| ----- | --------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| AC-01 | Clear           | Persistía `EventTask` en generación; modificado a solo `AIRecommendation`.        | Aplicada.                                    |
| AC-02 | Movido          | Confirmación bulk pertenece a US-031.                                              | Removido aquí; documentado en US-031.       |
| AC-02 (nuevo) | Clear | Idioma respetado con `language_code`.                                              | Agregado.                                    |
| AC-03 | Clear           | Trazabilidad completa en `AIRecommendation`.                                       | Agregado.                                    |
| AC-04 | Clear (nuevo)   | Estructura del checklist agrupada por fases T-x.                                   | Agregado.                                    |
| EC-01 | Clear           | Filtrado T-x con `event_date` próximo.                                             | Aplicada.                                    |
| EC-02 | Clear           | Timeout diferenciado prod vs demo.                                                 | Aplicada.                                    |
| EC-03 | Clear (nuevo)   | JSON inválido con 1 retry.                                                         | Agregado.                                    |
| EC-04 | Clear (nuevo)   | Provider error.                                                                    | Agregado.                                    |
| EC-05 | Clear (nuevo)   | Rate limit `429`.                                                                  | Agregado.                                    |

---

## 6. Gaps Detectados

### Producto / Negocio

* Scope corregido a generación únicamente; cap por evento delegado a US-031.

### Backend / API

* Endpoint canónico confirmado: `POST /api/v1/events/:eventId/ai/checklist`.
* `confirm-bulk` removido (pertenece a US-031).

### Frontend / UX

* Ruta y componentes renombrados a `/ai/checklist`; `BulkConfirmBar` removido.

### Base de Datos

* `event_tasks` no se toca en esta US.
* Reutiliza enums y FKs existentes; sin migraciones.

### Seguridad / Autorización

* SEC-02 cuantificado (`SEC-POL-AI-007`).
* SEC-06 (Secrets Manager) agregado.
* Matriz negativa extendida.

### IA / PromptOps

* HITL inicial documentado en AC-01/AC-04.
* Provider abstraction reutilizada.

### QA / Testing

* TS-04 filtrado T-x.
* AI-TS-04..07 (retry, fallback, rate limit).
* AUTH-TS y NT extendidos.

### Seed / Demo

* No requiere cambios de seed adicionales más allá de `ChecklistPrompt v1` (US-121).

### Documentación / Trazabilidad

* Backlog ID, UI surface y trazabilidad canónica agregadas.

---

## 7. Preguntas Pendientes

No pending blocking questions.

(La pregunta sobre cap por evento de tareas IA queda registrada como baja prioridad y no aplica al MVP; el cap operativo viene por el bulk de US-031 y por el bounding del prompt LLM.)

---

## 8. Documentation Alignment Required

| Documento / Fuente                                | Conflicto detectado                                                                | Decisión vigente                                              | Acción recomendada                                                                | ¿Bloquea aprobación? |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------- |
| `/docs/16-API-Design-Specification.md`            | Confirmar snapshot OpenAPI con códigos `429` y `5xx`.                              | Endpoint canónico ya documentado.                              | Regenerar snapshot vía US-098.                                                    | No                   |
| `/docs/8-Use-Cases-Specification.md`              | `UC-AI-002` se describe como "revisión del plan IA"; `/docs/9` lo mapea a checklist. | Mantener el mapeo del FRD (canónico para esta US).            | Aclaración liviana en `/docs/8` para alinear semántica.                            | No                   |
| `/docs/9-Functional-Requirements-Document.md`     | Versiones previas referenciaban `FR-AI-003/004` incorrectamente.                    | Canon: `FR-AI-002` + `FR-AI-009`.                              | Mantener mapeo canónico.                                                          | No                   |
| `/docs/10-Non-Functional-Requirements.md`         | Versiones previas referenciaban `NFR-AI-001/002` incorrectamente.                   | Canon: `NFR-AI-003/005/007/008`.                              | Mantener mapeo canónico.                                                          | No                   |
| `/docs/7-AI-Features-Specification.md`            | Documenta que `EventTask` se materializa al aceptar (consistente con esta US).      | Coincide con el flujo HITL canónico.                          | Mantener referencia.                                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                |
| User Story file path                       | `management/user-stories/US-018-generate-ai-checklist.md`                          |
| User Story ID verified                     | Yes                                                                                |
| Decision Resolution artifact found         | No                                                                                 |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-018-decision-resolution.md`        |
| Refinement review artifact created/updated | Yes                                                                                |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-018-refinement-review.md`           |
| Final recommended status                   | Ready for Approval                                                                 |
| Next recommended skill                     | eventflow-user-story-approval                                                      |
| Reason                                     | Sin preguntas bloqueantes; correcciones de scope y trazabilidad aplicadas. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* Backlog Item `PB-P1-012`, UI Surface `PB-P1-044`, `Status → Ready for Approval`, `Last Updated → 2026-06-25`.

### Business Context

* Reescritura para reflejar que la generación crea solo `AIRecommendation` y que la materialización es responsabilidad de US-031.
* Dependencias actualizadas (PB-P1-011, PB-P1-015, PB-P0-009..011, PB-P0-007, PB-P0-014).

### PO/BA Decisions Applied

* Nueva sección con 8 decisiones formalizadas (PO 8.1 #9, #15; HITL/C-012; rate limit; endpoint; tipo canónico; status enum; T-x al aceptar).

### Traceability

* `FR-AI-002/009`, `UC-AI-002`, `BR-AI-001..011`, `BR-TASK-002..006/010`, `NFR-AI-003/005/007/008`, `ADR-AI-001`, `SEC-POL-AI-007`, `PB-P1-012`, PO 8.1 #9/#15.

### Scope Guardrails

* `Out of Scope` endurecido (confirmación bulk, materialización al aceptar, AnthropicProvider operativo, cap por evento distinto al global).

### Acceptance Criteria

* AC-01 reescrito (sin `EventTask`).
* AC-02 sobre confirmación bulk: removido (movido a US-031).
* AC-02 (nuevo), AC-03, AC-04 agregados.
* EC-01..05 normalizados.

### Technical Notes

* Endpoint canónico; ruta UI renombrada; sin migraciones nuevas; bulk endpoint y use case movidos a US-031.

### QA Notes

* TS-04, AI-TS-04..07, AUTH-TS y NT extendidos.

### Definition of Ready

* Todas las casillas marcadas salvo PO/BA validó.

### Definition of Done

* Reformulada (HITL pending sin `EventTask`, rate limit, filtrado T-x).

### Notes

* Documentation Alignment Required y delegación a US-031/US-026 explícitas.

---

## 11. Recomendación Final

**Ready for Approval.** Scope, trazabilidad, AC, edge cases y seguridad alineados con la documentación canónica. Próximo paso: ejecutar `eventflow-user-story-approval`.
