# Technical Specification — US-052: Vendor responde Quote con desglose estructurado

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-052                                                                                                         |
| Source User Story                    | `management/user-stories/US-052-vendor-respond-quote.md`                                                       |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-052-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-031                                                                                                      |
| Backlog Title                        | Vendor visualiza y responde Quote (validez 15 días default)                                                    |
| Backlog Execution Order              | 52                                                                                                              |
| User Story Position in Backlog Item  | 2 de 3 (US-051 → US-052 → US-053)                                                                              |
| Related User Stories in Backlog Item | US-051, US-052, US-053                                                                                         |
| Epic                                 | EPIC-QR-001                                                                                                    |
| Backlog Item Dependencies            | US-051, PB-P0-001 (schema `quotes` + UNIQUE parcial), `NotificationSenderPort` (US-049)                       |
| Feature                              | Respuesta single-shot con Quote atómica + 2 Notifications                                                       |
| Module / Domain                      | Quotes                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

US-052 es posición 2 de 3 en PB-P1-031. Execution order 52. Depende de US-051 (acceso del vendor a su QR).

---

## 3. Executive Technical Summary

US-052 extiende `modules/quotes`:

**Backend**:
- `RespondQuoteRequestUseCase` con `prisma.$transaction`:
  1. `SELECT ... FOR UPDATE` sobre QR (verifica assignment + status + no vencida).
  2. Verifica que no existe Quote vigente (BR-QUOTE-013).
  3. Lee `event.currency_code` (BR-QUOTE-019).
  4. Aplica default `valid_until = today + 15d` si ausente (BR-QUOTE-015 / C-031).
  5. INSERT `quotes(status='sent', ...)`.
  6. UPDATE `quote_requests.status='responded'`.
  7. INSERT 2 `notifications` (in_app + email_simulated) al organizer.
- DTO Zod estricto con `.refine` para suma del breakdown.
- Controller `VendorQuoteController` con guards.
- Logger `quote.sent`.

**Frontend**:
- `QuoteResponseForm` con `BreakdownEditor` dinámico + cálculo cliente de suma.
- TanStack mutation + invalidación del detalle.
- i18n 4 locales.

Sin migraciones obligatorias (verificar UNIQUE parcial `uq_quotes_request_active`).

---

## 4. Scope Boundary

### In Scope
- 1 use case + DTO + controller + ruta + logger.
- Reuso `NotificationSenderPort` de US-049.
- Frontend page + form + BreakdownEditor + i18n.
- Tests.
- Documentación.

### Out of Scope
- Draft CRUD.
- Edición post-`sent`.
- Job de expiración (US-053).
- Vista comparativa del organizer (US futura).

### Explicit Non-Goals
- No introducir tablas nuevas.

---

## 5. Architecture Alignment

### Backend
Extensión `modules/quotes`. Hexagonal.

### Frontend
Next.js Client Component para el form.

### Database
Reuso. Verificar UNIQUE parcial.

### API
REST JSON.

### AI / PromptOps
No aplica.

### Security
Assignment-based + 404 uniforme.

### Testing
Vitest + Supertest + RTL + axe.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 envío exitoso         | UseCase transaccional completo.                                                                    | BE, DB            |
| AC-02 `valid_until` custom   | Service layer respeta body si está en rango.                                                       | BE                |
| AC-03 currency heredada      | Service layer override del cliente.                                                                | BE                |
| AC-04 breakdown sum          | Zod `.refine` + service recheck.                                                                   | BE                |
| EC-01..07                    | Validaciones server-side.                                                                          | BE                |
| AUTH-TS-01..05              | Guards + uniformidad 404.                                                                          | BE                |
| A11Y                       | Labels + `aria-describedby`.                                                                       | FE                |
| i18n                       | `vendor.qr.respond.*`.                                                                            | FE                |

---

## 7. Backend Technical Design

### Use Case

