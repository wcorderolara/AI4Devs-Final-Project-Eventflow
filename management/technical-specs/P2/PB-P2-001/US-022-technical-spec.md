# Technical Specification — US-022: AI Quote Comparison Summary

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-022 |
| Source User Story | `management/user-stories/US-022-ai-quote-comparison-summary.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-022-decision-resolution.md` |
| Priority | P2 (Should Have) |
| Backlog ID | PB-P2-001 |
| Backlog Title | AI-006: Resumen IA del comparador de Quotes |
| Backlog Execution Order | 1 (P2.1, US-022 abre) |
| User Story Position in Backlog Item | 1 de 2 |
| Related User Stories in Backlog Item | US-022, US-059 |
| Epic | EPIC-AI-001 / EPIC-CMP-001 |
| Backlog Item Dependencies | US-052, US-057, US-082, US-084 |
| Feature | AI summary endpoint + panel + locale binding + snapshot audit |
| Module / Domain | AI / Booking |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P2-001 multi-story. US-022 abre. Execution order 51.

---

## 3. Executive Technical Summary

**Backend**:
- `GenerateQuoteSummaryUseCase`: validación ≥2 quotes elegibles + carga context + invoca `AIProviderPort.generate({locale: event.language})` per US-084 + Zod validate output + persiste `AIRecommendation` con snapshot + log.
- Prompt `QuoteCompareSummaryPrompt v1` versionado.
- Rate limit middleware shared.
- Controller `POST /api/v1/events/:id/ai/quote-summary`.

**Frontend**:
- `AIComparisonSummary` panel lateral accesible.
- Integración con `QuoteComparator` (US-057).
- `aiApi.generateQuoteSummary` + MSW.

---

## 4. Scope Boundary

### In Scope
- UseCase atómico + prompt template + Zod output schema + Controller + rate limit + panel lateral + i18n.

### Out of Scope
- Selección automática preferred (HITL).
- Cache de resúmenes.
- Negociación automática.
- Conversión FX.

---

## 5. Architecture Alignment

Reuso de AIProviderPort (US-084) + cursor pattern N/A (es single response). Pattern AI use case con HITL informativo.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 generación válida | UseCase + AIProviderPort.generate | BE |
| AC-02 snapshot | Persistencia AIRecommendation | BE, DB |
| AC-03 HITL | Sin endpoint auto-preferred | BE, FE |
| AC-04 locale binding | locale: event.language | BE |
| AC-05 fallback | Try/catch + template estático | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
class GenerateQuoteSummaryUseCase {
  async execute({ currentUser, eventId, body }) {
    // 1. Ownership
    const event = await prisma.events.findFirst({ where: { id: eventId, organizer_user_id: currentUser.id } });
    if (!event) throw new EventNotFoundError();

    // 2. Categoría existe
    const category = await prisma.service_categories.findUnique({ where: { code: body.category_code } });
    if (!category) throw new InvalidFiltersError('category_code');

    // 3. Quotes elegibles ≥2
    const quotes = await prisma.quotes.findMany({
      where: {
        quote_request: { event_id: eventId, service_category_id: category.id },
        status: { in: ['sent', 'responded', 'preferred'] },
      },
      include: { vendor_profile: { select: { business_name: true, rating_avg: true } } },
    });
    if (quotes.length < 2) throw new InsufficientQuotesError(quotes.length);

    // 4. Construir context
    const context = {
      category_name: category.name_i18n[event.language] || category.name_i18n['es-LATAM'],
      event_title: event.title,
      event_currency: event.currency_code,
      event_date: event.event_date,
      quotes: quotes.map(q => ({
        quote_id: q.id,
        vendor_business_name: q.vendor_profile.business_name,
        rating_avg: q.vendor_profile.rating_avg,
        total_price: q.total_price.toString(),
        valid_until: q.valid_until,
        breakdown: q.breakdown,
        conditions: q.conditions,
        status: q.status,
      })),
    };

    // 5. Llamar AIProviderPort con locale
    const result = await this.aiProviderPort.generate({
      promptTemplate: QUOTE_COMPARE_SUMMARY_PROMPT_V1,
      context,
      locale: event.language,
    });

    // 6. Validar output
    let parsedOutput;
    let localeFallback = result.locale_fallback;

    try {
      parsedOutput = quoteSummaryOutputSchema.parse(JSON.parse(result.output));
    } catch (err) {
      logger.warn('ai.quote_summary.output_malformed', { eventId, error: err.message });
      parsedOutput = FALLBACK_PAYLOAD;
      localeFallback = true;
    }

    // 7. Persistir AIRecommendation
    const aiRec = await prisma.ai_recommendations.create({
      data: {
        event_id: eventId,
        recommendation_type: 'quote_compare_summary',
        payload: {
          ...parsedOutput,
          quote_ids_snapshot: quotes.map(q => q.id),
          category_code: body.category_code,
          prompt_version: 'v1',
        },
        locale: event.language,
        locale_fallback: localeFallback,
      },
    });

    logger.info('ai.quote_summary.generated', {
      eventId, organizerUserId: currentUser.id,
      quoteCount: quotes.length, locale: event.language, localeFallback,
    });

    return {
      ai_recommendation_id: aiRec.id,
      summaries: parsedOutput.summaries,
      overall_observations: parsedOutput.overall_observations,
      locale: event.language,
      locale_fallback: localeFallback,
      generated_at: aiRec.created_at,
    };
  }
}
```

### Output Schema (Zod)

```ts
const summaryItemSchema = z.object({
  quote_id: z.string().uuid(),
  pros: z.array(z.string()).max(5),
  cons: z.array(z.string()).max(5),
  missing_info: z.array(z.string()).max(3),
  notes: z.string().max(500),
});

