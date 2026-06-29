# Technical Specification — US-049: Enviar QuoteRequest con brief estructurado

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-049                                                                                                         |
| Source User Story                    | `management/user-stories/US-049-send-quote-request.md`                                                         |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-049-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-030                                                                                                      |
| Backlog Title                        | Crear QuoteRequest con brief estructurado (+ límite 5)                                                          |
| Backlog Execution Order              | 49                                                                                                              |
| User Story Position in Backlog Item  | 1 de 2 (US-049 → US-050)                                                                                       |
| Related User Stories in Backlog Item | US-049, US-050                                                                                                 |
| Epic                                 | EPIC-QR-001                                                                                                    |
| Backlog Item Dependencies            | PB-P1-006 (eventos), PB-P1-028 (directorio), PB-P0-001 (schema), PB-P0-007 (rate limit), `NotificationSenderPort` (docs/14) |
| Feature                              | Creación de QuoteRequest con brief + transacción atómica + 2 Notifications                                      |
| Module / Domain                      | Quotes                                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-030 contiene US-049 (creación + reglas BR-QUOTE-004) y US-050 (QA exhaustivo del límite BR-QUOTE-009). US-049 es posición 1 de 2. Execution order 49.

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-049     | Endpoint POST + brief + notificación.          | 1               |
| US-050     | QA del límite 5 por categoría.                 | 2               |

---

## 3. Executive Technical Summary

US-049 introduce el módulo `modules/quotes` con:

- `CreateQuoteRequestUseCase` con `prisma.$transaction`:
  1. `SELECT ... FOR UPDATE` sobre `events` (verifica ownership + `status='active'`).
  2. `SELECT ... FOR UPDATE` sobre `vendor_profiles` (verifica `approved` + `deleted_at IS NULL`).
  3. Verifica `service_categories.is_active=true`.
  4. Cuenta QRs activas par (event, vendor) (D2 estados) → si `>0` ⇒ `409 QR_ALREADY_ACTIVE`.
  5. Cuenta QRs activas (event, category) → si `>=5` ⇒ `409 QR_CATEGORY_LIMIT_REACHED`.
  6. INSERT `quote_requests` con `status='sent'`, snapshot del evento, `ai_generated_brief` según `source`.
  7. INSERT 2 rows en `notifications` via `NotificationSenderPort` (in_app + email_simulated).
- Controller `POST /api/v1/quote-requests` con `organizerRoleGuard` + rate limit `10/min` por user (PB-P0-007).
- Logger `quote_request.created` con `correlation_id`.

Frontend: page con `EventSnapshotCard` (read-only) + `QuoteRequestForm` (RHF + Zod). MSW handlers para todos los códigos.

Sin migraciones obligatorias (verificar UNIQUE parcial activa por (event, vendor) en DB-001; si falta, migración menor).

---

## 4. Scope Boundary

### In Scope
- 1 use case + DTO + repository + controller + ruta + logger.
- Reuso `NotificationSenderPort` + adapter Prisma.
- Frontend page + form + i18n.
- Tests.
- Documentación.

### Out of Scope
- QA exhaustivo del límite 5 por categoría → US-050.
- Cambios de estado posteriores a `sent`.
- Email real con SMTP.
- Chat real-time.
- Edición del brief tras envío.

### Explicit Non-Goals
- No introducir nuevas tablas.

---

## 5. Architecture Alignment

### Backend
Nuevo módulo `modules/quotes`. Hexagonal.

### Frontend
Next.js App Router + Client Component para el form.

### Database
Reuso de `quote_requests`, `notifications`, `events`, `vendor_profiles`, `service_categories`.

### API
REST JSON con error envelope estándar.

### AI / PromptOps
No aplica (consume opcionalmente output de US-021).

### Security
Ownership + rate limit + uniformidad de errores.

### Testing
Vitest + Supertest + RTL + axe + performance smoke.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 envío exitoso         | UseCase transaccional + 2 Notifications + log.                                                    | BE, DB            |
| AC-02 una activa por par    | Count con D2 estados; `409 QR_ALREADY_ACTIVE`.                                                    | BE                |
| AC-03 reactivación          | Count ignora `cancelled/expired/rejected`.                                                        | BE                |
| AC-04 AI flag                | DTO opcional `source`; mapper a `ai_generated_brief`.                                              | BE                |
| EC-01..06                    | Validaciones server-side.                                                                          | BE                |
| AUTH-TS-01..05              | Guards + middleware.                                                                              | BE                |
| A11Y                       | Form accesible.                                                                                    | FE                |
| i18n                       | `quotes.create.*` en 4 locales.                                                                    | FE                |

---

## 7. Backend Technical Design

### Use Case

