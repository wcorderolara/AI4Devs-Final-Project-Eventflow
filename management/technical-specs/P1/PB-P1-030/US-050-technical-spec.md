# Technical Specification — US-050: Enforcement + UX del límite de 5 QR activas por categoría

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-050                                                                                                         |
| Source User Story                    | `management/user-stories/US-050-quote-request-category-limit.md`                                               |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-050-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-030                                                                                                      |
| Backlog Title                        | Crear QuoteRequest con brief estructurado (+ límite 5)                                                          |
| Backlog Execution Order              | 50                                                                                                              |
| User Story Position in Backlog Item  | 2 de 2 (US-049 → US-050)                                                                                       |
| Related User Stories in Backlog Item | US-049, US-050                                                                                                 |
| Epic                                 | EPIC-QR-001                                                                                                    |
| Backlog Item Dependencies            | US-049 (UseCase POST + enforcement core), PB-P0-001, PB-P0-007                                                  |
| Feature                              | Endpoint `active-count` + UI `QRLimitBadge` + QA exhaustivo del límite                                          |
| Module / Domain                      | Quotes                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-030 cierre. US-050 es posición 2 de 2. Execution order 50. Depende del módulo `modules/quotes` introducido en US-049.

---

## 3. Executive Technical Summary

US-050 añade al módulo `modules/quotes`:

**Backend**:
- `GetActiveQrCountUseCase` con validación ownership + categoría activa + conteo lazy (`status IN active` AND `(expires_at IS NULL OR expires_at > NOW())`).
- Handler `GET /api/v1/quote-requests/active-count` en `QuoteRequestController` con guards.
- Log `quote_request.limit_reached` cuando POST de US-049 retorna `409 QR_CATEGORY_LIMIT_REACHED`.
- Verificación/creación de índice parcial `(event_id, service_category_id) WHERE status IN ('sent','viewed','responded','preferred')`.

**Frontend**:
- `QRLimitBadge` integrado en `QuoteRequestForm` de US-049.
- `quotesApi.activeCount(...)` con `useQuery` keyed por `[eventId, categoryId]`.
- Disable del CTA cuando `available_slots=0`.
- Invalidación tras mutation exitosa.

**QA**:
- TS exhaustivos del límite incluyendo concurrencia (2 simultáneos), expiración lazy y UI deshabilitado.

Sin migraciones obligatorias (verificar índice parcial; si falta, migración menor).

---

## 4. Scope Boundary

### In Scope
- Endpoint count + use case + handler.
- Logger extension.
- Frontend badge accesible + disable CTA.
- Tests exhaustivos.
- Documentación.

### Out of Scope
- Cambio de implementación del POST (heredado de US-049).
- Job background de expiración (Future).
- Configurabilidad del límite.

### Explicit Non-Goals
- No introducir tablas nuevas.

---

## 5. Architecture Alignment

### Backend
Extensión del módulo `modules/quotes`. Use case sin transacción (solo SELECT con CTE opcional).

### Frontend
Next.js + TanStack Query.

### Database
Reuso. Posible índice parcial nuevo.

### API
REST JSON. Cache-Control corto (`max-age=10`) opcional para reducir round-trips si el badge se monta varias veces.

### AI / PromptOps
No aplica.

### Security
Ownership heredado de US-049. Sin información sensible expuesta.

### Testing
Vitest + Supertest + RTL + axe + concurrencia smoke.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 5ª OK                  | UseCase US-049 cuenta 4 → 5 ⇒ 201.                                                                | BE                |
| AC-02 6ª 409                 | UseCase US-049 cuenta 5 ⇒ 409.                                                                    | BE                |
| AC-03 endpoint count          | Nuevo handler + use case con conteo lazy.                                                          | BE                |
| AC-04 badge visible           | Componente `QRLimitBadge` con `useQuery`.                                                          | FE                |
| AC-05 concurrencia            | `SELECT FOR UPDATE` heredado de US-049 D9.                                                         | BE, QA            |
| EC-01 expiración lazy        | Filtro `expires_at` en repository.                                                                | BE                |
| EC-02 evento ajeno            | Ownership check.                                                                                  | BE                |
| EC-03 categoría inválida      | Validation.                                                                                       | BE                |
| AUTH-TS-01..06              | Reuso guards + matriz.                                                                            | BE                |
| A11Y                       | `aria-live` + `aria-describedby`.                                                                  | FE                |
| i18n                       | `quotes.limit.*`.                                                                                  | FE                |