export const quoteSummaryOutputSchema = z.object({
  summaries: z.array(summaryItemSchema),
  overall_observations: z.string().max(500).optional(),
});
```

### Prompt template (extracto)

```
Eres un asistente que ayuda a un organizador de eventos a comparar cotizaciones recibidas para la categoría "{{category_name}}" de su evento "{{event_title}}".

IMPORTANTE: Tu rol es INFORMAR, no decidir. NO recomiendes cuál es la mejor.

Para cada cotización, identifica:
- Pros (hasta 5 items, frases cortas)
- Contras (hasta 5 items)
- Información faltante (hasta 3 items)
- Notas adicionales (max 500 chars)

Devuelve estrictamente JSON con esta estructura:
{
  "summaries": [{...}],
  "overall_observations": "..." (opcional, max 500 chars)
}

Cotizaciones:
{{quotes_json}}
```

(Instrucción de idioma agregada por `composeLocaleInstruction` del helper de US-084.)

### Routes

```ts
router.post(
  '/events/:id/ai/quote-summary',
  organizerRoleGuard,
  aiRateLimit, // shared middleware
  asyncHandler(controller.generate.bind(controller))
);
```

### DTOs

```ts
export const quoteSummaryBody = z.object({
  category_code: z.string().min(1).max(64),
}).strict();
```

### Error Handling
`400 INVALID_FILTERS`, `400 INSUFFICIENT_QUOTES`, `400 INVALID_BODY`, `401`, `403`, `404 EVENT_NOT_FOUND`, `429 AI_RATE_LIMITED`, `500` (interno).

---

## 8. Frontend Technical Design

### Componentes

- `AIComparisonSummary` (Client Component): panel lateral derecho con `role="complementary"`, header con "Resumen IA" + timestamp, body con Disclosure por quote (pros/cons/missing_info/notes), footer con `overall_observations`.
- Botón trigger "Resumir con IA" en header de `QuoteComparator` (US-057), visible solo si `quotes.length >= 2`.
- Banner "Las quotes han cambiado desde este resumen" con botón "Regenerar" si `payload.quote_ids_snapshot != currentQuoteIds`.

### State Management
- TanStack mutation `useGenerateQuoteSummary` con queryKey `['ai.quote-summary', eventId, categoryCode]`.
- Persistir último summary en cache para mostrar al re-abrir el panel.

### Forms
N/A (single trigger).

### i18n
`organizer.ai.quote_summary.*` en 4 locales para UI shell (botones, headers, mensajes).

El contenido del summary (pros/cons/etc.) viene en `event.language` desde el AI.

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/api/v1/events/:id/ai/quote-summary` | `{category_code}` | `200 {ai_recommendation_id, summaries[], overall_observations?, locale, locale_fallback, generated_at}` | 400, 401, 403, 404, 429, 500 |

---

## 10. Database / Prisma Design

### Models Impacted
`AIRecommendation` (insert), `Quote` (read), `QuoteRequest` (read), `Event` (read), `ServiceCategory` (read), `VendorProfile` (read for context).

### Indexes
Reuso de `(event_id, recommendation_type, created_at DESC)` ya existente.

### Migration
Sin migraciones obligatorias (depende de US-084 migración).

---

## 11. AI / PromptOps Design

### Prompt versioning
`QuoteCompareSummaryPrompt v1` en `src/modules/ai/prompts/quote-compare-summary.v1.ts`. Bumping requiere ADR + nueva version.