```ts
class CreateQuoteRequestUseCase {
  async execute({ currentUser, body }) {
    return prisma.$transaction(async (tx) => {
      const event = await tx.events.findFirst({
        where: { id: body.event_id, organizer_user_id: currentUser.id },
        // SELECT FOR UPDATE via raw or extension
      });
      if (!event) throw new EventNotFoundError();
      if (event.status !== 'active') throw new EventNotActiveError();

      const vendor = await tx.vendor_profiles.findUnique({ where: { id: body.vendor_profile_id } });
      if (!vendor || vendor.status !== 'approved' || vendor.deleted_at) {
        throw new VendorNotAvailableError();
      }

      const category = await tx.service_categories.findUnique({ where: { id: body.service_category_id } });
      if (!category || !category.is_active) throw new InvalidCategoryError();

      const activeStatuses = ['sent', 'viewed', 'responded', 'preferred'];

      const existingPair = await tx.quote_requests.findFirst({
        where: { event_id: body.event_id, vendor_profile_id: body.vendor_profile_id, status: { in: activeStatuses } },
      });
      if (existingPair) throw new QrAlreadyActiveError(existingPair.id);

      const countCategory = await tx.quote_requests.count({
        where: { event_id: body.event_id, service_category_id: body.service_category_id, status: { in: activeStatuses } },
      });
      if (countCategory >= 5) throw new QrCategoryLimitReachedError(countCategory);

      const qr = await tx.quote_requests.create({
        data: {
          status: 'sent',
          sent_at: new Date(),
          event_id: body.event_id,
          vendor_profile_id: body.vendor_profile_id,
          service_category_id: body.service_category_id,
          ai_generated_brief: body.source === 'ai_generated',
          budget: body.brief.budget,
          currency_code: event.currency_code,
          message: body.brief.message,
          event_type_snapshot: event.event_type,
          event_date_snapshot: event.event_date,
          city_code_snapshot: event.city_code,
          guests_count_snapshot: event.guests_count,
        },
      });

      await notificationSenderPort.notify({
        channel: 'in_app',
        recipientUserId: vendor.user_id,
        event: 'quote_request.created',
        deliveryStatus: 'delivered',
        payload: { quote_request_id: qr.id, event_id: event.id },
        tx,
      });
      await notificationSenderPort.notify({
        channel: 'email_simulated',
        recipientUserId: vendor.user_id,
        event: 'quote_request.created',
        deliveryStatus: 'simulated',
        payload: { quote_request_id: qr.id, event_id: event.id },
        tx,
      });

      logger.info('quote_request.created', { qrId: qr.id, eventId: event.id, vendorProfileId: vendor.id, categoryId: category.id, aiGenerated: qr.ai_generated_brief });

      return qr;
    });
  }
}
```

### Controllers / Routes

```ts
router.post(
  '/quote-requests',
  organizerRoleGuard,
  vendorExclusionGuard,
  adminExclusionGuard,
  rateLimitMiddleware({ key: 'org:quote_request', limit: 10, windowSeconds: 60, by: 'user' }),
  asyncHandler(controller.create.bind(controller))
);
```

### DTOs / Schemas

```ts
export const createQuoteRequestBody = z.object({
  event_id: z.string().uuid(),
  vendor_profile_id: z.string().uuid(),
  service_category_id: z.string().uuid(),
  brief: z.object({
    budget: z.string().regex(/^\d+(\.\d{1,2})?$/),
    message: z.string().min(0).max(5000),
  }),
  source: z.enum(['manual', 'ai_generated']).default('manual'),
}).strict();
```

### Repository / Persistence

Repository ligero sobre Prisma directo dentro del use case (single context).

### Error Handling

Códigos: `400 INVALID_BRIEF`, `400 INVALID_CATEGORY`, `400 VENDOR_NOT_AVAILABLE`, `401`, `403`, `404 EVENT_NOT_FOUND`, `409 QR_ALREADY_ACTIVE` (+ `details.existing_quote_request_id`), `409 QR_CATEGORY_LIMIT_REACHED` (+ `details.active_count`), `409 EVENT_NOT_ACTIVE`, `429 TOO_MANY_REQUESTS`.

### Transactions

`prisma.$transaction` con SELECT FOR UPDATE en events y vendor_profiles.

### Observability

