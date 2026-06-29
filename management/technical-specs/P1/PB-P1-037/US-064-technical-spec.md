# Technical Specification — US-064: BudgetSummary con refresh + warning + aria-live

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-064 |
| Source User Story | `management/user-stories/US-064-view-committed-updated-budget.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-064-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-037 |
| Backlog Title | Disclaimer visible + committed sincronizado |
| Backlog Execution Order | 64 |
| User Story Position in Backlog Item | 2 de 2 |
| Related User Stories in Backlog Item | US-063, US-064 |
| Epic | EPIC-CMP-001 |
| Backlog Item Dependencies | US-061, US-062, US-035..038, PB-P0-001 |
| Feature | Surface UI + invalidation cross-domain + warning + aria-live |
| Module / Domain | Budget / Booking |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

US-064 cierra PB-P1-037 + EPIC-CMP-001. Execution order 64.

---

## 3. Executive Technical Summary

**Backend**:
- Refactor minimal del mapper del response de `GET /api/v1/events/:id/budget` para incluir `totals + items + flags over_committed + auto_created + last_updated_at`. Sin nuevos endpoints ni migraciones.

**Frontend**:
- `BudgetSummary` Client Component (totales + lista + warning).
- `BudgetSummaryCard`, `BudgetItemRow`, `BudgetOverCommittedBanner` sub-componentes.
- Extender `useConfirmBooking` (US-061) y `useCancelBooking` (US-062) con invalidaciones de queryKeys `['budget', eventId]`, `['budget.summary', eventId]`, `['event.dashboard', eventId]`.
- `aria-live="polite"` + anuncio comparativo.
- Botón manual "Actualizar".

---

## 4. Scope Boundary

### In Scope
- Refactor mapper response.
- Frontend `BudgetSummary` + sub-componentes.
- Extensión de hooks de mutation.
- i18n 4 locales.
- Tests + regresión.

### Out of Scope
- WebSocket / push realtime.
- Histórico de cambios.
- Endpoint nuevo.

---

## 5. Architecture Alignment

Reuso de Budget module. Cross-domain coordination via TanStack invalidation.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 auto-refresh | Invalidate en hooks US-061/US-062 | FE |
| AC-02 visualización | Mapper response + BudgetSummary | BE, FE |
| AC-03 warning | Component condicional + flag over_committed | FE |
| AC-04 aria-live | useEffect comparativo + anuncio | FE |
| AC-05 botón manual | Refetch on click | FE |
| EC-01..04 | Refresh + auto-created badge + empty state | FE |

---

## 7. Backend Technical Design

### Refactor mapper

```ts
// Existing endpoint controller — solo refactor del mapper:
function mapBudgetToSummaryResponse(budget, items) {
  const totals = items.reduce((acc, item) => ({
    planned: acc.planned.plus(item.planned),
    committed: acc.committed.plus(item.committed),
  }), { planned: new Decimal(0), committed: new Decimal(0) });

  const available = totals.planned.minus(totals.committed);
  const overCommitted = totals.committed.greaterThan(totals.planned);

  return {
    event_id: budget.event_id,
    currency_code: budget.event.currency_code,
    totals: {
      planned: totals.planned.toString(),
      committed: totals.committed.toString(),
      available: available.toString(),
      over_committed: overCommitted,
    },
    items: items
      .map((item) => ({
        id: item.id,
        service_category_id: item.service_category_id,
        category_name_i18n: item.service_category.name_i18n,
        planned: item.planned.toString(),
        committed: item.committed.toString(),
        diff: item.planned.minus(item.committed).toString(),
        over_committed: item.committed.greaterThan(item.planned),
        auto_created: detectAutoCreated(item), // heuristic: planned=0 + committed>0 + created_via_booking_confirm
      }))
      .sort(byCommittedDesc),
    last_updated_at: budget.updated_at?.toISOString() ?? null,
  };
}
```

### `auto_created` flag detection

Heurística: si `item.planned === 0 && item.committed > 0`, marcar `auto_created = true`. Alternativa más estricta: añadir columna `created_via text` en `budget_items` (futuro).

---

## 8. Frontend Technical Design

### Componentes

```tsx
// components/organizer/budget/BudgetSummary.tsx (Client Component)
export function BudgetSummary({ eventId }) {
  const { data, refetch, isLoading } = useBudgetSummary(eventId);
  const previousCommitted = usePrevious(data?.totals.committed);

  useEffect(() => {
    if (data && previousCommitted && previousCommitted !== data.totals.committed) {
      // aria-live announcement (handled via aria-live region rendering data)
    }
  }, [data?.totals.committed]);

  if (isLoading) return <BudgetSummarySkeleton />;
  if (!data?.items.length) return <BudgetEmptyState />;

  return (
    <div role="region" aria-labelledby="budget-summary-title">
      <h2 id="budget-summary-title">{t('title')}</h2>
      <div aria-live="polite" aria-atomic="true">
        <BudgetSummaryCard totals={data.totals} currency={data.currency_code} />
      </div>
      {data.totals.over_committed && (
        <BudgetOverCommittedBanner exceso={...} currency={...} />
      )}
      <ul>
        {data.items.map(item => <BudgetItemRow key={item.id} item={item} currency={data.currency_code} />)}
      </ul>
      <button onClick={() => refetch()}>{t('refresh')}</button>
    </div>
  );
}
```

### Hooks de mutation refactorizados

```ts
// US-061 hook
export function useConfirmBooking(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (intentId: string) => vendorApi.bookings.confirm(intentId, { disclaimer_accepted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', eventId] });
      queryClient.invalidateQueries({ queryKey: ['budget.summary', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event.dashboard', eventId] });
      queryClient.invalidateQueries({ queryKey: ['booking-intent', /* etc */] });
    },
  });
}

// US-062 hook (idem)
```

### Banner over-committed

```tsx
function BudgetOverCommittedBanner({ exceso, currency }) {
  const t = useTranslations('organizer.budget.summary');
  return (
    <div role="alert" className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded">
      <span aria-hidden>⚠</span>
      <p>{t('over_committed', { exceso: `${currency} ${exceso}` })}</p>
    </div>
  );
}
```

---

## 9. API Contract

| Endpoint | Cambio |
|---|---|
| `GET /api/v1/events/:id/budget` | Response refactor: añade `totals`, `over_committed`, `auto_created`, `diff`, `last_updated_at`. Backward incompatible (MVP greenfield). |

---

## 10. Database / Prisma Design

Sin migraciones. Reuso de modelos existentes.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Heredada del endpoint existente.

## 13. Testing Strategy

### Unit
- Mapper response: totales, diff, flags over_committed, auto_created heurística.

### Integration
- Endpoint retorna shape completa.
- Regresión: US-035..038 siguen funcionando con response refactorizada.

### E2E
- TS-01..TS-07: refresh tras confirm/cancel, warning visible, badge auto-created.

### Accessibility
- aria-live + role="alert" + axe + screen reader.

### Performance
- `< 500ms` p95.

---

## 14. Observability & Audit
Solo log estándar del request.

---

## 15. Seed / Demo
Reuso. Verificar demo data muestra over_committed (caso edge para demo) + auto_created (de US-061).

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar response shape extendida del endpoint Budget | Documentar. | Actualizar. | No |
| `docs/14` | Documentar cross-domain refresh chain | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Response shape breaking US-035..038 | Regresión | Tests integrales + clientes existentes alineados |
| Invalidation muy agresiva | UX lenta | QueryKeys precisos |
| Heurística `auto_created` falsos positivos | UX confusa | Aceptable en MVP; futuro: columna explícita |
| aria-live ruidoso | A11Y degradada | Comparación con valor previo (no anunciar si no hay cambio) |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/budget/use-cases/get-budget-summary.use-case.ts` (refactor mapper o nuevo wrapper)
- `src/modules/budget/mappers/budget-summary.mapper.ts` (nuevo)
- `src/modules/budget/controllers/budget.controller.ts` (refactor minimal)

**Frontend**:
- `components/organizer/budget/BudgetSummary.tsx` (nuevo)
- `components/organizer/budget/BudgetSummaryCard.tsx` (nuevo)
- `components/organizer/budget/BudgetItemRow.tsx` (nuevo)
- `components/organizer/budget/BudgetOverCommittedBanner.tsx` (nuevo)
- `components/organizer/budget/BudgetEmptyState.tsx` (nuevo)
- `hooks/useBudgetSummary.ts` (nuevo)
- `hooks/useConfirmBooking.ts` (refactor — extender con invalidaciones)
- `hooks/useCancelBooking.ts` (refactor — extender con invalidaciones)
- `lib/api/budgetApi.ts` (extender)
- `messages/{4 locales}.json` (`organizer.budget.summary.*`)

### Orden sugerido
1. DB-001 (verificar endpoint base existe).
2. BE-001 Mapper + UT.
3. BE-002 Refactor controller.
4. FE-001 useBudgetSummary hook.
5. FE-002 Componentes UI.
6. FE-003 Refactor hooks de mutation US-061/US-062.
7. FE-004 i18n.
8. Tests IT + E2E + A11Y + regresión.
9. Documentación.

### Decisiones que no deben reabrirse
D1–D6.

### Qué no implementar
- WebSocket / push.
- Endpoint nuevo.
- Histórico.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 |
| BE | 2 |
| FE | 5 |
| QA | 5 |
| DOC | 1 |
| **Total** | 14 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Reuso de endpoint clear | Pass |
| Cross-domain invalidation clear | Pass |
| Security clear | Pass (heredada) |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-064 cierra PB-P1-037 + EPIC-CMP-001 con surface UI cross-domain (Booking → Budget) + warning no bloqueante + aria-live + refresh automático. Sin endpoints nuevos ni migraciones. Refactor minimal del mapper de response + extensión de 2 hooks de mutation existentes.
