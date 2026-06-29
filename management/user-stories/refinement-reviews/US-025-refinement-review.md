# User Story Refinement Review — US-025

## Source User Story File
management/user-stories/US-025-accept-edit-discard-ai-suggestion.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-025-decision-resolution.md (no requerido — no creado)

## Review Date
2026-06-26

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-025                                                           |
| File Path                                  | management/user-stories/US-025-accept-edit-discard-ai-suggestion.md |
| Backlog Item                               | PB-P1-016 — HITL Accept / Edit / Discard transversal             |
| Epic                                       | EPIC-AIP-001 — AI-Assisted Event Planning                        |
| Estado actual                              | Draft → Ready for Approval                                       |
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
| Refinement review path                     | management/user-stories/refinement-reviews/US-025-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-025 es una historia de fundación transversal: formaliza el cierre HITL de toda `AIRecommendation` mediante los dos endpoints canónicos de `/docs/16` §35.3 (`POST .../apply`, `POST .../discard`). Las decisiones rectoras ya están formalizadas (`BR-AI-001..004`, `FR-AI-019`, PO 8.1 nota canónica UC-AI-001..009) y han sido aplicadas consistentemente en US-017..US-021. La historia queda valiosa, clara, testeable, trazable, y respeta los guardrails MVP (no autonomy IA, no admin, no moderación IA del contenido editado, sin cache en MVP).

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                       | Impacto                                                              | Recomendación                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Media     | Documentation Alignment Required: la versión original referenciaba `FR-AI-015/FR-AI-016` (Anthropic stub y `LLM_PROVIDER`), que no son HITL | Traza incorrecta; podía bloquear generación de Tech Spec si se transcribía | Corregido en la refinación: `FR-AI-019` (canónico HITL) y `FR-AI-018` (prompt versionado). No bloquea aprobación. |
| Media     | Documentation Alignment Required: la versión original referenciaba `UC-AI-009` que en `/docs/8` es "Generar bio o descripción de paquete con IA" | Confusión entre UC bio y HITL transversal                              | Corregido: traza apunta a `UC-AI-002` como canónico revisión + nota transversal a `UC-AI-001..008`. Cleanup editorial en `/docs/8`. |
| Media     | Documentation Alignment Required: la versión original modelaba un único `PATCH /api/v1/ai-recommendations/:id` con `status='edited'` | Diverge del canónico `/docs/16` §35.3 (dos `POST` y `edited` como flag boolean, no estado) | Adoptado el canónico: dos endpoints POST (`/apply`, `/discard`); `edited` es flag. No bloquea aprobación. |
| Baja      | El strategy pattern por `type` no estaba explicitado                                            | Implementación sin guía clara podía generar acoplamiento              | Refinación documenta `AIRecommendationApplyStrategyRegistry` + lista de 8 strategies MVP y handoffs a cada US dueña del `type`. |
| Baja      | Concurrencia HITL no estaba modelada                                                            | Riesgo de doble aplicación                                              | EC-07 documenta el patrón de update condicional `UPDATE ... WHERE status='pending'`. No requiere `ETag` en MVP.            |
| Baja      | Trazabilidad bidireccional (`applied_entity_*` vs `ai_recommendation_id`) no estaba documentada | Auditoría incompleta                                                   | AC-04 + sección Database + tabla de side effects por `type` documentan la convención.                                       |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                  |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                  |
| Respeta human-in-the-loop IA         | Pass      | Esta historia ES el HITL canónico.                                                          |
| Respeta backend como source of truth | Pass      | Ownership, transacción atómica y validación en backend.                                     |
| Respeta seed/demo si aplica          | Pass      | Sin migraciones nuevas; reusa columnas/enums de la fundación AI-001.                         |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                  |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                                  |
| No introduce P4/Future scope         | Pass      | Cache, bulk transversal y feedback "no relevante" quedan explícitamente fuera de MVP.        |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad | Problema detectado | Acción recomendada                                              |
| ----- | ------- | ------------------ | --------------------------------------------------------------- |
| AC-01 | Clear   | —                  | Cubre apply happy path con strategy.                            |
| AC-02 | Clear   | —                  | Cubre apply con `editedPayload` válido + flag `edited=true`.    |
| AC-03 | Clear   | —                  | Cubre discard happy path con `204`.                              |
| AC-04 | Clear   | —                  | Cubre trazabilidad bidireccional.                                |
| AC-05 | Clear   | —                  | Cubre strategy registry extensible (`422` si no hay strategy).    |
| AC-06 | Clear   | —                  | Cubre idioma en logs (`NFR-OBS-001`).                            |

