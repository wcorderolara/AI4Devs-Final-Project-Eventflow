# User Story Refinement Review — US-017

## Source User Story File
management/user-stories/US-017-generate-ai-event-plan.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-017-decision-resolution.md (no requerido / no creado)

## Review Date
2026-06-25

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story ID                              | US-017                                                                                      |
| File Path                                  | management/user-stories/US-017-generate-ai-event-plan.md                                    |
| Backlog Item                               | PB-P1-011                                                                                   |
| Epic                                       | EPIC-AIP-001 — AI-Assisted Event Planning                                                   |
| Estado actual                              | Ready for Approval                                                                          |
| Estado recomendado                         | Ready for Approval                                                                          |
| Nivel de riesgo                            | Medio (feature IA crítica con dependencias de proveedor externo)                             |
| Calidad general                            | Alta                                                                                        |
| Requiere decisión PO                       | No (la única pregunta abierta —cap de regeneraciones— se delega a US-026)                   |
| Requiere decisión técnica                  | No                                                                                          |
| Requiere decisión QA                       | No                                                                                          |
| Requiere decisión Seguridad                | No                                                                                          |
| Decision Resolution artifact found         | No                                                                                          |
| User Story file updated                    | Yes                                                                                         |
| Refinement review artifact created/updated | Yes (no bloqueante, como evidencia)                                                          |
| Refinement review path                     | management/user-stories/refinement-reviews/US-017-refinement-review.md                      |

---

## 2. Diagnóstico PO/BA

