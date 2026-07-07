# Technical Specification — US-059: AIComparisonSummary Panel Surface

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-059 |
| Source User Story | `management/user-stories/US-059-view-ai-comparator-summary.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-059-decision-resolution.md` |
| Priority | P2 (Should Have) |
| Backlog ID | PB-P2-001 |
| Backlog Title | AI-006: Resumen IA del comparador de Quotes |
| Backlog Execution Order | 1 (P2.1, US-059 cierra) |
| User Story Position in Backlog Item | 2 de 2 (cierra) |
| Related User Stories in Backlog Item | US-022, US-059 |
| Epic | EPIC-CMP-001 / EPIC-AI-001 |
| Backlog Item Dependencies | US-022, US-057 |
| Feature | 2 GET endpoints + componente shared US-022 + 5 estados UI |
| Module / Domain | Booking / AI |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P2-001 multi-story. US-059 cierra. Execution order 59. Reuso máximo de US-022.

---

## 3. Executive Technical Summary

**Backend**:
- `GetLatestQuoteSummaryUseCase`: query `AIRecommendation` ordered by `created_at DESC LIMIT 1` filtrado por `(event_id, recommendation_type='quote_compare_summary', payload->>'category_code'=:cat)`.
- `GetAIRecommendationUseCase`: lookup por id con ownership check.
- 2 Controllers + 2 rutas GET.
- AdminGuard N/A (organizer).

**Frontend**:
- Reuso 100% `AIComparisonSummary` componente (de US-022).
- `useLatestQuoteSummary` hook con TanStack Query.
- `useAIRecommendation` hook para deep-link.
- Lógica de 5 estados (Loading / Empty+CTA / Filled / Stale / Fallback badge).

---

## 4. Scope Boundary

### In Scope
- 2 GET endpoints + 2 hooks + integración + lógica states.

### Out of Scope
- Generación (US-022).
- Auto-preferred.
- History versiones anteriores.
- Edit/delete.

---

## 5. Architecture Alignment

Reuso máximo de componente US-022 + cursor utility N/A (no pagination).

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 panel con summary | Hook + render | FE |
| AC-02 empty + CTA | Conditional state | FE |
| AC-03 stale indicator | Hook compute is_stale | FE |
| AC-04 fallback badge | Check locale_fallback | FE |
| AC-05 GET by id | Endpoint | BE |
| EC-01..04 | Validaciones | BE |

---

## 7. Backend Technical Design

### Use Case (Latest by event+category)

```ts
class GetLatestQuoteSummaryUseCase {
  async execute({ currentUser, eventId, categoryCode }) {
    // 1. Ownership
    const event = await prisma.events.findFirst({
      where: { id: eventId, organizer_user_id: currentUser.id },
    });
    if (!event) throw new AIRecommendationNotFoundError();

    // 2. Query latest
    const aiRec = await prisma.ai_recommendations.findFirst({
      where: {
        event_id: eventId,
        recommendation_type: 'quote_compare_summary',
        // Filter by payload.category_code via JSON ops
        payload: { path: ['category_code'], equals: categoryCode },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!aiRec) throw new AIRecommendationNotFoundError();

    return aiRec;
  }
}
```

### Use Case (By ID)

```ts
class GetAIRecommendationUseCase {
  async execute({ currentUser, recommendationId }) {
    const aiRec = await prisma.ai_recommendations.findUnique({
      where: { id: recommendationId },
      include: { event: { select: { organizer_user_id: true } } },
    });
    if (!aiRec) throw new AIRecommendationNotFoundError();
    if (aiRec.event.organizer_user_id !== currentUser.id) throw new AIRecommendationNotFoundError(); // uniforme
    return aiRec;
  }
}
```

### Routes

```ts
router.get(
  '/events/:eventId/ai/quote-summary',
  organizerRoleGuard,
  asyncHandler(controller.getLatest.bind(controller))
);

router.get(
  '/ai-recommendations/:id',
  organizerRoleGuard,
  asyncHandler(controller.getById.bind(controller))
);
```

### DTOs

```ts
export const latestQuoteSummaryQuery = z.object({
  category_code: z.string().min(1).max(64),
}).strict();

export const recommendationIdParam = z.object({
  id: z.string().uuid(),
});
```

### Error Handling
`400 INVALID_UUID`, `400 INVALID_FILTERS`, `401`, `403`, `404 AI_RECOMMENDATION_NOT_FOUND`.

---

## 8. Frontend Technical Design

### Hooks

```ts
// hooks/useLatestQuoteSummary.ts
export function useLatestQuoteSummary({ eventId, categoryCode, currentQuoteIds }) {
  const query = useQuery({
    queryKey: ['ai.quote-summary', eventId, categoryCode],
    queryFn: () => aiApi.getLatestQuoteSummary({ eventId, categoryCode }),
    retry: false,  // 404 es estado válido
  });

  // Stale check
  const isStale = query.data
    && JSON.stringify(query.data.payload.quote_ids_snapshot.sort())
       !== JSON.stringify([...currentQuoteIds].sort());

  return { ...query, isStale, exists: !!query.data, notFound: query.error?.status === 404 };
}
```

### Componente integrado (reuso US-022)