### Output validation
Zod schema strict. Falla → fallback.

### Locale injection
Helper `composeLocaleInstruction(locale)` (US-084) prepend al prompt.

### Rate limit
Middleware shared `aiRateLimit` con default 5/min/user (configurable via env).

### Fallback
Template estático:
```json
{
  "summaries": [],
  "overall_observations": "Resumen IA temporalmente no disponible. Compara manualmente las quotes en la tabla."
}
```

---

## 12. Security & Authorization Design

- Sesión organizer + ownership.
- Rate limit AI.
- `404 EVENT_NOT_FOUND` uniforme.
- HITL: NO endpoint auto-preferred.

## 13. Testing Strategy

### Unit
- DTO + UseCase branches (≥2, <2, sin category, AI error, output malformed).
- Output schema Zod.

### Integration
- TS-01..TS-05 + binding locale verificado.

### AI Tests (mocks)
- AI-TS-01..AI-TS-04 (incluye heurísticas output).

### API
Supertest.

### Security
- 404 uniforme + rate limit.

### Accessibility
- Panel `role="complementary"` + axe.

### Performance
- `< 5s p95` provider call.

---

## 14. Observability & Audit

Logs `ai.quote_summary.requested`, `ai.quote_summary.generated`, `ai.quote_summary.output_malformed`, `ai.locale.applied`, `ai.locale.fallback`.

---

## 15. Seed / Demo
Reuso events demo con quotes en misma categoría para validar end-to-end.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint quote-summary | Documentar. | Actualizar. | No |
| `docs/7` (AI specs) | Documentar AI-006 prompt v1 + output schema | Documentar. | Actualizar. | No |
| PB-P2-001 Traceability | El backlog cita `FR-AI-019` (no aplica). | Trazabilidad real registrada. | Housekeeping. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Output AI malformado | Persist garbage | Zod validate + fallback |
| LLM ignora "no decidas" | Rompe HITL | Prompt explícito + UI no expone auto-preferred |
| Rate limit overhead | UX degradada | 5/min suficiente para uso normal |
| Quotes cambian post-generación | Summary obsoleto | Snapshot + banner UI |
| Currency mixta | Confusión | Validado en US-082 (event.currency_code inmutable) |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/ai/dto/quote-summary.body.ts` (nuevo)
- `src/modules/ai/use-cases/generate-quote-summary.use-case.ts` (nuevo)
- `src/modules/ai/prompts/quote-compare-summary.v1.ts` (nuevo)
- `src/modules/ai/schemas/quote-summary-output.schema.ts` (Zod output)
- `src/modules/ai/controllers/ai-quote-summary.controller.ts` (nuevo)
- `src/modules/ai/routes/ai-quote-summary.routes.ts` (nuevo)
- `src/modules/ai/middleware/ai-rate-limit.middleware.ts` (verificar existe o nuevo)

**Frontend**:
- `components/organizer/ai/AIComparisonSummary.tsx` (nuevo panel lateral)
- `components/organizer/quote/QuoteComparator.tsx` (extender con botón trigger)
- `hooks/useGenerateQuoteSummary.ts` (nuevo)
- `lib/api/aiApi.ts` (extender con `generateQuoteSummary`)
- `messages/{4 locales}.json` (`organizer.ai.quote_summary.*`)

### Orden sugerido
1. BE: DTO + Output schema + UT.
2. BE: Prompt template v1.
3. BE: UseCase + UT (todas las branches).
4. BE: Controller + ruta + rate limit middleware.
5. FE: API + MSW.
6. FE: AIComparisonSummary panel accesible.
7. FE: Integración con QuoteComparator (botón trigger).
8. i18n.
9. Tests IT + AI mocks + heurísticas locale.
10. Documentación AI-006 + housekeeping backlog.

### Decisiones que no deben reabrirse
D1–D9.

### Qué no implementar
- Auto-preferred.
- Cache.
- Negociación.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| BE | 6 (DTO, Output schema, Prompt, UseCase, Controller, Rate limit middleware) |
| FE | 4 (Panel, integración, API+MSW, i18n) |
| QA | 5 (UT, IT, AI mocks, AUTH, A11Y) |
| DOC | 1 |
| **Total** | 16 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| AI binding clear (US-084) | Pass |
| Security clear (rate limit) | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-022 entrega AI summary del comparador con HITL strict + locale binding (US-084 contract) + rate limit + snapshot audit + panel lateral accesible. PB-P2-001 continúa con US-059.
