# User Story Refinement Review — US-026

## Source User Story File
management/user-stories/US-026-regenerate-ai-suggestion-with-feedback.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-026-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q10 resueltas. La US-026 declara `Backlog Item: PB-P2-003`, `PO/BA Decisions Applied` D1–D10, trazabilidad corregida (FR-AI-014 stack/BR-AI-014 inexistente → FR-AI-018 + FR-AI-014/015 + UC-AI-010 + BR-AI-002/005/008..011 + Decisión PO US-026 cap 5). Schema parent_id+root_id+feedback + counting por linaje + locale hereda + helper PromptOps + auth polimórfica + cap env var. AC-01..AC-08, EC-01..EC-04, VR-01..VR-05, SEC-01..SEC-05, TS-01..TS-08, NT-01..NT-04, AI-TS-01..AI-TS-03, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-026 |
| Backlog Item | PB-P2-003 — Regeneración IA con feedback |
| Epic | EPIC-AI-001 (transversal) |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-026-refinement-review.md |

## 2. Diagnóstico

US-026 single-story de PB-P2-003. Feature cross-cutting AI: regeneración con feedback aplicable a CUALQUIER `AIRecommendation` (plan, checklist, budget, categories, brief, summary, task_priority, quote_compare_summary). Decisión PO ya confirmó **max 5 regeneraciones por sugerencia** (configurable env).

### Hallazgos

1. **Trazabilidad**: cita `FR-AI-014` (LLMProvider stack, no aplica directo) y `BR-AI-014` (no encontrada en docs). Correctos: **`FR-AI-018`** (regenerar IA, según backlog), **`UC-AI-010`** ✓, **`BR-AI-008..010`** (regeneración limits per backlog PB-P2-003), **`BR-AI-002/005`** (HITL + transparency), **`BR-AI-011`** (i18n).
2. **Falta declarar `Backlog Item: PB-P2-003`**.
3. **Cross-cutting type handling**: nuevo AIRecommendation child hereda `recommendation_type` del parent. Debe documentarse.
4. **EC-02 "padre con status final"**: `AIRecommendation` NO tiene columna `status` propia. Aclarar criterio (probable: contar count regeneraciones del linaje + estado del padre via tabla relacionada como `quote.status` para summary, `event.status` para plan, etc.).
5. **Locale binding**: nuevo child heredada `locale: parent.locale` (consistencia) — o re-evaluar event.language actual si cambió.
6. **Counting regeneraciones**: ¿cuenta por parent_id directo o por linaje completo (root)?
7. **Rate limit**: heredado pattern AI (5/min/user de US-022).
8. **Feedback injection**: ¿anexar al prompt como bloque separado o reescribir contexto?
9. **Authorization**: organizer si parent.event.organizer; vendor si parent corresponde a vendor (e.g., AI-021 quote brief). Cross-cutting requiere lógica polimórfica.
10. **Padre debe pertenecer al usuario**: `404 AI_RECOMMENDATION_NOT_FOUND` uniforme si ajeno.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Schema: `parent_recommendation_id` | Nullable FK auto-referente a `ai_recommendations.id` ON DELETE SET NULL. Index. Migración menor. |
| Q2 | PO | Max 5 regenerations: contar | Por **linaje raíz** (root). `regeneration_count = COUNT(*) WHERE root_id = lineage_root`. Más estricto que parent directo (evita escape walking linaje). |
| Q3 | Tech | Calcular root_id | Recursive CTE o columna `root_recommendation_id` denormalizada. Recomendado: **columna `root_recommendation_id`** (al insertar child, copia `parent.root_recommendation_id || parent.id`). Index. |
| Q4 | PO | Estado válido del parent | Cualquier AIRecommendation NO eliminada; sin restricción de "pending". Restringir contra count límite y rate-limit, no contra estado padre. EC-02 reescribir. |
| Q5 | Tech | Locale binding | Heredar `locale` del parent (consistencia experiencia). Si event.language cambió post-padre, mantener locale original. |
| Q6 | Tech | Feedback injection en prompt | Anexar como bloque "USER_FEEDBACK_FOR_REGENERATION" al final del prompt original (PromptOps shared helper). |
| Q7 | Sec | Authorization polimórfico | Resolver según `recommendation_type`: types organizer-owned (plan, checklist, budget, categories, task_priority, summary) → organizer del event; types vendor-owned (quote brief si existe) → vendor. `404 AI_RECOMMENDATION_NOT_FOUND` uniforme si ajeno. |
| Q8 | Sec | Rate limit AI | Heredado pattern: 5/min/user con middleware shared (de US-022). |
| Q9 | Tech | Fallback | Idéntico a use cases originales por type. `locale_fallback=true` si AI provider falla. |
| Q10 | PO | Cap env var | `AI_MAX_REGENERATIONS_PER_LINEAGE=5` configurable; expone via service para tests. |

## 9. Recomendación

`Needs Refinement` — 10 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