La US es valiosa, clara, MVP-crítica y compatible con la arquitectura IA aprobada (LLMProvider, AIRecommendation, HITL, fallback Mock). Tras corregir IDs de trazabilidad y el endpoint canónico, la historia queda lista para aprobación. El único punto realmente abierto en la documentación (cap por evento de regeneraciones) pertenece naturalmente al alcance de US-026 (regeneración con feedback) y no bloquea esta US: el rate limit global `SEC-POL-AI-007` (20/usuario/hora) provee el cap efectivo.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                       | Impacto                                                          | Recomendación                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Media     | IDs FR incorrectos: la US referenciaba `FR-AI-002` (checklist) como idioma. Canon: `FR-AI-017`.                                  | Trazabilidad rota.                                               | Corregido. Mantener `FR-AI-001/003/004/009/017`.                                                    |
| Media     | IDs NFR incorrectos: `NFR-AI-001` y `NFR-AI-002` no aplican a timeout/fallback. Canon: `NFR-AI-003` (timeout), `NFR-AI-005/007/008` (validación/Mock/LLMProvider). | Trazabilidad rota.                                                | Corregido.                                                                                          |
| Media     | Endpoint inconsistente: la US declaraba `POST /api/v1/events/:id/ai/plan`; el canónico en `/docs/16` es `POST /api/v1/events/:eventId/ai/event-plan`. | Confusión cliente/servidor.                                       | Corregido.                                                                                          |
| Media     | Status enum incorrecto: se mezclaban `pending/accepted/edited/rejected/discarded`. Canon: enum `(pending, accepted, rejected, discarded, failed, expired)` + `edited` boolean. | Confusión con el modelo de datos.                                  | Corregido en AC-04, EC-01..03 y secciones IA.                                                       |
| Media     | Faltaba referencia a Backlog Item PB-P1-011, dependencias `PB-P0-009..011, PB-P1-006, PB-P0-007, PB-P0-014`.                     | Planificación de sprint dificultada.                              | Agregadas en metadata, dependencies y trazabilidad.                                                 |
| Media     | Rate limit IA no cuantificado en SEC-02. Canon: `SEC-POL-AI-007` (20/usuario/hora) con `429 RATE_LIMITED`.                       | Falta de criterio operativo.                                      | Cuantificado en SEC-02; agregado EC-04 y AI-TS-07.                                                  |
| Baja      | "Confirmar máximo de regeneraciones por evento" en Notes era pregunta PO no decidida (`/docs/7` la lista como pregunta abierta de bajo impacto). | Posible bloqueador si se trata como crítico para US-017.           | Reclasificado: pertenece a US-026; para US-017 aplica el rate limit global como cap efectivo.       |
| Baja      | Faltaban casos negativos relevantes (admin invoca, evento `cancelled/completed/deleted`, anónimo, idioma no soportado).         | Cobertura QA incompleta.                                          | Agregados NT-03..NT-07, VR-04, VR-05.                                                                |
| Baja      | Faltaba AC explícito de HITL initial state.                                                                                     | Riesgo de implementación que omite el `status='pending'` inicial.  | Agregado AC-04.                                                                                     |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                          |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | N/A                                                                                 |
| No introduce contratos firmados      | Pass      | N/A                                                                                 |
| No introduce WhatsApp/chat/push      | Pass      | Sólo respuesta HTTP                                                                 |
| Respeta human-in-the-loop IA         | Pass      | `status='pending'` + acciones HITL explícitas en US-025                              |
| Respeta backend como source of truth | Pass      | El frontend nunca llama al LLM (SEC-04)                                              |
| Respeta seed/demo si aplica          | Pass      | `MockAIProvider` determinista                                                        |
| No introduce RAG/vector DB           | Pass      | Out of Scope explícito                                                               |
| No introduce multi-tenant enterprise | Pass      | N/A                                                                                 |
| No introduce P4/Future scope         | Pass      | `AnthropicProvider` solo stub (Decisión PO 8.1 #15)                                  |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad         | Problema detectado                                                | Acción recomendada                          |
| ----- | --------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| AC-01 | Clear           | Reescrita con endpoint canónico, status pending, badge y acciones HITL. | Aplicada.                                    |
| AC-02 | Clear           | Especificado `language_code` (4 locales) y persistencia.            | Aplicada.                                    |
| AC-03 | Clear           | Lista canónica de campos (`prompt_version_id`, `llm_provider`, `language_code`, `latency_ms`, `fallback_used`, `timeout_ms`, `correlation_id`). | Aplicada. |
| AC-04 | Clear (nuevo)   | No existía AC explícito para `status='pending'` inicial.            | Agregado.                                    |
| EC-01 | Clear           | Diferenciado comportamiento prod vs demo y persistencia `failed`.   | Aplicada.                                    |
| EC-02 | Clear           | Definido 1 reintento y persistencia `failed`.                       | Aplicada.                                    |
| EC-03 | Clear           | Diferenciado prod vs demo y `correlationId` en envelope.            | Aplicada.                                    |
| EC-04 | Clear (nuevo)   | No existía EC explícito para `429`.                                 | Agregado.                                    |

---

## 6. Gaps Detectados

### Producto / Negocio

* "Cap por evento de regeneraciones" reclasificado: pertenece a US-026.

### Backend / API

* Endpoint corregido al canónico `POST /api/v1/events/:eventId/ai/event-plan`.

### Frontend / UX

* Confirmados loading prolongado (60 s), accesibilidad `aria-live`, badge "Sugerido por IA".

### Base de Datos

* No requiere migraciones nuevas (cubiertas por PB-P0-009..011 y PB-P0-001). Confirmar enum `ai_recommendation_status` y FKs al integrar.

### Seguridad / Autorización

* SEC-02 cuantificado (`SEC-POL-AI-007`: 20/usuario/hora).
* SEC-06 agregado para `OPENAI_API_KEY` en Secrets Manager.
* Matriz negativa extendida (organizer no dueño, vendor, admin, anónimo).

### IA / PromptOps

* HITL inicial documentado en AC-04.
* Decisiones PO #9 y #15 explicitadas en `PO/BA Decisions Applied`.

### QA / Testing

* AI-TS-07 (rate limit) agregado.
* TS-04 (idioma `pt`) agregado.
* NT-05..NT-07 agregados.

### Seed / Demo

* No requiere cambios de seed adicionales: depende del seed existente de eventos (US-085..088) y de `MockAIProvider` determinista (US-119).

### Documentación / Trazabilidad

* Trazabilidad corregida y Backlog Item PB-P1-011 explicitado.

---

## 7. Preguntas Pendientes

No pending blocking questions.

(El único punto abierto —cap por evento de regeneraciones— se delega formalmente a US-026 y se cubre operativamente por `SEC-POL-AI-007` en esta US.)

---

## 8. Documentation Alignment Required

| Documento / Fuente                                | Conflicto detectado                                                              | Decisión vigente                                              | Acción recomendada                                                                | ¿Bloquea aprobación? |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------- |
| `/docs/16-API-Design-Specification.md`            | Confirmar que el snapshot OpenAPI esté regenerado con el endpoint canónico.        | `POST /api/v1/events/:eventId/ai/event-plan` (ya en `/docs/16`). | Coordinar regeneración del snapshot vía US-098.                                    | No                   |
| `/docs/9-Functional-Requirements-Document.md`     | Versión previa de la US referenciaba FRs incorrectos.                              | Canon: `FR-AI-001/003/004/009/017`.                            | Mantener mapeo canónico; no se requieren cambios en `/docs/9`.                     | No                   |
| `/docs/10-Non-Functional-Requirements.md`         | Versión previa referenciaba NFR-AI-001/002 incorrectamente.                        | Canon: `NFR-AI-003/005/007/008`.                              | Mantener mapeo canónico.                                                          | No                   |
| `/docs/7-AI-Features-Specification.md`            | Lista pregunta abierta sobre cap por evento de regeneraciones.                     | Delegado a US-026; rate limit global aplica en esta US.        | Documentar en `/docs/7` que el cap MVP es el global `SEC-POL-AI-007`.              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                |
| User Story file path                       | `management/user-stories/US-017-generate-ai-event-plan.md`                         |
| User Story ID verified                     | Yes                                                                                |
| Decision Resolution artifact found         | No                                                                                 |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-017-decision-resolution.md`        |
| Refinement review artifact created/updated | Yes                                                                                |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-017-refinement-review.md`           |
| Final recommended status                   | Ready for Approval                                                                 |
| Next recommended skill                     | eventflow-user-story-approval                                                      |
| Reason                                     | Sin preguntas bloqueantes; correcciones son alineación documental no bloqueante. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* Agregados Backlog Item `PB-P1-011` y UI Surface `PB-P1-044`.
* `Status` → `Ready for Approval`; `Last Updated` → `2026-06-25`.

### Business Context

* Reescrito `Context Summary`, `Related Domain Concepts`, `Assumptions` y `Dependencies`.

### PO/BA Decisions Applied

* Nueva sección con 6 decisiones formalizadas (PO 8.1 #9, #15; HITL BR-AI-001..003; rate limit `SEC-POL-AI-007`; endpoint canónico; status enum canónico).

### Traceability

* Corregidos FR/UC/BR/NFR/ADR; añadidos Backlog Item, PO Decisions y documentos de referencia.

### Scope Guardrails

* `Out of Scope` endurecido (cap por evento, `AnthropicProvider` operativo, materialización automática).

### Acceptance Criteria

* AC-01..04 reescritos y aclarados.
* EC-01..04 agregados o reformulados.

### Technical Notes

* Endpoint canónico explícito.
* `prompt_version_id`, `llm_provider`, `language_code` con nombres canónicos.

### QA Notes

* TS-04 idioma `pt`; AI-TS-03 fallback demo; AI-TS-07 rate limit; matriz negativa extendida.

### Definition of Ready

* Todas las casillas marcadas salvo PO/BA validó.

### Definition of Done

* Reformulada con campos canónicos y `SEC-POL-AI-007`.

### Notes

* Reclasificado el cap de regeneraciones; agregadas notas de Documentation Alignment Required.

---

## 11. Recomendación Final

**Ready for Approval.** Tras correcciones de trazabilidad, endpoint y enums, la US queda lista para el formal Approval Gate. Próximo paso: ejecutar `eventflow-user-story-approval`.
