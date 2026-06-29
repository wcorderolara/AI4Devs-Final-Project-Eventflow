# Technical Specification — US-057: Comparador de Quotes lado a lado

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-057                                                                                                         |
| Source User Story                    | `management/user-stories/US-057-compare-quotes-side-by-side.md`                                                |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-057-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-035                                                                                                      |
| Backlog Title                        | Comparador lado a lado + marca preferred                                                                        |
| Backlog Execution Order              | 57                                                                                                              |
| User Story Position in Backlog Item  | 1 de 2 (US-057 → US-058)                                                                                       |
| Related User Stories in Backlog Item | US-057, US-058                                                                                                 |
| Epic                                 | EPIC-CMP-001                                                                                                   |
| Backlog Item Dependencies            | PB-P1-031 (Quote creation), PB-P0-001                                                                          |
| Feature                              | `CompareQuotesUseCase` + UI responsive (tabla / cards)                                                          |
| Module / Domain                      | Quotes / Booking                                                                                               |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-28                                                                                                     |
| Last Updated                         | 2026-06-28                                                                                                     |

---

## 2. Backlog Execution Context

US-057 es posición 1 de 2 en PB-P1-035. Execution order 57.

---

## 3. Executive Technical Summary

US-057 entrega:

**Backend**:
- `CompareQuotesUseCase`: verifica ownership + categoría activa; query con joins (`quotes` + `vendor_profiles` + `service_categories`) filtrando por `event_id` + `service_category_id` con orden estable.
- Mapper a shape comparativo.
- Controller `OrganizerEventController.compareQuotes` con `GET /api/v1/events/:id/quotes/compare?categoryCode=<slug>`.

**Frontend**:
- `QuoteComparator` (Client Component orchestrator).
- `QuoteComparisonTable` (desktop) / `QuoteComparisonCards` (mobile responsive).
- Indicadores visuales para `expired`/`rejected`.
- CTAs deep-link a US-058 ("Marcar preferred") y US-022 ("Resumir con IA").
- TanStack Query.

Sin migraciones obligatorias.

---

## 4. Scope Boundary

### In Scope
- UseCase + DTO + controller + ruta + mapper.
- Frontend: page + componentes responsive + i18n.
- Tests.
- Documentación.

### Out of Scope
- Mark preferred (US-058).
- Resumen IA (US-022).
- Conversión FX.
- Filtros adicionales.

### Explicit Non-Goals
- No introducir nuevas tablas.

---

## 5. Architecture Alignment

### Backend
Extensión de `modules/quotes` o `modules/events`.

### Frontend
Next.js Client Component con responsive design.

### Database
Reuso.

### API
REST JSON, sólo lectura.

### AI / PromptOps
No aplica (deep-link a US-022).

### Security
Organizer + ownership + 404 uniforme.

### Testing
Vitest + Supertest + RTL + axe.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 ≥2 Quotes              | UseCase con joins + orden estable.                                                                | BE, DB            |
| AC-02 1 Quote                | Response idéntico con items.length=1.                                                              | BE                |
| AC-03 empty                  | items=[].                                                                                          | BE                |
| AC-04 AI deep-link           | Frontend navega; sin endpoint AI en US-057.                                                       | FE                |
| EC-01..04                    | Validaciones server-side.                                                                          | BE                |
| AUTH-TS-01..05              | Guards.                                                                                           | BE                |
| A11Y                       | Tabla semántica + indicadores.                                                                    | FE                |
| i18n                       | `organizer.quote.compare.*`.                                                                      | FE                |

---

## 7. Backend Technical Design

### Use Case

```ts
class CompareQuotesUseCase {
  async execute({ currentUser, eventId, query }) {
    const event = await eventsRepo.findOwnedById(eventId, currentUser.id);
    if (!event) throw new EventNotFoundError();

    const category = await serviceCategoryRepo.findActiveByCode(query.categoryCode);
    if (!category) throw new InvalidCategoryError();

    const items = await quoteRepository.findComparableByEventAndCategory({
      eventId, serviceCategoryId: category.id,
    });

    return {
      category: { code: category.code, name: category.name_i18n },
      currency_code: event.currency_code,
      items: items.map(mapToComparable),
    };
  }
}
```

### Repository

```ts
findComparableByEventAndCategory({ eventId, serviceCategoryId }): Promise<Array<QuoteWithVendor>>
// SELECT q.*, vp.business_name, vp.slug, vp.rating_avg, vp.reviews_count
// FROM quotes q
// JOIN quote_requests qr ON q.quote_request_id = qr.id
// JOIN vendor_profiles vp ON q.vendor_profile_id = vp.id
// WHERE qr.event_id = ? AND qr.service_category_id = ?
// AND q.status IN ('sent','responded','preferred','accepted','expired','rejected')
// ORDER BY q.is_preferred DESC,
//          CASE q.status WHEN 'sent' THEN 1 WHEN 'responded' THEN 2 ... END,
//          q.total_price ASC
```

### Controllers / Routes

```ts
router.get(
  '/events/:id/quotes/compare',
  organizerRoleGuard,
  vendorExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.compareQuotes.bind(controller))
);
```

### DTOs / Schemas

```ts
export const eventIdParam = z.object({ id: z.string().uuid() });

export const compareQuotesQuery = z.object({
  categoryCode: z.string().min(1).max(64),
}).strict();
```

### Validation Rules

Ver §VR US.

### Error Handling

Códigos: `400 INVALID_FILTERS`, `400 INVALID_CATEGORY`, `401`, `403`, `404 EVENT_NOT_FOUND`.

### Transactions