---

## 7. Backend Technical Design

### Use Cases / Application Services

**`GetActiveQrCountUseCase`**

```ts
async execute({ currentUser, query }) {
  const event = await eventsRepository.findOwnedById(query.eventId, currentUser.id);
  if (!event) throw new EventNotFoundError();

  const category = await serviceCategoryRepository.findActiveById(query.serviceCategoryId);
  if (!category) throw new InvalidCategoryError();

  const ACTIVE_STATUSES = ['sent','viewed','responded','preferred'];
  const activeCount = await quoteRequestsRepository.countActiveByEventAndCategory({
    eventId: query.eventId,
    serviceCategoryId: query.serviceCategoryId,
    activeStatuses: ACTIVE_STATUSES,
    notExpired: true, // expires_at IS NULL OR expires_at > NOW()
  });

  return {
    active_count: activeCount,
    limit: 5,
    available_slots: Math.max(0, 5 - activeCount),
    statuses_counted: ACTIVE_STATUSES,
  };
}
```

### Controllers / Routes

```ts
router.get(
  '/quote-requests/active-count',
  organizerRoleGuard,
  vendorExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.activeCount.bind(controller))
);
```

### DTOs / Schemas

```ts
export const activeQrCountQuery = z.object({
  event_id: z.string().uuid(),
  service_category_id: z.string().uuid(),
}).strict();
```

### Repository / Persistence

Extensión de `QuoteRequestsRepository`:

```ts
countActiveByEventAndCategory({ eventId, serviceCategoryId, activeStatuses, notExpired }): Promise<number>
// SELECT COUNT(*) FROM quote_requests
// WHERE event_id = ? AND service_category_id = ? AND status IN (?)
// AND (expires_at IS NULL OR expires_at > NOW())
```

### Error Handling

Códigos: `400 INVALID_CATEGORY`, `401`, `403`, `404 EVENT_NOT_FOUND`.

### Transactions

No requeridas (sólo SELECT).

### Observability

Log `quote_request.limit_reached` en US-049 cuando el POST retorna 409. Sin log custom en el endpoint count (suficiente con log de request estándar).

---

## 8. Frontend Technical Design

### Components

- `QRLimitBadge` (Client Component) integrado en `QuoteRequestForm`.

```tsx
function QRLimitBadge({ eventId, categoryId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['quote-requests', 'active-count', eventId, categoryId],
    queryFn: () => quotesApi.activeCount({ eventId, categoryId }),
    enabled: Boolean(eventId && categoryId),
  });
  if (isLoading) return <Skeleton />;
  return (
    <div aria-live="polite">
      <p>{t('quotes.limit.label', { count: data.active_count, limit: data.limit })}</p>
      {data.available_slots === 0 && (
        <p id="qr-limit-reason" role="alert">{t('quotes.limit.reached')}</p>
      )}
    </div>
  );
}
```

CTA del form:

```tsx
<Button disabled={available_slots === 0} aria-describedby={available_slots === 0 ? 'qr-limit-reason' : undefined}>
  {t('quotes.create.submit')}
</Button>
```

### State Management

TanStack `useQuery`. Invalidate tras mutation exitosa de US-049: `queryClient.invalidateQueries(['quote-requests','active-count', eventId, categoryId])`.

### Data Fetching

`quotesApi.activeCount({ eventId, categoryId })`.

### Loading / Empty / Error / Success States

- Loading: skeleton del badge.
- Error: hidden badge + fallback al backend re-validar.
- Success: badge visible.

### Accessibility

`aria-live="polite"` en badge; `aria-describedby` en CTA cuando bloqueado.

### i18n

`quotes.limit.*` en 4 locales (`label`, `reached`).

---

## 9. API Contract Design

| Method | Endpoint                                            | Purpose                                  | Auth Required | Request                                                       | Response                                          | Error Cases                                                    |
| ------ | --------------------------------------------------- | ---------------------------------------- | ------------- | ------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| GET    | `/api/v1/quote-requests/active-count`              | Pre-check del frontend.                  | Sí (organizer) | Query `event_id`, `service_category_id` (UUIDs).             | `200 { active_count, limit, available_slots, statuses_counted }`. | `400 INVALID_CATEGORY`, `401`, `403`, `404 EVENT_NOT_FOUND`. |

