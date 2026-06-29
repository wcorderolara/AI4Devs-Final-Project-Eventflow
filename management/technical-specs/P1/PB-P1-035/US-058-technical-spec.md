# Technical Specification — US-058: Toggle Quote.is_preferred

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-058 |
| Source User Story | `management/user-stories/US-058-mark-quote-preferred.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-058-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-035 |
| Backlog Title | Comparador lado a lado + marca preferred |
| Backlog Execution Order | 58 |
| User Story Position in Backlog Item | 2 de 2 (US-057 → US-058) |
| Related User Stories in Backlog Item | US-057, US-058 |
| Epic | EPIC-CMP-001 |
| Backlog Item Dependencies | PB-P1-031, US-054 (service común), US-056 (refactor) |
| Feature | Toggle `Quote.is_preferred` con UNIQUE parcial + service común extendido |
| Module / Domain | Quotes / Booking |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-28 |
| Last Updated | 2026-06-28 |

---

## 2. Backlog Execution Context

US-058 cierra PB-P1-035. Execution order 58.

---

## 3. Executive Technical Summary

US-058 entrega:

**Backend**:
- `MarkQuotePreferredUseCase` con `prisma.$transaction`: SELECT FOR UPDATE Quote + Event + verificación ownership + clear preferred previa del mismo `(event, category)` si existe + UPDATE target + invoca `QuoteEventNotificationService.emit` para el vendor target (`quote.marked_preferred`) y vendor anterior si aplica (`quote.unmarked_preferred`).
- Refactor de `QuoteEventNotificationService` (US-056) para añadir 2 nuevos eventos al type.
- Controller `PATCH /api/v1/quotes/:id/preferred`.
- Migración menor: denormalizar `event_id` + `service_category_id` en `quotes` + UNIQUE parcial `(event_id, service_category_id) WHERE is_preferred=true`.

**Frontend**:
- `PreferredToggleButton` (Client Component con `aria-pressed`).
- TanStack mutation + invalidación.

---

## 4. Scope Boundary

### In Scope
- UseCase + DTO + controller + ruta + service refactor.
- Migración menor (denormalize + UNIQUE parcial).
- Frontend: toggle button + i18n.
- Tests + regresión service común.

### Out of Scope
- Multi-preferred.
- Auto-mark al aceptar Quote.

---

## 5. Architecture Alignment

Reuso del stack. Refactor del service común minimal (sólo agregar 2 eventos al type).

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 mark sin previa | UseCase + 2 notifs target | BE, DB |
| AC-02 cambio preferred | Transacción clear + set + 4 notifs | BE, DB |
| AC-03 unmark | UPDATE false + 2 notifs vendor | BE |
| AC-04 idempotencia | Guard valor actual = no-op | BE |
| EC-01..03 | Validaciones | BE |
| AUTH-TS-01..04 | Guards | BE |
| A11Y | `aria-pressed` | FE |
| i18n | `organizer.quote.preferred.*` | FE |

---

## 7. Backend Technical Design

### Use Case

```ts
class MarkQuotePreferredUseCase {
  async execute({ currentUser, quoteId, body }) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotes.findFirst({ where: { id: quoteId } /* SELECT FOR UPDATE */ });
      if (!quote) throw new QuoteNotFoundError();

      const qr = await tx.quote_requests.findUnique({
        where: { id: quote.quote_request_id },
        select: { event_id: true, service_category_id: true, vendor_profile_id: true },
      });
      const event = await tx.events.findUnique({
        where: { id: qr.event_id },
        select: { organizer_user_id: true },
      });
      if (event.organizer_user_id !== currentUser.id) throw new QuoteNotFoundError();

      // Validate state
      const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
      if (!['sent','responded'].includes(quote.status) || isExpired) {
        throw new QuoteNotPreferableError(quote.status);
      }

      // Idempotency
      if (quote.is_preferred === body.is_preferred) return quote;

      const vendor = await tx.vendor_profiles.findUnique({
        where: { id: qr.vendor_profile_id },
        select: { user_id: true },
      });

      let unmarkedVendorUserId: string | null = null;

      if (body.is_preferred === true) {
        // Clear previous preferred in same (event, category)
        const previous = await tx.quotes.findFirst({
          where: {
            quote_request: { event_id: qr.event_id, service_category_id: qr.service_category_id },
            is_preferred: true,
            NOT: { id: quoteId },
          },
          include: { vendor_profile: { select: { user_id: true } } },
        });
        if (previous) {
          await tx.quotes.update({ where: { id: previous.id }, data: { is_preferred: false } });
          unmarkedVendorUserId = previous.vendor_profile.user_id;
        }
      }

      const updated = await tx.quotes.update({
        where: { id: quoteId },
        data: { is_preferred: body.is_preferred },
      });

      const payload = { quote_id: quoteId, quote_request_id: quote.quote_request_id, event_id: qr.event_id };
      const eventName = body.is_preferred ? 'quote.marked_preferred' : 'quote.unmarked_preferred';
      await quoteEventNotificationService.emit({ recipientUserId: vendor.user_id, eventName, payload, tx });