```tsx
// components/organizer/quote/QuoteComparator.tsx (extender)
function QuoteComparator({ eventId, categoryCode }) {
  const quotesQuery = useCompareQuotes({ eventId, categoryCode });
  const summary = useLatestQuoteSummary({
    eventId, categoryCode,
    currentQuoteIds: quotesQuery.data?.items.map(q => q.quote_id) ?? [],
  });
  const generateMutation = useGenerateQuoteSummary({ eventId, categoryCode }); // US-022

  return (
    <div className="flex">
      <QuoteComparisonTable {...quotesQuery.data} />
      <AIComparisonSummary
        loading={summary.isLoading}
        notFound={summary.notFound}
        data={summary.data}
        isStale={summary.isStale}
        onGenerate={() => generateMutation.mutate({ category_code: categoryCode })}
        generating={generateMutation.isPending}
      />
    </div>
  );
}
```

### `AIComparisonSummary` (componente de US-022, extender props)

5 estados manejados:
- `loading=true` → skeleton.
- `notFound=true` → empty state + CTA "Resumir con IA".
- `data && !isStale && !data.locale_fallback` → render summaries normales.
- `data && isStale` → render summaries + banner "Quotes han cambiado, [Regenerar]".
- `data && data.locale_fallback` → render con badge "Resumen no disponible en idioma del evento" + mensaje estático.

---

## 9. API Contract

| Method | Endpoint | Query | Response | Errors |
|---|---|---|---|---|
| GET | `/api/v1/events/:eventId/ai/quote-summary?category_code=<slug>` | category_code | `200 AIRecommendation` | 400, 401, 403, 404 |
| GET | `/api/v1/ai-recommendations/:id` | - | `200 AIRecommendation` | 400, 401, 403, 404 |

---

## 10. Database / Prisma Design

### Models Impacted
`AIRecommendation` (read), `Event` (read for ownership).

### Indexes
Reuso de `(event_id, recommendation_type, created_at DESC)` ya existente.

Considerar index sobre `payload` JSON (`payload->>'category_code'`) si filtro lento; MVP aceptable con scan corto.

### Migration
Sin migraciones.

---

## 11. AI / PromptOps Design
N/A (es surface, no genera).

## 12. Security & Authorization Design

- Organizer dueño del evento.
- `404 AI_RECOMMENDATION_NOT_FOUND` uniforme.
- Solo lectura.

## 13. Testing Strategy

### Unit
- DTOs + UseCase branches (existe / no existe / ajeno).

### Integration
- TS-01..TS-06.

### API
Supertest.

### Security
- 404 uniforme.

### Accessibility
- 5 estados accesibles + axe.

### Performance
- `< 500ms p95`.

---

## 14. Observability & Audit
Solo log estándar.

---

## 15. Seed / Demo
Reuso. Verificar que seed crea AIRecommendation demo (opcional, US-022 lo cubre).

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar 2 endpoints GET | Documentar. | Actualizar. | No |
| `docs/7` (AI specs) | Documentar surface pattern AI-006 | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| JSON filter por category_code lento | UX | Index JSONB ops si crece data |
| Stale check incorrecto | UX confusa | Test unit con sort estable |
| Componente AC-22 cambia signature | Coupling | Coordinar PR con US-022; component contract estable |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/ai/dto/latest-quote-summary.query.ts` (nuevo)
- `src/modules/ai/use-cases/get-latest-quote-summary.use-case.ts` (nuevo)
- `src/modules/ai/use-cases/get-ai-recommendation.use-case.ts` (nuevo)
- `src/modules/ai/controllers/ai-quote-summary.controller.ts` (extender de US-022)
- `src/modules/ai/controllers/ai-recommendation.controller.ts` (nuevo)
- `src/modules/ai/routes/ai-quote-summary.routes.ts` (extender)
- `src/modules/ai/routes/ai-recommendation.routes.ts` (nuevo)

**Frontend**:
- `hooks/useLatestQuoteSummary.ts` (nuevo)
- `hooks/useAIRecommendation.ts` (nuevo, opcional)
- `components/organizer/ai/AIComparisonSummary.tsx` (extender props de US-022 con 5 estados)
- `components/organizer/quote/QuoteComparator.tsx` (extender, integrar panel)
- `lib/api/aiApi.ts` (extender con `getLatestQuoteSummary`, `getRecommendation`)
- `messages/{4 locales}.json` (`organizer.ai.quote_summary.empty`, `stale_banner`, `fallback_badge`)

### Orden sugerido
1. BE: DTOs + 2 UseCases + UT.
2. BE: 2 Controllers + rutas.
3. FE: 2 hooks + UT.
4. FE: Extender `AIComparisonSummary` con 5 estados.
5. FE: Integrar en QuoteComparator.
6. i18n labels para 3 nuevos states.
7. Tests IT + AUTH + A11Y.
8. Documentación.

### Decisiones que no deben reabrirse
D1–D7.

### Qué no implementar
- Generación.
- Auto-preferred.
- History.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| BE | 4 (DTOs + 2 UseCases + Controllers) |
| FE | 4 (Hook + Component extension + Integration + i18n) |
| QA | 4 (UT, IT, AUTH, A11Y) |
| DOC | 1 |
| **Total** | 13 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Reuso clear (componente US-022) | Pass |
| Security clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-059 cierra PB-P2-001 con 2 GET endpoints + reuso 100% del componente de US-022 + lógica de 5 estados (loading/empty+CTA/filled/stale/fallback). PB-P2-001 cierra completamente.