```ts
class RespondQuoteRequestUseCase {
  async execute({ currentUser, qrId, body }) {
    return prisma.$transaction(async (tx) => {
      const vendorProfile = await vendorProfileRepo.findActiveByUserId(currentUser.id, { tx });
      if (!vendorProfile || vendorProfile.status === 'hidden' || vendorProfile.deleted_at) {
        throw new QrNotFoundError();
      }

      const qr = await tx.quote_requests.findFirst({
        where: { id: qrId, vendor_profile_id: vendorProfile.id },
        // SELECT FOR UPDATE
      });
      if (!qr) throw new QrNotFoundError();

      const ACTIVE = ['sent', 'viewed'];
      if (!ACTIVE.includes(qr.status) || (qr.expires_at && qr.expires_at <= new Date())) {
        throw new QrNotRespondableError(qr.status, qr.expires_at);
      }

      const existing = await tx.quotes.findFirst({
        where: { quote_request_id: qrId, status: { notIn: ['expired', 'rejected'] } },
      });
      if (existing) throw new QuoteAlreadyExistsError(existing.id);

      const event = await tx.events.findUnique({ where: { id: qr.event_id }, select: { currency_code: true, organizer_user_id: true } });

      const todayPlus15 = addDays(new Date(), 15);
      const validUntil = body.valid_until ?? formatDate(todayPlus15);

      const quote = await tx.quotes.create({
        data: {
          quote_request_id: qrId,
          vendor_profile_id: vendorProfile.id,
          status: 'sent',
          total_price: body.total_price,
          currency_code: event.currency_code, // forced override
          breakdown: body.breakdown,
          conditions: body.conditions ?? null,
          valid_until: validUntil,
        },
      });

      await tx.quote_requests.update({
        where: { id: qrId },
        data: { status: 'responded' },
      });

      await notificationSenderPort.notify({ channel: 'in_app', recipientUserId: event.organizer_user_id, event: 'quote.sent', deliveryStatus: 'delivered', payload: { quote_id: quote.id, ... }, tx });
      await notificationSenderPort.notify({ channel: 'email_simulated', recipientUserId: event.organizer_user_id, event: 'quote.sent', deliveryStatus: 'simulated', payload: { quote_id: quote.id, ... }, tx });

      logger.info('quote.sent', { quoteId: quote.id, qrId, vendorProfileId: vendorProfile.id });

      return quote;
    });
  }
}
```

### Controllers / Routes

```ts
router.post(
  '/vendor/quote-requests/:id/respond',
  vendorRoleGuard,
  organizerExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.respond.bind(controller))
);
```

### DTOs / Schemas

```ts
export const respondQuoteRequestBody = z.object({
  total_price: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => parseFloat(v) > 0),
  breakdown: z.array(z.object({
    label: z.string().min(1).max(150),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => parseFloat(v) >= 0),
  })).min(1).max(20),
  conditions: z.string().max(2000).optional(),
  valid_until: z.string().date().optional(),
  // currency_code ignorado si está presente
}).strict().refine(
  (body) => {
    const sum = body.breakdown.reduce((acc, item) => acc + parseFloat(item.amount), 0);
    return Math.abs(sum - parseFloat(body.total_price)) <= 0.01;
  },
  { message: 'INVALID_BREAKDOWN_SUM' }
);
```

### Repository

Operaciones via `tx` directamente. Sin nuevos métodos (Prisma directo en el use case).

### Validation Rules

Ver §VR US.

### Error Handling

Códigos: `400 INVALID_TOTAL`, `400 INVALID_BREAKDOWN_SUM`, `400 INVALID_BREAKDOWN`, `400 INVALID_BREAKDOWN_ITEM`, `400 INVALID_VALID_UNTIL`, `401`, `403`, `404 QR_NOT_FOUND`, `409 QR_NOT_RESPONDABLE`, `409 QUOTE_ALREADY_EXISTS`.

### Transactions

`prisma.$transaction` con SELECT FOR UPDATE.

### Observability