---

## 6. Gaps Detectados

### Producto / Negocio

Cubierto. Se delimita el cierre HITL como concern transversal y se delegan los side effects a las US dueñas del `type`.

### Backend / API

Cubierto. Use cases, strategy registry, controllers, validación Zod, transacciones atómicas y ownership policy quedan explícitos.

### Frontend / UX

Cubierto. `HITLActions`, `HITLEditModal`, hooks, telemetría y estados de UI documentados.

### Base de Datos

Cubierto. Sin migraciones nuevas; se documentan columnas y enums ya sembrados por US-017.

### Seguridad / Autorización

Cubierto. Ownership, exclusión de admin, no-revelación de IDs ajenos, redacción de PII en logs, transacción atómica.

### IA / PromptOps

No aplica directamente: el LLM no se invoca en este flujo. Se preserva `prompt_version_id` ya persistido durante la generación.

### QA / Testing

Cubierto. 10 functional, 10 negative, 7 AI, 6 authorization, accesibilidad.

### Seed / Demo

No requiere cambios de seed/demo nuevos. Reusa la fundación AI-001.

### Documentación / Trazabilidad

Cubierto. Se documentan 3 Documentation Alignment no bloqueantes (`/docs/8`, `/docs/9`, `/docs/16`).

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

| Documento / Fuente                         | Conflicto detectado                                                                                                                                                            | Decisión vigente                                                                                                                          | Acción recomendada                                                                            | ¿Bloquea aprobación? |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------- |
| `/docs/9-Functional-Requirements-Document.md` | La US original referenciaba `FR-AI-015` (AnthropicProvider stub) y `FR-AI-016` (`LLM_PROVIDER` config), que no son HITL                                                          | `FR-AI-019` (aceptar/editar/regenerar IA antes de persistir) + `FR-AI-018` (prompt versionado) son los canónicos HITL                       | Cleanup editorial en US (aplicado); ningún cambio en `/docs/9`                                  | No                   |
| `/docs/8-Use-Cases-Specification.md`        | No existe un UC dedicado a HITL transversal: cada `UC-AI-001..008` describe el HITL inline                                                                                       | `UC-AI-002` se adopta como canónico revisión; los demás UC IA invocan implícitamente este endpoint común                                   | Agregar nota cruzada en `/docs/8` que apunte a esta historia como API común                    | No                   |
| `/docs/16-API-Design-Specification.md`      | La US original modelaba un único `PATCH /api/v1/ai-recommendations/:id` con `status='edited'`. El canónico (§35.3, líneas 1521–1522) son **dos endpoints POST** (`/apply` y `/discard`) y `edited` es flag boolean | Adopción del canónico vigente: dos `POST` y `edited` como flag                                                                            | Aclaración liviana en `/docs/16` §35.6 sobre la convención de `editedPayload` en `apply`        | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                                  |
| User Story file path                       | `management/user-stories/US-025-accept-edit-discard-ai-suggestion.md`                                |
| User Story ID verified                     | Yes                                                                                                  |
| Decision Resolution artifact found         | No                                                                                                   |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-025-decision-resolution.md` (no requerido)          |
| Refinement review artifact created/updated | Yes                                                                                                  |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-025-refinement-review.md`                             |
| Final recommended status                   | Ready for Approval                                                                                   |
| Next recommended skill                     | `eventflow-user-story-approval`                                                                      |
| Reason                                     | Todas las decisiones HITL están formalizadas (`BR-AI-001..004`, `FR-AI-019`, PO 8.1 nota canónica UC-AI-001..009); endpoints canónicos `/docs/16` §35.3; sin migraciones nuevas; 3 Documentation Alignment no bloqueantes documentados |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* `Status: Draft → Ready for Approval`.
* `Last Updated: 2026-06-26`.
* `Backlog Item: PB-P1-016 — HITL Accept / Edit / Discard transversal`.
* `UI Surface: Componente reusable HITLActions invocado desde toda vista IA`.

### Business Context

* Endpoint canónico aclarado: dos POST (`/apply`, `/discard`).
* Side effects por `type` documentados con tabla canónica.
* Strategy pattern y registry documentados.
* Trazabilidad bidireccional explicada (`applied_entity_*` ↔ `ai_recommendation_id`).