---

## 10. Database / Prisma Design

### Models Impacted

`QuoteRequest` (read), `Event` (read), `ServiceCategory` (read).

### Fields / Columns

Sin nuevos.

### Indexes

Verificar (DB-001):
- Existente: `idx_quote_requests_event_category_active`.
- Considerar nuevo: `idx_quote_requests_event_category_active_status (event_id, service_category_id) WHERE status IN ('sent','viewed','responded','preferred')`.

### Constraints

Sin nuevos.

### Migrations Impact

Posible 1 migración menor para el índice parcial.

### Seed Impact

Escenario demo: evento con 4 QRs activas en categoría X para demostrar 5º y 6º.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

Ver §SEC US.

---

## 13. Testing Strategy

### Unit Tests
- DTO Zod del query.
- UseCase branches (event_not_found, invalid_category, count happy).

### Integration Tests
- TS-01..TS-06 + NT-01..NT-04.
- Concurrencia (2 POST simultáneos con 4 previos): uno 201, otro 409.
- Expiración lazy: QR con `expires_at < NOW()` no cuenta.

### API Tests
Supertest cubriendo todos los códigos del endpoint count.

### E2E Tests
Playwright para badge actualizado tras envío + CTA deshabilitado en 5/5.

### Security Tests
- Ownership: `404 EVENT_NOT_FOUND` uniforme.

### Accessibility Tests
- `aria-live`, `aria-describedby`.

### AI Tests
No aplica.

### Seed / Demo Tests
Verificación.

### CI Checks
Lint + Vitest + Supertest.

### Performance
Verificar que conteo `< 100ms` con seed.

---

## 14. Observability & Audit

### Logs

- `quote_request.limit_reached` (warn) — emitido desde US-049 cuando POST retorna 409.

---

## 15. Seed / Demo Data Impact

Escenario demo del límite (evento + 4 QRs activas en categoría).

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar `GET /api/v1/quote-requests/active-count`.            | Documentar.                                    | Actualizar `docs/16`.                                       | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Conteo lento sin índice parcial.                                 | Latencia UI.          | DB-001 evalúa; migración menor si necesario.            |
| Race entre count y POST (count stale).                           | Submit fallido.       | Defense in depth: backend re-valida; UI maneja 409.    |
| Cache de TanStack muestra count desactualizado.                  | Confusión UI.         | Invalidate tras mutation exitosa.                       |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/quotes/dto/active-qr-count.query.ts`
- `src/modules/quotes/use-cases/get-active-qr-count.use-case.ts`
- `src/modules/quotes/repositories/quote-request.repository.ts` (extender)
- `src/modules/quotes/controllers/quote-request.controller.ts` (extender)
- `src/modules/quotes/routes/quote-request.routes.ts` (extender)
- `src/shared/logging/quote-events.ts` (extender con `quote_request.limit_reached`)

**Frontend**:
- `components/quotes/QRLimitBadge.tsx`
- `components/quotes/QuoteRequestForm.tsx` (integrar badge + disable CTA)
- `lib/api/quotesApi.ts` (extender con `activeCount`)
- `messages/{es-LATAM,es-ES,pt,en}.json` (extender)

### Orden sugerido

1. DB-001.
2. DTO + UT.
3. Repository extension.
4. UseCase + UT.
5. Controller + ruta.
6. Logger extension.
7. Frontend `activeCount` + MSW.
8. `QRLimitBadge` + integración en form.
9. i18n.
10. Tests integración + concurrencia + A11Y.
11. Documentación.

### Decisiones que no deben reabrirse

D1–D6.

### Qué no implementar

- Cambios al POST (heredado de US-049).
- Job background de expiración.
- Configurabilidad del límite.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 |
| BE    | 5 |
| FE    | 3 |
| QA    | 4 |
| DOC   | 1 |

**Total estimado ~14 tareas.**

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

US-050 cierra PB-P1-030 con endpoint `active-count` + UX preventiva + QA exhaustivo (incluyendo concurrencia + expiración lazy). Reuso del UseCase POST de US-049. Sin migraciones obligatorias.