Log `quote.sent` con `correlation_id`.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/vendor/quote-requests/[id]/respond/page.tsx` (Server Component prefetch del detalle de QR).

### Components

- `QuoteResponseForm` (Client).
- `BreakdownEditor` (Client, dinámico).
- `EventSummaryCard` (Server o Client).

### Forms

RHF + Zod espejo. Cálculo cliente de suma con indicador visual.

### State Management

TanStack Query mutation + invalidación de `['qr', id]`.

### Data Fetching

`vendorApi.qr.respond(id, payload)`.

### Loading / Empty / Error / Success States

- Loading: spinner CTA.
- Error: banner i18n.
- Success: toast + redirect.

### Accessibility

Labels semánticos + `aria-describedby`.

### i18n

`vendor.qr.respond.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint                                                | Purpose                              | Auth Required | Request                                                                | Response       | Error Cases                                                                                                                                                                                                                            |
| ------ | ------------------------------------------------------- | ------------------------------------ | ------------- | ---------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/vendor/quote-requests/:id/respond`             | Crear Quote + transicionar.           | Sí (vendor)   | Ver §7 US.                                                             | `201 Quote`.    | `400 INVALID_TOTAL/BREAKDOWN_SUM/BREAKDOWN/BREAKDOWN_ITEM/VALID_UNTIL`, `401`, `403`, `404 QR_NOT_FOUND`, `409 QR_NOT_RESPONDABLE/QUOTE_ALREADY_EXISTS`. |

---

## 10. Database / Prisma Design

### Models Impacted

`Quote` (write), `QuoteRequest` (update), `Notification` (write), `Event` (read), `VendorProfile` (read).

### Fields / Columns

Sin nuevos.

### Indexes

Reuso de existentes + `uq_quotes_request_active`.

### Migrations Impact

Posible migración menor si falta UNIQUE parcial.

### Seed Impact

Reuso de seed de US-051. Asegurar QR en estado `viewed` para demo.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

Ver §SEC US.

---

## 13. Testing Strategy

### Unit Tests
- DTO Zod (todos los refine).
- UseCase branches.

### Integration Tests
- TS-01..TS-06 + NT-01..NT-10.
- Atomicidad: simular fallo de Notification → rollback verifica que Quote no se persistió.
- UNIQUE parcial respetada (recheck).

### API Tests
Supertest cubriendo códigos.

### E2E Tests
Opcional Playwright.

### Security Tests
- `404 QR_NOT_FOUND` uniforme.
- Currency override (cliente envía falsa, server ignora).

### Accessibility Tests
- BreakdownEditor keyboard-accessible.

### AI Tests
No aplica.

### Performance
`< 1s p95`.

---

## 14. Observability & Audit

Log `quote.sent` con `correlation_id`.

---

## 15. Seed / Demo Data Impact

Verificar QR `viewed` en seed.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar endpoint.                                            | Documentar.                                    | Actualizar `docs/16`.                                       | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Race entre 2 POST respond simultáneos.                           | Doble Quote.          | `SELECT FOR UPDATE` sobre QR + UNIQUE parcial.           |
| Notification falla → Quote sin notificación.                     | Estado inconsistente. | Transacción rollback.                                    |
| Suma del breakdown drift por redondeo.                            | Errores falsos.       | Tolerancia ±0.01.                                       |
| Currency override desde cliente.                                  | Inconsistencia.       | Service layer ignora cliente.                            |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/quotes/dto/respond-quote-request.body.ts`
- `src/modules/quotes/use-cases/respond-quote-request.use-case.ts`
- `src/modules/quotes/controllers/vendor-quote-request.controller.ts` (extender)
- `src/modules/quotes/routes/vendor-quote-request.routes.ts` (extender)
- `src/shared/logging/quote-events.ts` (extender)

**Frontend**:
- `app/[locale]/vendor/quote-requests/[id]/respond/page.tsx`
- `components/vendor/qr/QuoteResponseForm.tsx`
- `components/vendor/qr/BreakdownEditor.tsx`
- `components/vendor/qr/EventSummaryCard.tsx`
- `lib/api/vendorApi.ts` (extender)
- `messages/{es-LATAM,es-ES,pt,en}.json`

### Orden sugerido

1. DB-001 (verificar UNIQUE parcial).
2. DTO + UT.
3. UseCase + UT.
4. Controller + ruta.
5. Logger.
6. Frontend `vendorApi.qr.respond` + MSW.
7. Page + Form + BreakdownEditor.
8. i18n.
9. Tests IT + AUTH + A11Y.
10. Documentación.

### Decisiones que no deben reabrirse

D1–D7.

### Qué no implementar

- Draft CRUD.
- Edición post-`sent`.
- Job de expiración.
- Vista comparativa del organizer.

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

US-052 introduce `RespondQuoteRequestUseCase` con transacción atómica + 2 Notifications. US-053 cerrará PB-P1-031 con el job de expiración + notificación al vendor.
