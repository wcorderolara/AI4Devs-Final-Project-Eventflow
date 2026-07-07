# PO/BA Decision Resolution — US-024

## Source User Story File
management/user-stories/US-024-ai-task-prioritization.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-024-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-024 |
| Backlog Item | PB-P2-002 |
| Decisiones tomadas | 9 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Prompt + Zod output schema
```
Prompt: `TaskPriorityPrompt v1` versionado.

Output JSON schema (Zod strict):
{
  top: [
    {
      task_id: uuid,
      reason: string (max 200 chars),
      urgency_score: integer (1..10)
    }
  ] (max 3),
  rationale_summary?: string (max 300 chars, opcional)
}

Validación antes de persistir. Si malformado ⇒ fallback (D9).
```

### D2 — Locale binding (US-084 contract)
```
`aiProviderPort.generate({ promptTemplate, context, locale: event.language })`.

AIRecommendation persiste `locale` + `locale_fallback`.
```

### D3 — Tareas elegibles
```
Filtro: `event_tasks.status IN ('pending', 'in_progress')` Y `is_ai_pending = false` (solo tareas confirmadas via US-031; excluye borradores AI no confirmados).

`done`/`cancelled` excluidas.
```

### D4 — Cache server-side 5 min con signature
```
Cache key: `task-priority:{eventId}:{signature}` con TTL 5 min.

Signature = `sha256(sorted task_ids + status + updated_at)`. Si signature cambia (task creada/editada/completada), cache key cambia automáticamente.

In-memory cache shared (paridad MetricsCacheService de US-079).

Cache hit → log `ai.task_priority.cache.hit` + retorna AIRecommendation persistido sin nueva llamada AI.
Cache miss → llamada AI + persiste nuevo AIRecommendation + cache populated.

AIRecommendation payload incluye `cache_hit: false` para auditoría.
```

### D5 — Rate limit AI
```
Heredado patrón AI: 5 req/min/user vía middleware shared `aiRateLimit` (de US-022 BE-006). Excede ⇒ `429 AI_RATE_LIMITED`.
```

### D6 — Empty state UI
```
0 tareas elegibles ⇒ backend retorna `200 {top: [], rationale_summary: null}`.

Frontend muestra:
- Si event tiene 0 tasks total: "Aún no tienes tareas. [Generar checklist IA]" (deep-link US-018).
- Si event tiene tasks pero todas done/cancelled: "¡Felicidades! No tienes tareas urgentes."
```

### D7 — Pocas tareas (<3)
```
Si menos de 3 tareas elegibles, retornar todas. AC-01 corregido: "max 3" (no mínimo 3).
```

### D8 — AIRecommendation persistence
```
INSERT ai_recommendations:
{
  event_id, recommendation_type: 'task_priority',
  payload: {
    top: [...],
    rationale_summary: ...,
    task_ids_snapshot: [...] (audit),
    signature: '...' (audit),
    cache_hit: boolean,
    prompt_version: 'v1'
  },
  locale: event.language,
  locale_fallback: boolean
}
```

### D9 — Fallback si AI falla u output inválido
```
Fallback payload:
{
  top: [],
  rationale_summary: "Priorización IA no disponible. Revisa tu checklist manualmente ordenado por fecha de vencimiento."
}

`locale_fallback = true`. UI muestra el mensaje con icono ⚠ + sugerencia "Ordenar por due_date".
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Prompt + Schema | v1 + Zod validado |
| 2 | Locale | Per US-084 contract |
| 3 | Tareas elegibles | pending/in_progress + is_ai_pending=false |
| 4 | Cache | 5 min TTL con signature; in-memory |
| 5 | Rate limit | 5/min/user heredado |
| 6 | Empty state | 0 tasks elegibles → top:[] + UI sugerencia |
| 7 | Max 3 | Top max 3; menos si pocas tareas |
| 8 | Persistence | AIRecommendation con audit completo |
| 9 | Fallback | Template estático + locale_fallback=true |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-024-ai-task-prioritization.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
