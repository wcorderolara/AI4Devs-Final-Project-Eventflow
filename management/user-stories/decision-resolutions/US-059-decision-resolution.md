# PO/BA Decision Resolution — US-059

## Source User Story File
management/user-stories/US-059-view-ai-comparator-summary.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-059-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-059 |
| Backlog Item | PB-P2-001 |
| Decisiones tomadas | 7 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — 2 endpoints
```
- GET /api/v1/events/:eventId/ai/quote-summary?category_code=<slug>
  Retorna el último AIRecommendation type='quote_compare_summary' para esa (event, category). Si no existe ⇒ 404 NOT_FOUND.

- GET /api/v1/ai-recommendations/:id
  Retorna AIRecommendation por id específico (para audit history, deep-links).

Esta US entrega ambos. El primero es el principal; el segundo es secundario para casos avanzados.
```

### D2 — Reuso 100% del componente shared
```
`AIComparisonSummary` (alias `AIComparisonPanel`) ya está definido en spec de US-022. US-059 NO duplica componente; solo añade:
- Hook `useLatestQuoteSummary({eventId, categoryCode})` que llama el GET de D1.
- Estado vacío con CTA "Resumir con IA" (botón hace mutation a US-022 endpoint).
- Integración en QuoteComparator (panel siempre presente).
```

### D3 — Show panel con render condicional
```
El panel siempre se renderiza en `/quotes/compare` cuando hay ≥2 quotes en la categoría (paridad US-022 D7).

Estados:
- **Loading**: skeleton.
- **No existe AIRecommendation**: empty state con CTA "Resumir con IA" (botón llama mutation de US-022).
- **Existe**: render summaries por quote + overall_observations + timestamp + locale info.
- **Existe pero quotes cambiaron** (snapshot mismatch): render summary + banner "Quotes han cambiado, [Regenerar]" (CTA llama mutation US-022).
- **Locale fallback aplicado**: badge "Resumen no disponible en idioma del evento" + mensaje estático.
```

### D4 — Stale indicator heredado US-022 D8
```
Hook compara `payload.quote_ids_snapshot` con current quotes (desde queryClient cache de US-057). Si difieren ⇒ flag `is_stale=true` exposed by hook.
```

### D5 — Authorization: organizer dueño + 404 uniforme
```
Backend valida:
- `events.organizer_user_id === currentUser.id` para el endpoint por eventId.
- Para endpoint por recommendation_id: verifica que AIRecommendation pertenezca a evento del organizer.

Cualquier ajeno ⇒ `404 AI_RECOMMENDATION_NOT_FOUND` uniforme.
```

### D6 — Solo último; sin historia MVP
```
GET por (event, category) retorna SOLO el último (`ORDER BY created_at DESC LIMIT 1`). Sin dropdown de versiones anteriores en MVP.

Post-MVP: si UX demanda, agregar `?include_history=true` con array de versiones.
```

### D7 — Layout panel lateral
```
Panel lateral derecho (paridad US-022 D6). Mobile: collapse a drawer/sheet con CSS responsive.

Accesibilidad: `role="complementary"` + focus management cuando se abre.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoints | 2 GETs (event+category, recommendation_id) |
| 2 | Component shared | Reuso 100% US-022 + hook + CTA |
| 3 | States | Loading / Empty+CTA / Filled / Stale / Fallback badge |
| 4 | Stale indicator | Hook compara snapshot vs current |
| 5 | Auth | Organizer dueño + 404 uniforme |
| 6 | History | Solo último MVP; opcional post-MVP |
| 7 | Layout | Panel lateral + mobile drawer |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-059-view-ai-comparator-summary.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
