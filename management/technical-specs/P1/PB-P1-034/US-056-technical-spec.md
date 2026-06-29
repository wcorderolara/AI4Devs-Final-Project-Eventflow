# Technical Specification — US-056: Cancel QR + QuoteEventNotificationService refactor

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-056                                                                                                         |
| Source User Story                    | `management/user-stories/US-056-cancel-active-quote-request.md`                                                |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-056-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-034                                                                                                      |
| Backlog Title                        | Cancelar QuoteRequest activa (con restricción)                                                                  |
| Backlog Execution Order              | 56                                                                                                              |
| User Story Position in Backlog Item  | 1 de 1                                                                                                          |
| Related User Stories in Backlog Item | US-056                                                                                                         |
| Epic                                 | EPIC-QR-001                                                                                                    |
| Backlog Item Dependencies            | US-049, US-054, PB-P0-001 (BookingIntent), PB-P1-036                                                            |
| Feature                              | Endpoint cancel + refactor del service común                                                                    |
| Module / Domain                      | Quotes / Notifications                                                                                         |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-28                                                                                                     |
| Last Updated                         | 2026-06-28                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-034 single-story. Execution order 56. Depende del módulo `modules/quotes` introducido en US-049..054.

---

## 3. Executive Technical Summary

US-056 entrega:

**Backend**:
- **Refactor**: `QuoteNotificationService` (US-054) → `QuoteEventNotificationService` con método genérico `emit({ recipientUserId, eventName, payload, tx })`. Los call-sites de US-053 (`quote.expired`) y US-054 (`quote.rejected`) se actualizan al nuevo API.
- `CancelQuoteRequestUseCase`: `prisma.$transaction` con `SELECT FOR UPDATE` de QR + Event + verificación ownership + check `confirmed_intent` (EXISTS) + UPDATE `cancelled` + invoca service común.
- Controller `OrganizerQuoteRequestController.cancel` con `POST /api/v1/organizer/quote-requests/:id/cancel`.
- Logger extension.

**Frontend**:
- `CancelQRDialog` accesible + `organizerApi.qr.cancel` + MSW + i18n.

**Database**:
- Verificar columnas `cancellation_reason`, `cancelled_at`, `cancelled_by` en `quote_requests`. Posible migración menor.
- Verificar índice `(quote_request_id)` o `(quote_id, status)` en `booking_intents` para EXISTS eficiente.

---

## 4. Scope Boundary

### In Scope
- Refactor del service común.
- DTO + use case + controller + ruta + logger.
- Frontend: dialog accesible + API client + i18n.
- Tests + regresión US-053/054.
- Documentación.

### Out of Scope
- Cambios sobre Quote asociada.
- Cancelación de BookingIntent.
- Cancelación masiva.
- Penalty.

### Explicit Non-Goals
- No introducir tablas nuevas.

---

## 5. Architecture Alignment

### Backend
Extensión de `modules/quotes` + refactor del service común.

### Frontend
Modal accesible reutilizable.

### Database
Reuso. Posible migración menor.

### API
REST JSON.

### AI / PromptOps
No aplica.

### Security
Organizer + ownership + 404 uniforme.

### Testing
Vitest + Supertest + RTL + axe + regresión.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 cancel exitoso         | UseCase transaccional + service + 2 Notifications.                                                | BE, DB            |
| AC-02 sin reason             | Service maneja null gracefully.                                                                    | BE                |
| AC-03 Quote intacta          | Sin UPDATE sobre Quote.                                                                            | BE                |
| EC-01 confirmed_intent       | EXISTS check ⇒ 409.                                                                                | BE                |
| EC-02 estado no cancelable   | UPDATE guard + 409.                                                                                | BE                |
| EC-03 ajena                  | Ownership + 404 uniforme.                                                                          | BE                |
| EC-04..05                    | Zod.                                                                                              | BE                |
| EC-06 idempotencia           | Guard `WHERE status IN (...)`.                                                                     | BE                |
| AUTH-TS-01..05              | Guards + uniformidad 404.                                                                          | BE                |
| A11Y                       | `CancelQRDialog` accesible.                                                                       | FE                |
| i18n                       | `organizer.qr.cancel.*`.                                                                          | FE                |

---

## 7. Backend Technical Design

### Service Refactor

