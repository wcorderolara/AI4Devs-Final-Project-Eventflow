# User Story Refinement Review — US-024

## Source User Story File
management/user-stories/US-024-ai-task-prioritization.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-024-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q9 resueltas. La US-024 declara `Backlog Item: PB-P2-002`, `PO/BA Decisions Applied` D1–D9, trazabilidad corregida (FR-AI-011 inexistente + FR-TASK-007 inaplicable → FR-AI-008 + FR-I18N-005 + UC-AI-008 + BR-AI-011 + BR-TASK-009). Endpoint POST con cache 5min + signature + locale binding + AIRecommendation con audit + rate limit + fallback. AC-01..AC-07, EC-01..EC-04, VR-01..VR-04, SEC-01..SEC-05, TS-01..TS-06, NT-01..NT-06, AI-TS-01..AI-TS-04, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-024 |
| Backlog Item | PB-P2-002 — Priorización IA Top 3 |
| Epic | EPIC-AI-001 / EPIC-TASK-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-024-refinement-review.md |

## 2. Diagnóstico

US-024 single-story de PB-P2-002. Pattern paridad con US-022 (AI summary informativo + HITL + locale binding + AIRecommendation persistido + fallback). Should Have MVP.

### Hallazgos

1. **Trazabilidad**: cita `FR-AI-011` (NO EXISTE) y `FR-TASK-007` (es % completitud, no priorización). Correctos: **`FR-AI-008`** (priorización IA tareas), **`UC-AI-008`** ✓, **`BR-AI-001..005`** ✓, **`BR-AI-011`** (i18n), **`FR-I18N-005`** (AI respeta idioma).
2. **Falta declarar `Backlog Item: PB-P2-002`**.
3. **AC-01 dice "top 3" pero EC-01 dice "puede ser menos"**: aclarar (max 3).
4. **Tareas elegibles**: solo `pending`/`in_progress` per US Context. Confirmar (excluye `done`/`cancelled`).
5. **Tareas confirmadas vs todas**: si hay tasks AI no confirmadas (US-031), ¿se consideran? PO decide.
6. **Caching**: Notes plantea 5 min TTL para reducir redundancia.
7. **Rate limit**: heredado pattern AI.
8. **Locale binding**: per US-084 contract.
9. **AIRecommendation persistence**: type='task_priority' + payload + locale + locale_fallback.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Prompt + Zod output schema | Prompt `TaskPriorityPrompt v1`. Output: `{top: [{task_id, reason: string max 200, urgency_score: 1..10}], rationale_summary?: string max 300}`. Max 3 items. |
| Q2 | Tech | Locale binding (US-084) | `aiProviderPort.generate({locale: event.language})` + persistir locale + locale_fallback. |
| Q3 | PO | Tareas elegibles | `status IN ('pending', 'in_progress')` Y `is_ai_pending=false` (solo confirmadas via US-031). Excluye `done/cancelled` y borradores AI. |
| Q4 | PO | Cache 5 min | Sí, cache server-side TTL 5 min con key `task-priority:{eventId}:{checklistSignature}`. Signature = hash de task ids + status + updated_at. Si el checklist cambia, cache invalidado. |
| Q5 | Sec | Rate limit | Heredado pattern: 5 req/min/user. |
| Q6 | PO | Empty state behavior | Si 0 tareas elegibles ⇒ `200 {top: []}` con UI sugiriendo "Generar checklist IA" (deep-link US-018). |
| Q7 | PO | Pocas tareas (<3) | Retornar todas las elegibles si <3. AC-01 reescrito a "max 3". |
| Q8 | PO | AIRecommendation persistence | Sí, type='task_priority' + payload con task_ids snapshot + cache_hit flag + locale + locale_fallback. |
| Q9 | Tech | Fallback si AI falla | Template estático "Priorización IA no disponible. Revisa tu checklist manualmente ordenado por fecha de vencimiento." + locale_fallback=true. |

## 9. Recomendación

`Needs Refinement` — 9 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