### PO/BA Decisions Applied

Sección agregada con 14 decisiones derivadas de fuentes aprobadas:

1. HITL canónico irrenunciable.
2. Dos endpoints canónicos (`POST .../apply`, `POST .../discard`).
3. `apply` admite `editedPayload` opcional.
4. State machine canónica (`pending → {accepted, discarded}`).
5. Estado inmutable tras transición terminal.
6. Ownership backend-only; admin excluido.
7. Transacción atómica `AIRecommendation` + side effect.
8. Strategy pattern por `type`.
9. Mapa canónico de side effects por `type` (8 tipos).
10. `discard` siempre devuelve `204`.
11. Idempotencia HITL por state machine (sin `If-Match` en MVP).
12. Trazabilidad bidireccional.
13. Audit y observabilidad (`decided_*`, `correlation_id`).
14. Sin moderación IA del `editedPayload` (`BR-AI-004`).

### Traceability

* Backlog Item agregado: `PB-P1-016`.
* FRD corregido: `FR-AI-019` (HITL canónico), `FR-AI-018` (prompt versionado).
* UC corregido: `UC-AI-002` como canónico revisión + `UC-AI-001..008` (transversal).
* BR agregados: `BR-AI-001..004` (HITL), `BR-AI-010` (prompt versionado), `BR-AI-013` (cache fuera de MVP).
* NFR agregados: `NFR-OBS-001` (correlation), `NFR-OBS-002/003` (logs + PII), `NFR-SEC-005` (auditoría).
* Documentos relacionados ampliados a `/docs/4/6/7/8/9/10/16/18/19/22`.

### Scope Guardrails

* Out of Scope ampliado: regeneración (delegada por feature), moderación IA del contenido, cache (`BR-AI-013` queda fuera de MVP), bulk transversal (cubierto por US-031 / PB-P1-017), `If-Match`/`ETag`, AdminAction, edición post-apply, feedback "no relevante".

### Acceptance Criteria

* AC ampliados a 6: apply happy path, apply con `editedPayload`, discard happy path, trazabilidad bidireccional, strategy extensible, idioma en logs.
* EC ampliados a 8: estado terminal, ajena, schema inválido, side effect falla, type sin strategy, payload excesivo, concurrencia, body en discard.
* `VR-01..09` documentados.

### Technical Notes

* Use cases: `ApplyAIRecommendationUseCase`, `DiscardAIRecommendationUseCase`.
* Strategy registry: `AIRecommendationApplyStrategyRegistry` con 8 strategies MVP.
* Endpoints canónicos: `POST /api/v1/ai-recommendations/:aiRecommendationId/apply`, `POST /api/v1/ai-recommendations/:aiRecommendationId/discard`.
* Validación Zod por-`type` (`*OutputDto`).
* Transacción atómica `PrismaService.$transaction`.
* Logs estructurados: `ai.recommendation.{applied|discarded|apply_failed|type_unsupported|conflict}`.
* Métricas: `hitl_apply_count{type, edited}`, `hitl_discard_count{type}`, `hitl_apply_failure_count{type, error_code}`.

### QA Notes

* 10 functional, 10 negative, 7 AI, 6 authorization, accesibilidad.

### Definition of Ready

* Todos los checks `[x]` excepto el de validación PO/BA (pendiente del approval gate).

### Definition of Done

* Endpoints operativos + strategies registradas + transacción atómica + componente reusable integrado + trazabilidad bidireccional + logs/métricas + tests verdes + demo PO.

### Notes

* 3 Documentation Alignment Required no bloqueantes (`/docs/8`, `/docs/9`, `/docs/16`).
* `MockAIProvider` no interviene en HITL.
* Integración de `HITLActions` por cada vista IA se coordina con la US dueña del `type`.
* `applied_entity_id` queda `NULL` para `type` con efectos múltiples o sin entidad.

---

## 11. Recomendación Final

`Ready for Approval`.

US-025 quedó clara, valiosa, testeable, trazable y alineada con los guardrails MVP. Las decisiones HITL ya están formalizadas en `BR-AI-001..004`, `FR-AI-019`, PO 8.1 nota canónica para UC-AI-001..009, y los endpoints están canónicamente definidos en `/docs/16` §35.3. Los 3 Documentation Alignment Required son cleanup editorial y no bloquean la aprobación.

Siguiente skill: `eventflow-user-story-approval`.