```ts
// src/modules/quotes/services/quote-event-notification.service.ts
type QuoteEventName = 'quote.rejected' | 'quote.expired' | 'quote_request.cancelled';

class QuoteEventNotificationService {
  constructor(private port: NotificationSenderPort) {}

  async emit({ recipientUserId, eventName, payload, tx }: {
    recipientUserId: string;
    eventName: QuoteEventName;
    payload: Record<string, unknown>;
    tx: PrismaTx;
  }): Promise<void> {
    await this.port.notify({ channel: 'in_app', recipientUserId, event: eventName, deliveryStatus: 'delivered', payload, tx });
    await this.port.notify({ channel: 'email_simulated', recipientUserId, event: eventName, deliveryStatus: 'simulated', payload, tx });
    logger.info('quote.notification.emitted', { eventName, recipientUserId });
  }
}
```

Call-sites a refactorizar:
- `ExpireQuotesUseCase` (US-053): cambiar a `emit({ eventName: 'quote.expired', ... })`.
- `RejectQuoteUseCase` (US-054): cambiar a `emit({ eventName: 'quote.rejected', ... })`.

### Use Case

```ts
class CancelQuoteRequestUseCase {
  async execute({ currentUser, qrId, body }) {
    return prisma.$transaction(async (tx) => {
      const qr = await tx.quote_requests.findFirst({ where: { id: qrId } /* SELECT FOR UPDATE */ });
      if (!qr) throw new QrNotFoundError();

      const event = await tx.events.findUnique({
        where: { id: qr.event_id },
        select: { organizer_user_id: true },
      });

      if (event.organizer_user_id !== currentUser.id) throw new QrNotFoundError(); // uniforme

      const ACTIVE = ['sent','viewed','responded','preferred'];
      if (!ACTIVE.includes(qr.status)) throw new QrNotCancellableError(qr.status);

      const confirmedIntent = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT bi.id
        FROM booking_intents bi
        JOIN quotes q ON bi.quote_id = q.id
        WHERE q.quote_request_id = ${qrId} AND bi.status = 'confirmed_intent'
        LIMIT 1
      `;
      if (confirmedIntent.length > 0) {
        throw new QrHasConfirmedBookingError(confirmedIntent[0].id);
      }

      const vendor = await tx.vendor_profiles.findUnique({
        where: { id: qr.vendor_profile_id },
        select: { user_id: true },
      });

      const updated = await tx.quote_requests.update({
        where: { id: qrId },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          cancelled_by: currentUser.id,
          cancellation_reason: body.reason ?? null,
        },
      });

      await quoteEventNotificationService.emit({
        recipientUserId: vendor.user_id,
        eventName: 'quote_request.cancelled',
        payload: {
          quote_request_id: qrId,
          event_id: qr.event_id,
          cancellation_reason: body.reason ?? null,
        },
        tx,
      });

      logger.info('quote_request.cancelled', { qrId, organizerUserId: currentUser.id });

      return updated;
    });
  }
}
```

### Controllers / Routes

```ts
router.post(
  '/organizer/quote-requests/:id/cancel',
  organizerRoleGuard,
  vendorExclusionGuard,
  adminExclusionGuard,
  asyncHandler(controller.cancel.bind(controller))
);
```

### DTOs / Schemas

```ts
export const qrIdParam = z.object({ id: z.string().uuid() });

