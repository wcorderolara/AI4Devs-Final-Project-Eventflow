# PO/BA Decision Resolution — US-064

## Source User Story File
management/user-stories/US-064-view-committed-updated-budget.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-064-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-064 |
| Backlog Item | PB-P1-037 |
| Decisiones tomadas | 6 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Reuso de endpoint existente
```
US-064 reusa `GET /api/v1/events/:id/budget` entregado por PB-P1-022/US-035..038 (verificar). Si el endpoint no retorna actualmente `planned/committed/diff por categoría + totales`, US-064 añade esos campos al response (refactor minimal del mapper).

Sin endpoint nuevo. Sin migraciones.
```

### D2 — Refresh con TanStack invalidation
```
Hooks `useConfirmBooking` (US-061) y `useCancelBooking` (US-062) añaden en `onSuccess`:
- queryClient.invalidateQueries({ queryKey: ['budget', eventId] })
- queryClient.invalidateQueries({ queryKey: ['budget.summary', eventId] })
- queryClient.invalidateQueries({ queryKey: ['event.dashboard', eventId] })

Refresh automático sin acción del usuario.
```

### D3 — Shape del summary
```
Response del endpoint incluye:
{
  event_id, currency_code,
  totals: { planned, committed, available: planned - committed, over_committed: boolean },
  items: [
    {
      service_category_id, category_name_i18n,
      planned, committed, diff: planned - committed,
      over_committed: boolean,
      auto_created: boolean   // true si fue auto-created en US-061
    }
  ],
  last_updated_at: timestamp
}

Ordenado por `committed DESC, planned DESC, category_name ASC`.
```

### D4 — Auto-refresh + botón manual
```
Auto-refresh automático tras confirm/cancel (D2).

Adicional: botón "Actualizar presupuesto" visible en `BudgetSummary` para refresh manual (UX safety net). Re-fetcha la misma query key.
```

### D5 — Aria-live polite
```
`BudgetSummary` envuelve los totales en `<div aria-live="polite" aria-atomic="true">`. Cuando el componente detecta cambio en `totals.committed` vs valor previo, emite anuncio:

"Presupuesto actualizado: ${currency_code} ${nuevo_committed} comprometido de ${planned} planeado".

Solo si la diferencia es significativa (> 0). Implementado con `useEffect` comparando previo vs actual.
```

### D6 — Warning visual no bloqueante
```
Cuando `totals.over_committed === true` (committed > planned):
- Banner amarillo en `BudgetSummary` con icono ⚠ (BR-BUDGET-004).
- Texto: "El comprometido excede el presupuesto planeado en {currency_code} {exceso}. Revisa tus partidas o ajusta el presupuesto."
- Sin bloqueo de UI.
- aria-role="alert" para screen readers.

Por categoría: badge "⚠ Excedido" cuando `item.over_committed === true`.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Endpoint | Reuso `GET /events/:id/budget` con refactor minimal del mapper |
| 2 | Refresh | TanStack invalidate en hooks US-061/US-062 |
| 3 | Shape | Totales + items con planned/committed/diff + flags |
| 4 | Refresh manual | Botón adicional para safety net |
| 5 | Aria-live | Polite + anuncio comparativo |
| 6 | Warning | Banner amarillo no bloqueante + badges |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-064-view-committed-updated-budget.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