Log `quote_request.created` con `correlation_id`.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/organizer/events/[id]/quotes/new/page.tsx`.

### Components

- `EventSnapshotCard` (read-only).
- `QuoteRequestForm` (RHF + Zod).
- `VendorCardSummary` (mini-card del vendor target).

### Forms

RHF + Zod.

### State Management

TanStack mutation + invalidación.

### Data Fetching

`quotesApi.createRequest`.

### Loading / Empty / Error / Success States

- Loading: spinner CTA.
- Error: banner i18n por código.
- Success: toast + redirect.

### Accessibility

Labels semánticos + `aria-describedby` para errores.

### i18n

`quotes.create.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint                | Purpose         | Auth Required | Request                                                                  | Response                                                                                              | Error Cases                                                                                                                                                                                                                                                |
| ------ | ----------------------- | --------------- | ------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/v1/quote-requests`| Crear QR.        | Sí (organizer) | Ver §7 US.                                                               | `201 QuoteRequest`.                                                                                  | `400 INVALID_BRIEF/CATEGORY/VENDOR_NOT_AVAILABLE`, `401`, `403`, `404 EVENT_NOT_FOUND`, `409 QR_ALREADY_ACTIVE/QR_CATEGORY_LIMIT_REACHED/EVENT_NOT_ACTIVE`, `429`. |

---

## 10. Database / Prisma Design

### Models Impacted

`QuoteRequest` (write), `Notification` (write), `Event` (read), `VendorProfile` (read), `ServiceCategory` (read).

### Fields / Columns

Sin nuevos. Confirmar (DB-001): columnas snapshot (`event_type_snapshot`, `event_date_snapshot`, `city_code_snapshot`, `guests_count_snapshot`), `ai_generated_brief`, `budget`, `currency_code`, `message`.

### Relations

Reuso.

### Indexes

Reuso de existentes; verificar `idx_quote_requests_event_category_active`.

### Constraints

UNIQUE parcial activa por (event_id, vendor_profile_id) WHERE `status IN (sent,viewed,responded,preferred)`. Verificar; si falta, migración menor.

### Migrations Impact

Posible 1 migración menor.

### Seed Impact

Reuso del seed de eventos + vendors approved. Considerar añadir 1 escenario demo: organizer con evento active + vendor approved sin QR previa.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

Ver §SEC US.

---

## 13. Testing Strategy

### Unit Tests
- DTO Zod + UseCase branches (todas).
- Rollback en error de Notification.

### Integration Tests
- TS-01..TS-05 + NT-01..NT-08.
- Verificación de Notifications creadas.

### API Tests
Supertest cubriendo todos los códigos.

### E2E Tests
Opcional Playwright.

### Security Tests
- Uniformidad de `404 EVENT_NOT_FOUND` (organizer ajeno vs inexistente).
- Uniformidad de `400 VENDOR_NOT_AVAILABLE`.

### Accessibility Tests
- Form labels + errores accesibles.

### AI Tests
No aplica.

### Seed / Demo Tests
Verificación.

### CI Checks
Lint + Vitest + Supertest.

### Performance
`< 1s p95` con seed (NFR-PERF-001).

---

## 14. Observability & Audit

Log `quote_request.created`. Sin `AdminAction`.

---

## 15. Seed / Demo Data Impact

Verificar reuso + escenario demo.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar endpoint.                                            | Documentar.                                    | Actualizar `docs/16`.                                       | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Race entre count y INSERT (5ª simultánea).                       | Tope rebasado.        | `SELECT FOR UPDATE` sobre event row + recheck.           |
| Notification falla → QR creada sin notif.                        | Estado inconsistente. | `prisma.$transaction` rollback completo.                 |
| Información ajena vía 404 vs 403.                                | Information leak.     | `404 EVENT_NOT_FOUND` uniforme.                          |
| Brief con XSS payload.                                           | XSS al vendor.        | Frontend escapa al renderizar (Next.js auto-escape).    |
| `currency_code` cambia entre brief client y commit.              | Inconsistencia.       | Backend lo lee del evento, no del body.                  |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/quotes/dto/create-quote-request.body.ts`
- `src/modules/quotes/use-cases/create-quote-request.use-case.ts`
- `src/modules/quotes/controllers/quote-request.controller.ts`
- `src/modules/quotes/routes/quote-request.routes.ts`
- `src/modules/quotes/ports/notification-sender.port.ts` (si no existe global)
- `src/modules/quotes/adapters/notification-sender.adapter.ts`
- `src/shared/logging/quote-events.ts`

**Frontend**:
- `app/[locale]/organizer/events/[id]/quotes/new/page.tsx`
- `components/quotes/EventSnapshotCard.tsx`
- `components/quotes/QuoteRequestForm.tsx`
- `components/quotes/VendorCardSummary.tsx`
- `lib/api/quotesApi.ts`
- `messages/{es-LATAM,es-ES,pt,en}.json`

### Orden sugerido

1. DB-001.
2. DTO + UT.
3. NotificationSenderPort (port + adapter Prisma).
4. UseCase + UT branches.
5. Controller + ruta + rate limit.
6. Logger.
7. Frontend `quotesApi` + MSW.
8. Page + form + snapshot card.
9. i18n.
10. Tests IT + AUTH + A11Y + performance smoke.
11. Documentación.

### Decisiones que no deben reabrirse

D1–D9.

### Qué no implementar

- QA exhaustivo del límite 5 → US-050.
- Cambios de estado posteriores.
- Email SMTP real.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 |
| BE    | 8 |
| FE    | 4 |
| QA    | 5 |
| DOC   | 1 |

**Total estimado ~19 tareas.**

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

US-049 introduce el módulo `modules/quotes` con `CreateQuoteRequestUseCase` transaccional + 2 Notifications. US-050 cierra el backlog item con QA dedicado del límite 5 por categoría. 1 acción documental no bloqueante.