export const cancelQuoteRequestBody = z.object({
  reason: z.string().max(500).optional(),
}).strict();
```

### Validation Rules

Ver §VR US.

### Error Handling

Códigos: `400 INVALID_UUID`, `400 INVALID_CANCELLATION_REASON`, `401`, `403`, `404 QR_NOT_FOUND`, `409 QR_NOT_CANCELLABLE`, `409 QR_HAS_CONFIRMED_BOOKING`.

### Transactions

`prisma.$transaction` con `SELECT FOR UPDATE`.

### Observability

Logs `quote_request.cancelled`, `quote.notification.emitted`.

---

## 8. Frontend Technical Design

### Components

- `CancelQRDialog` (modal accesible: `role="dialog"`, focus trap, ESC, textarea opcional).

### State Management

TanStack mutation + invalidación.

### Data Fetching

`organizerApi.qr.cancel(id, { reason? })`.

### Loading / Empty / Error / Success States

- Loading: spinner CTA.
- Error: banner i18n por código.
- Success: toast + close + invalidación.

### Accessibility

`role="dialog"`, focus trap, ESC, foco inicial en "Volver".

### i18n

`organizer.qr.cancel.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint                                                  | Purpose                              | Auth Required | Request                                                       | Response       | Error Cases                                                                                                                                |
| ------ | --------------------------------------------------------- | ------------------------------------ | ------------- | ------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/v1/organizer/quote-requests/:id/cancel`            | Cancelar QR.                          | Sí (organizer) | Body opcional `{ reason?: string [0..500] }`.                | `200 QR`.       | `400 INVALID_UUID`, `400 INVALID_CANCELLATION_REASON`, `401`, `403`, `404 QR_NOT_FOUND`, `409 QR_NOT_CANCELLABLE`, `409 QR_HAS_CONFIRMED_BOOKING`. |

---

## 10. Database / Prisma Design

### Models Impacted

`QuoteRequest` (update), `Quote` (read), `BookingIntent` (read), `Notification` (write), `Event` (read), `VendorProfile` (read).

### Fields / Columns

Confirmar en DB-001:
- `quote_requests.cancellation_reason text NULL`.
- `quote_requests.cancelled_at timestamptz NULL`.
- `quote_requests.cancelled_by uuid NULL`.

Si faltan, migración menor.

### Indexes

Reuso de existentes + posible índice nuevo en `booking_intents (quote_id, status)` para EXISTS eficiente.

### Migrations Impact

Posible 1 migración menor.

### Seed Impact

- QR `viewed` propia del organizer demo para cancelar.
- QR con BookingIntent `confirmed_intent` para demo del bloqueo.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

Ver §SEC US.

---

## 13. Testing Strategy

### Unit Tests

- DTOs + UseCase branches.
- Service común: 3 eventos diferentes.

### Integration Tests

- TS-01..TS-06 + NT-01..NT-08.
- Restricción confirmed_intent.
- Idempotencia.
- Regresión US-053 (quote.expired) + US-054 (quote.rejected).

### API Tests

Supertest cubriendo códigos.

### E2E Tests

Opcional Playwright para `CancelQRDialog`.

### Security Tests

- `404 QR_NOT_FOUND` uniforme.

### Accessibility Tests

- Dialog accesible.

### AI Tests

No aplica.

### Performance

`< 500ms` por cancelación.

---

## 14. Observability & Audit

Logs `quote_request.cancelled`, `quote.notification.emitted`.

---

## 15. Seed / Demo Data Impact

QR `viewed` para cancelar + QR con `confirmed_intent` para demo del bloqueo.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar endpoint cancel.                                      | Documentar.                                    | Actualizar `docs/16`.                                       | No                     |
| PB-P1-034 Traceability       | El backlog item cita `FR-QUOTE-014` (preferred).                       | Trazabilidad real registrada en US.            | Housekeeping del backlog.                                  | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| Race entre 2 POST cancel simultáneos.                            | Doble notif.          | UPDATE con guard `WHERE status IN (...)` + SELECT FOR UPDATE. |
| Refactor del service introduce regresión.                        | US-053/054 fallan.    | Tests de regresión integral.                            |
| Verificación confirmed_intent es lenta sin índice.                | Latencia.             | DB-001 evalúa índice.                                   |
| Notification falla → QR queda cancelled sin notif.               | Inconsistencia.       | `prisma.$transaction` rollback completo.                 |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/quotes/dto/cancel-quote-request.body.ts`
- `src/modules/quotes/services/quote-event-notification.service.ts` (rename + generalize de US-054)
- `src/modules/quotes/use-cases/cancel-quote-request.use-case.ts` (nuevo)
- `src/modules/quotes/use-cases/expire-quotes.use-case.ts` (US-053) — update call-site
- `src/modules/quotes/use-cases/reject-quote.use-case.ts` (US-054) — update call-site
- `src/modules/quotes/controllers/organizer-quote-request.controller.ts` (extender)
- `src/modules/quotes/routes/organizer-quote-request.routes.ts` (extender)
- `src/shared/logging/quote-events.ts` (extender)

**Frontend**:
- `components/organizer/qr/CancelQRDialog.tsx`
- `lib/api/organizerApi.ts` (extender con `qr.cancel`)
- `messages/{es-LATAM,es-ES,pt,en}.json`

### Orden sugerido

1. DB-001.
2. Refactor service + UT.
3. Update call-sites de US-053/054.
4. DTO + UT.
5. UseCase + UT (incluye check confirmed_intent).
6. Controller + ruta.
7. Logger.
8. Frontend `organizerApi.qr.cancel` + MSW.
9. `CancelQRDialog`.
10. i18n.
11. Tests IT + regresión US-053/054 + AUTH + A11Y.
12. Documentación.

### Decisiones que no deben reabrirse

D1–D8.

### Qué no implementar

- Cancelación de Quote asociada.
- Cancelación de BookingIntent.
- Penalty.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 |
| BE    | 7 |
| FE    | 3 |
| QA    | 5 |
| DOC   | 1 |

**Total estimado ~17 tareas.**

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

US-056 introduce el endpoint cancel + refactor del service común a `QuoteEventNotificationService` con eventos múltiples. Tests de regresión integral garantizan que US-053/054 siguen funcionales. 2 acciones documentales no bloqueantes.