No requeridas.

### Observability

Sólo `correlation_id`.

---

## 8. Frontend Technical Design

### Components

- `QuoteComparator` (orchestrator).
- `QuoteComparisonTable` (desktop tabla).
- `QuoteComparisonCards` (mobile cards).
- `QuoteStatusIndicator` (badge con estado + tooltip).

### State Management

TanStack Query keyed por `[eventId, categoryCode]`.

### Data Fetching

`quotesApi.compare({ eventId, categoryCode })`.

### Loading / Empty / Error / Success States

- Loading: skeleton.
- Empty (0): mensaje + CTA.
- Single (1): vista detalle.
- Multi (≥2): tabla/cards.
- Error: banner.

### Accessibility

Tabla con `<th scope="col">`; cards con `aria-labelledby`; indicadores con `aria-label`.

### i18n

`organizer.quote.compare.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint                                                | Purpose                              | Auth Required | Request                                                       | Response                                                                                              | Error Cases                                                                                                                  |
| ------ | ------------------------------------------------------- | ------------------------------------ | ------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/events/:id/quotes/compare?categoryCode=<slug>` | Datos del comparador.                 | Sí (organizer) | Query: `categoryCode` (slug requerido).                       | `200 { category, currency_code, items: [...] }`.                                                     | `400 INVALID_FILTERS`, `400 INVALID_CATEGORY`, `401`, `403`, `404 EVENT_NOT_FOUND`.                                         |

---

## 10. Database / Prisma Design

### Models Impacted

`Quote` (read), `QuoteRequest` (read), `VendorProfile` (read), `ServiceCategory` (read), `Event` (read).

### Fields / Columns

Sin nuevos.

### Indexes

Reuso de `idx_quotes_quote_request_id` + indices existentes.

### Migrations Impact

Ninguna.

### Seed Impact

Evento con ≥2 Quotes en misma categoría + 1 expirada para demo.

---

## 11. AI / PromptOps Design

No aplica (deep-link a US-022).

---

## 12. Security & Authorization Design

Ver §SEC US.

---

## 13. Testing Strategy

### Unit Tests

- DTOs + mapper + use case branches.

### Integration Tests

- TS-01..TS-04 + NT-01..NT-04.
- Orden estable verificado.

### API Tests

Supertest.

### E2E Tests

Playwright responsive (table → cards).

### Security Tests

- `404 EVENT_NOT_FOUND` uniforme.

### Accessibility Tests

- axe + tabla semántica.

### AI Tests

No aplica.

### Performance

`< 1s p95`.

---

## 14. Observability & Audit

Sólo `correlation_id` + log estándar.

---

## 15. Seed / Demo Data Impact

Evento + ≥2 Quotes en misma categoría + 1 expirada.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar endpoint compare.                                     | Documentar.                                   | Actualizar `docs/16`.                                       | No                     |
| PB-P1-035 Traceability       | El backlog cita `FR-QUOTE-021` (inexistente).                          | Trazabilidad real registrada.                  | Housekeeping del backlog.                                  | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Query lenta con muchas Quotes.                                   | UX degradada.         | Índices reusables + LIMIT implícito (max 10 quotes per categoría per evento por FR-QUOTE-002). |
| Vendor data sensible expuesta.                                   | Privacy.              | Whitelist mapper (sólo campos públicos).                |
| UX en mobile.                                                    | Lectura difícil.      | Cards apiladas + scroll horizontal opcional.            |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/quotes/dto/compare-quotes.query.ts`
- `src/modules/quotes/use-cases/compare-quotes.use-case.ts`
- `src/modules/quotes/repositories/quote.repository.ts` (extender)
- `src/modules/quotes/mappers/comparable-quote.mapper.ts`
- `src/modules/quotes/controllers/organizer-event.controller.ts` (extender)
- `src/modules/quotes/routes/organizer-event.routes.ts` (extender)

**Frontend**:
- `app/[locale]/organizer/events/[id]/quotes/compare/page.tsx`
- `components/organizer/quote/QuoteComparator.tsx`
- `components/organizer/quote/QuoteComparisonTable.tsx`
- `components/organizer/quote/QuoteComparisonCards.tsx`
- `components/organizer/quote/QuoteStatusIndicator.tsx`
- `lib/api/quotesApi.ts` (extender con `compare`)
- `messages/{es-LATAM,es-ES,pt,en}.json`

### Orden sugerido

1. DTO + UT.
2. Repository extension + UT.
3. Mapper + UT.
4. UseCase + UT.
5. Controller + ruta.
6. Frontend `quotesApi.compare` + MSW.
7. Componentes responsive.
8. i18n.
9. Tests IT + AUTH + A11Y + performance.
10. Documentación.

### Decisiones que no deben reabrirse

D1–D5.

### Qué no implementar

- Mark preferred (US-058).
- Resumen IA (US-022).
- FX.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 |
| BE    | 5 |
| FE    | 4 |
| QA    | 5 |
| DOC   | 1 |

**Total estimado ~16 tareas.**

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                                | Pass   |
| Decision Resolution reviewed if present                      | Pass   |
| Scope clear                                                  | Pass   |
| Architecture alignment clear                                 | Pass   |
| API impact clear                                             | Pass   |
| DB impact clear                                              | Pass   |
| AI impact clear                                              | N/A    |
| Security impact clear                                        | Pass   |
| Testing strategy clear                                       | Pass   |
| Ready for Development Task Breakdown                         | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-057 introduce `CompareQuotesUseCase` + UI responsive sin nuevas tablas. US-058 cerrará PB-P1-035 con mark preferred.
