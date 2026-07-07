# PO/BA Decision Resolution — US-022

## Source User Story File
management/user-stories/US-022-ai-quote-comparison-summary.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-022-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-022 |
| Backlog Item | PB-P2-001 |
| Decisiones tomadas | 9 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Categoría requerida
```
Body POST requiere `category_code: string`. Sin categoría ⇒ `400 INVALID_FILTERS` con `details.field='category_code'`. Cumple BR-QUOTE-023.
```

### D2 — AI prompt + output schema
```
Prompt: `QuoteCompareSummaryPrompt v1`. Versionado.

Output JSON schema:
{
  summaries: [
    {
      quote_id: uuid,
      pros: string[] (max 5 items),
      cons: string[] (max 5 items),
      missing_info: string[] (max 3 items),
      notes: string (max 500 chars)
    }
  ],
  overall_observations: string (max 500 chars, opcional)
}

Validación del output con Zod antes de persistir. Si malformado ⇒ fallback (D9).
```

### D3 — Locale binding (US-084 contract)
```
`aiProviderPort.generate({ promptTemplate, context, locale: event.language })`.

AIRecommendation persiste `locale` + `locale_fallback` (per US-084 D6).
```

### D4 — Sin cache; cada request genera nuevo AIRecommendation
```
Cada POST genera un nuevo AIRecommendation. Usuario puede re-generar si quiere.

Payload incluye:
- `quote_ids_snapshot: uuid[]` (audit de qué quotes se consideraron).
- `category_code: string`.
- `prompt_version: 'v1'`.
- `summaries: [...]` (output del LLM).

Esto permite trazabilidad si las quotes cambian luego.
```

### D5 — Rate limit AI
```
Heredado patrón AI use cases: max **5 requests/min/user** vía middleware shared. Si excede ⇒ `429 AI_RATE_LIMITED` con `details.retry_after_seconds`.

Configurable via env `AI_RATE_LIMIT_PER_MINUTE=5`.
```

### D6 — UI: panel lateral
```
`AIComparisonSummary` componente como panel lateral en `/organizer/events/:id/quotes/compare`. NO modal (mantiene tabla visible).

Trigger: botón "Resumir con IA" en header de la tabla (visible solo con ≥2 quotes elegibles).

Loading state: skeleton dentro del panel.
Success: render de `summaries[]` con disclosure por Quote.
```

### D7 — Mínimo 2 quotes activas
```
Mínimo: ≥2 quotes con `status IN ('sent', 'responded', 'preferred')` en la categoría.

`expired` y `rejected` NO cuentan. Solo 1 elegible (o 0) ⇒ `400 INSUFFICIENT_QUOTES` con `details.eligible_count`.
```

### D8 — Snapshot + banner si quotes cambian
```
AIRecommendation persiste `quote_ids_snapshot`. UI compara con quotes actuales:
- Si snapshot != current ⇒ mostrar banner "Las quotes han cambiado desde este resumen. [Regenerar]".
- Permite usar resumen viejo o pedir nuevo.
```

### D9 — Fallback si AI falla o output inválido
```
Si:
- AIProviderPort timeout/error → fallback.
- Output no parsea según schema Zod → fallback.

Fallback:
{
  summaries: [],
  overall_observations: "Resumen IA temporalmente no disponible. Compara manualmente las quotes en la tabla."
}

AIRecommendation.locale_fallback = true. UI muestra el mensaje + sugerencia de retry.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Categoría | `category_code` requerido |
| 2 | Prompt + schema | v1 + JSON validado Zod |
| 3 | Locale | Per US-084 contract |
| 4 | Cache | Sin cache; cada request nuevo AIRecommendation |
| 5 | Rate limit | 5/min/user |
| 6 | UI | Panel lateral (no modal) |
| 7 | Mín quotes | ≥2 activas en la categoría |
| 8 | Snapshot | quote_ids_snapshot + banner si cambian |
| 9 | Fallback | Template estático + locale_fallback=true |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-022-ai-quote-comparison-summary.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