      if (unmarkedVendorUserId) {
        await quoteEventNotificationService.emit({
          recipientUserId: unmarkedVendorUserId,
          eventName: 'quote.unmarked_preferred',
          payload,
          tx,
        });
      }

      logger.info('quote.preferred.toggled', {
        quoteId, organizerUserId: currentUser.id,
        previousValue: quote.is_preferred, newValue: body.is_preferred,
        unmarkedQuoteId: unmarkedVendorUserId ? 'yes' : 'no',
      });

      return updated;
    });
  }
}
```

### Service Refactor

Type `QuoteEventName` (US-056 D6) se extiende:
```ts
type QuoteEventName = 'quote.rejected' | 'quote.expired' | 'quote_request.cancelled' | 'quote.marked_preferred' | 'quote.unmarked_preferred';
```

### Routes

```ts
router.patch('/quotes/:id/preferred', organizerRoleGuard, vendorExclusionGuard, adminExclusionGuard, asyncHandler(controller.preferred.bind(controller)));
```

### DTOs

```ts
export const preferredBody = z.object({ is_preferred: z.boolean() }).strict();
```

### Error Handling
`400 INVALID_UUID`, `400 INVALID_BODY`, `401`, `403`, `404 QUOTE_NOT_FOUND`, `409 QUOTE_NOT_PREFERABLE`.

---

## 8. Frontend Technical Design

- `PreferredToggleButton` Client Component con `aria-pressed`, `useMutation` + invalidate de `['quote.compare', eventId, categoryCode]`.
- Star icon llena/vacía + tooltip i18n.

---

## 9. API Contract

| Method | Endpoint | Request | Response | Errors |
|---|---|---|---|---|
| PATCH | `/api/v1/quotes/:id/preferred` | `{ is_preferred: boolean }` | `200 Quote` | 400/401/403/404/409 |

---

## 10. Database / Prisma Design

### Migración menor

1. Añadir columnas denormalizadas en `quotes`:
   - `event_id uuid NOT NULL`
   - `service_category_id uuid NOT NULL`
2. Backfill desde `quote_requests`.
3. FKs (opcional) `event_id → events.id`, `service_category_id → service_categories.id`.
4. UNIQUE parcial: `CREATE UNIQUE INDEX uq_quotes_preferred_per_event_category ON quotes (event_id, service_category_id) WHERE is_preferred = true;`.
5. Trigger opcional: validar `event_id`/`service_category_id` consistente con `quote_requests` al insertar.

### Indexes

UNIQUE parcial nuevo.

### Seed Impact

Reuso.

---

## 11. AI / PromptOps Design
No aplica.

## 12. Security & Authorization Design
Ver §SEC US.

## 13. Testing Strategy

- UT del use case branches (mark, unmark, idempotencia, clear previa, expired/wrong state).
- IT del PATCH + atomicidad.
- IT regresión: US-053/054/056 siguen funcionando con service común extendido.
- Test UNIQUE parcial enforcement (intentar 2 preferred simultáneos).
- AUTH matrix.
- A11Y `aria-pressed`.

---

## 14. Observability

Log `quote.preferred.toggled` con valores previos y nuevos.

---

## 15. Seed / Demo
Reuso.

---

## 16. Documentation Alignment Required

| Doc | Acción | Bloquea |
|---|---|---|
| `docs/16 §M07` | Documentar PATCH preferred | No |
| Schema `quotes` | Denormalize columns | No (migración menor) |

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| Inconsistencia denormalize | Trigger DB o validación service layer |
| Service común breaking | Tests regresión integral |
| Race 2 PATCH simultáneos | UNIQUE parcial + SELECT FOR UPDATE |

---

## 18. Implementation Guidance

**Backend**:
- `src/modules/quotes/dto/preferred.body.ts`
- `src/modules/quotes/use-cases/mark-quote-preferred.use-case.ts`
- `src/modules/quotes/services/quote-event-notification.service.ts` (extender type)
- `src/modules/quotes/controllers/organizer-quote.controller.ts` (extender)
- `src/modules/quotes/routes/organizer-quote.routes.ts` (extender)
- `src/shared/logging/quote-events.ts` (extender)
- Migración Prisma: `add_denormalize_event_category_to_quotes` + UNIQUE parcial.

**Frontend**:
- `components/organizer/quote/PreferredToggleButton.tsx`
- `lib/api/quotesApi.ts` (extender)
- `messages/{4 locales}.json`

**Orden**: DB-001 + migración → DTO → service extension → UseCase → Controller → Logger → FE button + i18n → Tests + regresión → Doc.

### Decisiones que no deben reabrirse
D1–D7.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 2 (verify + migración) |
| BE | 5 |
| FE | 3 |
| QA | 5 |
| DOC | 1 |
| **Total** | 16 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Migration plan clear | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`. US-058 cierra PB-P1-035 + EPIC-CMP-001 con toggle preferred atómico. La migración menor denormalize habilita UNIQUE parcial nativo y refuerza el service común para todos los eventos del lifecycle Quote.
